import { v4 as uuid } from 'uuid'
import { getDb } from '../db/database.js'
import { logEvent } from './loggerService.js'
import {
  isDemoMode,
  getDemoDevices,
  getDemoDevice,
  getDemoCachedState,
  getAllDemoCachedStates,
  applyDemoDeviceCommand,
  updateDemoDevice,
} from './demoData.js'

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
  if (isDemoMode() || deviceId?.startsWith('demo-')) {
    return getDemoCachedState(deviceId)
  }
  return stateCache.get(deviceId) ?? null
}

export function getAllCachedStates() {
  if (isDemoMode()) {
    return getAllDemoCachedStates()
  }
  return Object.fromEntries(stateCache)
}

// ─── Device CRUD ──────────────────────────────────────────────────────────────

export function listDevices() {
  if (isDemoMode()) {
    return getDemoDevices()
  }
  const db = getDb()
  return db.prepare(`
    SELECT * FROM devices ORDER BY sort_order ASC, created_at ASC
  `).all()
}

export function getDevice(id) {
  if (isDemoMode() || id?.startsWith('demo-')) {
    return getDemoDevice(id)
  }
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
  if (isDemoMode() || id.startsWith('demo-')) {
    return updateDemoDevice(id, fields)
  }

  const db = getDb()
  const allowed = ['name', 'ip_address', 'sort_order', 'led_density', 'led_count', 'firmware_ver', 'spotify_sync_enabled', 'weather_sync_enabled']
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

// Per-device command chain: ESP HTTP servers handle one connection at a time,
// so commands serialize. At most one command waits behind the active one:
// a newer arrival supersedes the waiter, whose caller shares the newer
// result. The device always converges on the latest intent instead of
// grinding through abandoned backlog.
const commandChains = new Map()
const COMMAND_SETTLE_MS = 75

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function enqueueCommand(deviceId, fn) {
  let chain = commandChains.get(deviceId)
  if (!chain) {
    chain = { busy: false, waiting: null }
    commandChains.set(deviceId, chain)
  }
  return new Promise((resolve, reject) => {
    const entry = { fn, followers: [{ resolve, reject }] }
    if (chain.waiting) {
      entry.followers.unshift(...chain.waiting.followers)
    }
    chain.waiting = entry
    pumpChain(chain)
  })
}

function pumpChain(chain) {
  if (chain.busy || !chain.waiting) return
  chain.busy = true
  const entry = chain.waiting
  chain.waiting = null
  Promise.resolve()
    .then(entry.fn)
    .then(
      (value) => { entry.followers.forEach((f) => f.resolve(value)) },
      (err) => { entry.followers.forEach((f) => f.reject(err)) },
    )
    .finally(() => {
      chain.busy = false
      pumpChain(chain)
    })
}

export async function refreshDeviceState(device) {
  const deviceId = typeof device === 'string' ? device : device?.id
  if (isDemoMode() || deviceId?.startsWith('demo-')) {
    return { ok: true, data: getDemoCachedState(deviceId) }
  }
  const target = typeof device === 'string' ? getDevice(device) : device
  if (!target) return { ok: false, error: 'Device not found' }
  const result = await fetchDeviceState(target)
  if (!result.ok) return { ok: false, error: result.error ?? 'Device unreachable' }
  const combined = { ...result.state, info: result.info, _ts: Date.now() }
  stateCache.set(target.id, combined)
  notify(target.id, combined)
  return { ok: true, data: combined }
}

// Pull the friendly name (/json/info -> name) from each target controller and
// persist it. Empty/omitted ids means all devices. Unknown ids and demo
// devices are reported per entry, never thrown.
export async function syncDeviceNames(ids) {
  const filter = Array.isArray(ids) && ids.length > 0 ? new Set(ids) : null
  const targets = filter ? [...filter].map(getDevice).filter(Boolean) : listDevices()
  const unknown = filter ? [...filter].filter((id) => !getDevice(id)) : []
  const results = await Promise.all(targets.map(async (device) => {
    if (isDemoMode() || device.id.startsWith('demo-')) {
      return { id: device.id, name: device.name, ok: true, changed: false, demo: true }
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      const res = await fetch(`http://${device.ip_address}/json/info`, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) return { id: device.id, name: device.name, ok: false, error: `HTTP ${res.status}` }
      const info = await res.json()
      const name = typeof info?.name === 'string' ? info.name.trim() : ''
      if (!name) return { id: device.id, name: device.name, ok: false, error: 'Device reported an empty name' }
      const changed = name !== device.name
      if (changed) updateDevice(device.id, { name })
      return { id: device.id, name, ok: true, changed }
    } catch (err) {
      clearTimeout(timeout)
      const error = err?.name === 'AbortError' ? 'Request timed out' : err.message
      return { id: device.id, name: device.name, ok: false, error }
    }
  }))
  for (const id of unknown) {
    results.push({ id, name: null, ok: false, error: 'Unknown device' })
  }
  return {
    updated: results.filter((r) => r.ok && r.changed).length,
    unchanged: results.filter((r) => r.ok && !r.changed).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  }
}

// Pull the configured LED count (/json/info -> leds.count, falling back to the
// highest /json/state segment stop) from each target controller and persist it.
// Empty/omitted ids means all devices. Unknown ids and demo devices are
// reported per entry, never thrown. Mirrors syncDeviceNames.
export async function syncDeviceLedCounts(ids) {
  const filter = Array.isArray(ids) && ids.length > 0 ? new Set(ids) : null
  const targets = filter ? [...filter].map(getDevice).filter(Boolean) : listDevices()
  const unknown = filter ? [...filter].filter((id) => !getDevice(id)) : []
  const results = await Promise.all(targets.map(async (device) => {
    if (isDemoMode() || device.id.startsWith('demo-')) {
      return { id: device.id, name: device.name, led_count: device.led_count ?? null, ok: true, changed: false, demo: true }
    }
    const fail = (error) => ({ id: device.id, name: device.name, led_count: device.led_count ?? null, ok: false, error })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      const res = await fetch(`http://${device.ip_address}/json/info`, { signal: controller.signal })
      if (!res.ok) {
        clearTimeout(timeout)
        return fail(`HTTP ${res.status}`)
      }
      const info = await res.json()
      let count = toPositiveInt(info?.leds?.count)
      if (count == null) {
        const stateRes = await fetch(`http://${device.ip_address}/json/state`, { signal: controller.signal })
        clearTimeout(timeout)
        if (!stateRes.ok) return fail(`HTTP ${stateRes.status}`)
        const state = await stateRes.json()
        const stops = Array.isArray(state?.seg) ? state.seg.map((s) => toPositiveInt(s?.stop)).filter((n) => n != null) : []
        count = stops.length > 0 ? Math.max(...stops) : null
      } else {
        clearTimeout(timeout)
      }
      if (count == null) return fail('Device reported no LED count')
      const changed = count !== device.led_count
      if (changed) updateDevice(device.id, { led_count: count })
      return { id: device.id, name: device.name, led_count: count, ok: true, changed }
    } catch (err) {
      clearTimeout(timeout)
      const error = err?.name === 'AbortError' ? 'Request timed out' : err.message
      return fail(error)
    }
  }))
  for (const id of unknown) {
    results.push({ id, name: null, led_count: null, ok: false, error: 'Unknown device' })
  }
  return {
    updated: results.filter((r) => r.ok && r.changed).length,
    unchanged: results.filter((r) => r.ok && !r.changed).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  }
}

function toPositiveInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function sendDeviceCommand(device, payload) {
  const deviceId = typeof device === 'string' ? device : device?.id
  if (isDemoMode() || deviceId?.startsWith('demo-')) {
    const updated = applyDemoDeviceCommand(deviceId, payload)
    notify(deviceId, updated)
    return { ok: true, data: updated }
  }

  const resolved = await resolvePayloadFxNames(device, payload)
  return enqueueCommand(deviceId, () => deliverCommand(device, deviceId, resolved))
}

// ─── Effect name resolution ──────────────────────────────────────────────
// Static effect ids drift across firmware (Candle is 41 on old builds, 88 on
// 0.16.x), so senders attach the stable name as seg.fxName and the backend
// resolves it against the target's live /json/eff list. Bare numeric fx
// values are explicit user intent (MQTT, manual entry) and pass through.

/** @type {Map<string, string[]>} deviceId -> live effect names */
const effectsCache = new Map()

// Old catalog names that WLED renamed in later firmware.
const EFFECT_ALIASES = {
  'Dual Scan': 'Scan Dual',
  'Mega Strobe': 'Strobe Mega',
  'Chase Flash Random': 'Chase Flash Rnd',
  'Dual Scanner': 'Scanner Dual',
  'Flicker': 'Fire Flicker',
}

const warnedUnresolved = new Set()

export async function getDeviceEffects(device, { refresh = false } = {}) {
  const deviceId = typeof device === 'string' ? device : device?.id
  if (!refresh && effectsCache.has(deviceId)) return effectsCache.get(deviceId)
  const target = typeof device === 'string' ? getDevice(device) : device
  if (!target) return effectsCache.get(deviceId) ?? null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(`http://${target.ip_address}/json/eff`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return effectsCache.get(deviceId) ?? null
    const list = await res.json()
    if (!Array.isArray(list) || !list.every((e) => typeof e === 'string')) {
      return effectsCache.get(deviceId) ?? null
    }
    effectsCache.set(deviceId, list)
    return list
  } catch {
    clearTimeout(timeout)
    return effectsCache.get(deviceId) ?? null
  }
}

function resolveFxIndex(name, effects) {
  let idx = effects.indexOf(name)
  if (idx < 0 && EFFECT_ALIASES[name]) idx = effects.indexOf(EFFECT_ALIASES[name])
  return idx
}

export async function resolvePayloadFxNames(device, payload) {
  const segs = payload?.seg
  if (!Array.isArray(segs) || !segs.some((s) => s && typeof s.fxName === 'string')) return payload
  const deviceId = typeof device === 'string' ? device : device?.id
  let effects = await getDeviceEffects(device)
  if (effects && segs.some((s) => s && typeof s.fxName === 'string' && resolveFxIndex(s.fxName, effects) < 0)) {
    // A firmware upgrade may have reshuffled the list: one refresh, then commit.
    effects = await getDeviceEffects(device, { refresh: true })
  }
  const out = { ...payload, seg: segs.map((s) => ({ ...s })) }
  for (const s of out.seg) {
    if (!s || typeof s.fxName !== 'string') continue
    const name = s.fxName
    delete s.fxName
    if (!effects) continue // Unreachable: the numeric fallback rides through.
    const idx = resolveFxIndex(name, effects)
    if (idx >= 0) {
      s.fx = idx
    } else {
      const key = `${deviceId}:${name}`
      if (!warnedUnresolved.has(key)) {
        warnedUnresolved.add(key)
        logEvent('warn', 'effects', `Effect "${name}" not found on device; numeric fx fallback sent`, { deviceId, name })
      }
    }
  }
  return out
}

async function deliverCommand(device, deviceId, payload) {
  // Fast path: an open WLED WebSocket already delivers in real time,
  // so skip the redundant HTTP POST and halve ESP load.
  let wsSent = false
  try {
    wsSent = sendWledWebSocketCommand(device.id, payload)
  } catch {}
  if (wsSent) {
    const cached = stateCache.get(deviceId) || { on: true, bri: 255 }
    const merged = { ...cached, ...payload, _ts: Date.now() }
    stateCache.set(deviceId, merged)
    notify(deviceId, merged)
    await sleep(COMMAND_SETTLE_MS)
    return { ok: true, data: merged }
  }

  // HTTP JSON command to WLED device
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
      const cached = stateCache.get(deviceId) || { on: true, bri: 255 }
      const updated = { ...cached, ...data, _ts: Date.now() }
      stateCache.set(device.id, updated)
      notify(device.id, updated)
      await sleep(COMMAND_SETTLE_MS)
      return { ok: true, data: updated }
    }
  } catch (err) {
    clearTimeout(timeout)
  }

  // Honest failure: callers (UI rollback, MCP errors) depend on ok:false.
  await sleep(COMMAND_SETTLE_MS)
  return { ok: false, error: 'WLED device did not acknowledge the command' }
}

import { connectWledWebSocket, sendWledWebSocketCommand, disconnectWledWebSocket } from './wledWsService.js'

// ─── Polling & Live Streaming Engine ──────────────────────────────────────────

export function startPolling(device) {
  if (!device || device.id?.startsWith('demo-') || pollTimers.has(device.id)) return

  const db = getDb()
  let enriched = false  // tracks initial enrichment sync
  let lastKnownVer = device.firmware_ver ?? null
  let lastKnownLedCount = device.led_count ?? null
  let lastKnownMac = device.mac_address ?? null

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

      const info = result.info ?? {}
      const newMac = info.mac ? String(info.mac) : null
      const newVer = info.ver != null ? String(info.ver) : null
      const newLedCount = info.leds?.count != null ? Number(info.leds.count) : null

      const needsInfoUpdate = !enriched ||
        (newVer && newVer !== lastKnownVer) ||
        (newLedCount != null && newLedCount !== lastKnownLedCount) ||
        (newMac && newMac !== lastKnownMac)

      if (needsInfoUpdate) {
        enriched = true
        if (newVer) lastKnownVer = newVer
        if (newLedCount != null) lastKnownLedCount = newLedCount
        if (newMac) lastKnownMac = newMac

        db.prepare(`
          UPDATE devices SET
            is_online    = 1,
            last_seen_at = datetime('now'),
            mac_address  = COALESCE(NULLIF(?, ''), mac_address),
            firmware_ver = COALESCE(NULLIF(?, ''), firmware_ver),
            led_count    = COALESCE(?, led_count),
            updated_at   = datetime('now')
          WHERE id = ?
        `).run(
          newMac,
          newVer,
          newLedCount,
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
      if (misses === 3) {
        db.prepare(`UPDATE devices SET is_online = 0 WHERE id = ?`).run(device.id)
        notify(device.id, { ...stateCache.get(device.id), _offline: true })
        logEvent('warn', 'poller', `Device "${device.name}" (${device.ip_address}) missed 3 polls and is marked offline`)
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

export function clearStateCache() {
  stateCache.clear()
  effectsCache.clear()
  logEvent('info', 'system', 'Device state cache cleared')
}

export function restartAllPolling() {
  for (const timer of pollTimers.values()) {
    clearInterval(timer)
  }
  pollTimers.clear()
  stateCache.clear()
  startAllPolling()
  logEvent('info', 'poller', 'Poller restarted for all devices')
}

export function getPollerStats() {
  const db = getDb()
  const devices = listDevices()
  const onlineCount = devices.filter(d => d.is_online === 1).length
  const offlineCount = devices.filter(d => d.is_online === 0).length
  const pollInterval = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'poll_interval_ms'").get()?.value ?? '5000', 10)
  return {
    monitored_count: devices.length,
    online_count: onlineCount,
    offline_count: offlineCount,
    active_timers: pollTimers.size,
    cache_size: stateCache.size,
    interval_ms: pollInterval,
  }
}
