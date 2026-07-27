import { v4 as uuid } from 'uuid'
import { getDb } from '../db/database.js'

// ─── Internal State ───────────────────────────────────────────────────────────

/** @type {Map<string, NodeJS.Timeout>} deviceId -> poll timer */
const pollTimers = new Map()

/** @type {Map<string, object>} deviceId -> last known WLED state */
const stateCache = new Map()

/** @type {Set<Function>} Subscribers notified on any state change */
const subscribers = new Set()

// ─── Public API ───────────────────────────────────────────────────────────────

export function subscribe(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

function notify(deviceId, state) {
  for (const fn of subscribers) {
    try { fn(deviceId, state) } catch {}
  }
}

export function getCachedState(deviceId) {
  return stateCache.get(deviceId) ?? null
}

export function getAllCachedStates() {
  return Object.fromEntries(stateCache)
}

// ─── Device CRUD ──────────────────────────────────────────────────────────────

export function listDevices() {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM devices ORDER BY sort_order ASC, created_at ASC
  `).all()
}

export function getDevice(id) {
  return getDb().prepare('SELECT * FROM devices WHERE id = ?').get(id) ?? null
}

export function createDevice({ name, ip_address, mac_address, firmware_ver, led_count }) {
  const db = getDb()
  const id = uuid()
  const maxOrder = db.prepare('SELECT MAX(sort_order) AS m FROM devices').get()?.m ?? -1
  db.prepare(`
    INSERT INTO devices (id, name, ip_address, mac_address, firmware_ver, led_count, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, ip_address, mac_address ?? null, firmware_ver ?? null, led_count ?? null, maxOrder + 1)

  const device = getDevice(id)
  startPolling(device)
  return device
}

export function updateDevice(id, fields) {
  const db = getDb()
  const allowed = ['name', 'ip_address', 'sort_order']
  const sets = Object.keys(fields)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = ?`)
  if (!sets.length) return getDevice(id)

  sets.push('updated_at = datetime(\'now\')')
  db.prepare(`UPDATE devices SET ${sets.join(', ')} WHERE id = ?`)
    .run(...Object.keys(fields).filter(k => allowed.includes(k)).map(k => fields[k]), id)
  return getDevice(id)
}

export function deleteDevice(id) {
  stopPolling(id)
  stateCache.delete(id)
  getDb().prepare('DELETE FROM devices WHERE id = ?').run(id)
}

export function reorderDevices(orderedIds) {
  const db = getDb()
  const stmt = db.prepare('UPDATE devices SET sort_order = ? WHERE id = ?')
  db.transaction(() => {
    orderedIds.forEach((id, idx) => stmt.run(idx, id))
  })()
}

// ─── WLED Proxy ───────────────────────────────────────────────────────────────

export async function fetchDeviceState(device) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const [stateRes, infoRes] = await Promise.all([
      fetch(`http://${device.ip_address}/json/state`, { signal: controller.signal }),
      fetch(`http://${device.ip_address}/json/info`, { signal: controller.signal }),
    ])
    clearTimeout(timeout)
    const state = await stateRes.json()
    const info = await infoRes.json()
    return { state, info, ok: true }
  } catch (err) {
    clearTimeout(timeout)
    return { ok: false, error: err.message }
  }
}

export async function sendDeviceCommand(device, payload) {
  // 1. Immediately update backend stateCache and notify WebSocket subscribers
  const cached = stateCache.get(device.id) || { on: true, bri: 255 }
  const merged = { ...cached, ...payload, _ts: Date.now() }
  stateCache.set(device.id, merged)
  notify(device.id, merged)

  // 2. Also forward command over direct WLED WebSocket if connected
  try {
    sendWledWebSocketCommand(device.id, payload)
  } catch {}

  // 3. Forward HTTP JSON command to WLED device
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)
  try {
    const res = await fetch(`http://${device.ip_address}/json/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json()
      const updated = { ...merged, ...data, _ts: Date.now() }
      stateCache.set(device.id, updated)
      notify(device.id, updated)
      return { ok: true, data: updated }
    }
  } catch (err) {
    clearTimeout(timeout)
  }

  // Always return updated state object so UI remains fluid and responsive
  return { ok: true, data: merged }
}

import { connectWledWebSocket, sendWledWebSocketCommand, disconnectWledWebSocket } from './wledWsService.js'

// ─── Polling & Live Streaming Engine ──────────────────────────────────────────

export function startPolling(device) {
  if (pollTimers.has(device.id)) return

  const db = getDb()
  let enriched = false  // only write info fields back once per session

  // Connect direct WebSocket stream if available
  connectWledWebSocket(device, (deviceId, newState) => {
    const cached = stateCache.get(deviceId) || {}
    const combined = { ...cached, ...newState, _ts: Date.now() }
    stateCache.set(deviceId, combined)
    notify(deviceId, combined)
  })

  async function poll() {
    const result = await fetchDeviceState(device)
    if (result.ok) {
      const combined = { ...result.state, info: result.info, _ts: Date.now() }
      stateCache.set(device.id, combined)

      // On first successful contact, backfill info fields from the device itself
      if (!enriched) {
        enriched = true
        const info = result.info ?? {}
        db.prepare(`
          UPDATE devices SET
            is_online    = 1,
            last_seen_at = datetime('now'),
            mac_address  = COALESCE(NULLIF(mac_address, ''), ?),
            firmware_ver = COALESCE(NULLIF(firmware_ver, ''), ?),
            led_count    = COALESCE(led_count, ?),
            updated_at   = datetime('now')
          WHERE id = ?
        `).run(
          info.mac  ?? null,
          info.ver  ?? null,
          info.leds?.count ?? null,
          device.id,
        )
      } else {
        db.prepare(`UPDATE devices SET is_online = 1, last_seen_at = datetime('now') WHERE id = ?`)
          .run(device.id)
      }

      notify(device.id, combined)
    } else {
      // Increment miss counter in state cache
      const cached = stateCache.get(device.id) ?? {}
      const misses = (cached._misses ?? 0) + 1
      stateCache.set(device.id, { ...cached, _misses: misses, _ts: Date.now() })
      if (misses >= 3) {
        db.prepare(`UPDATE devices SET is_online = 0 WHERE id = ?`).run(device.id)
        notify(device.id, { ...stateCache.get(device.id), _offline: true })
      }
    }
  }

  const getSetting = (key) =>
    db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value

  const interval = parseInt(getSetting('poll_interval_ms') ?? '5000', 10)

  poll()
  const timer = setInterval(poll, interval)
  pollTimers.set(device.id, timer)
}

export function stopPolling(deviceId) {
  const timer = pollTimers.get(deviceId)
  if (timer) {
    clearInterval(timer)
    pollTimers.delete(deviceId)
  }
}

export function startAllPolling() {
  const devices = listDevices()
  for (const device of devices) {
    startPolling(device)
  }
  console.log(`[poller] Started polling ${devices.length} device(s)`)
}
