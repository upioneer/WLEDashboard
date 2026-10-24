import { getStrip, saveLastPlay, validatePattern, listStrips } from './stripService.js'
import { getDevice, fetchDeviceState, sendDeviceCommand } from './deviceService.js'
import { sendDdpRgbFrame } from './ddpService.js'
import { renderStripFrame } from './stripPatterns.js'

// Built-in effect approximating each streamed pattern. Written as the member
// current state before streaming, so a dead dashboard yields living strips:
// WLED reverts to current state on DDP timeout.
const PATTERN_FALLBACK_FX = {
  solid: 'Solid',
  chase: 'Chase',
  wipe: 'Wipe',
  rainbow: 'Rainbow',
  gradient: 'Gradient',
  theater: 'Theater',
}

const TICK_MS = 33
const PING_MS = 5000

const players = new Map()

function toRestorePayload(state) {
  if (!state || typeof state !== 'object') return null
  const cmd = {}
  if (state.on !== undefined) cmd.on = state.on
  if (state.bri !== undefined) cmd.bri = state.bri
  if (Array.isArray(state.seg)) cmd.seg = state.seg.map((s) => ({ ...s }))
  return Object.keys(cmd).length > 0 ? cmd : null
}

async function pingMember(ip) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000)
  try {
    const res = await fetch(`http://${ip}/json/info`, { signal: controller.signal })
    clearTimeout(timeout)
    return res.ok
  } catch {
    clearTimeout(timeout)
    return false
  }
}

async function captureSnapshots(members) {
  const snaps = {}
  await Promise.all(members.map(async (m) => {
    const device = getDevice(m.device_id)
    if (!device) return
    try {
      const result = await fetchDeviceState(device)
      if (result.ok) snaps[m.device_id] = toRestorePayload(result.state)
    } catch {}
  }))
  return snaps
}

async function writeFallback(strip, pattern, params) {
  const fxName = strip.fallback?.fxName || PATTERN_FALLBACK_FX[pattern] || 'Solid'
  const col = Array.isArray(params?.color1) ? [params.color1] : [[255, 255, 255]]
  await Promise.all(strip.members.map(async (m) => {
    const device = getDevice(m.device_id)
    if (!device) return
    try {
      await sendDeviceCommand(device, { on: true, seg: [{ fx: 0, fxName, col }] })
    } catch {}
  }))
}

function sliceFor(frame, start, length) {
  return frame.slice(start, start + length)
}

export async function playStrip(id, { pattern, params = {} } = {}, { tickMs = TICK_MS, pingMs = PING_MS } = {}) {
  validatePattern(pattern)
  const strip = getStrip(id)
  if (!strip) throw new Error('Strip not found')
  const existing = players.get(id)
  if (existing) {
    existing.pattern = pattern
    existing.params = params
    saveLastPlay(id, { pattern, params })
    await writeFallback(strip, pattern, params)
    return getStripStatus(id)
  }
  const snapshots = await captureSnapshots(strip.members)
  await writeFallback(strip, pattern, params)
  saveLastPlay(id, { pattern, params })

  const startedAt = Date.now()
  const health = new Map(strip.members.map((m) => [m.device_id, { ok: true, lastError: null }]))
  let frames = 0
  let fps = 0
  let fpsWindowStart = Date.now()

  const tick = () => {
    const elapsed = Date.now() - startedAt
    const frame = renderStripFrame(pattern, strip.total_leds, params, elapsed)
    let start = 0
    for (const m of strip.members) {
      const h = health.get(m.device_id)
      const device = getDevice(m.device_id)
      if (h?.ok && device) {
        try {
          const slice = sliceFor(frame, start, m.length)
          if (m.reverse) slice.reverse()
          sendDdpRgbFrame(device.ip_address, slice, { ledOffset: m.offset })
        } catch (err) {
          h.ok = false
          h.lastError = err.message
        }
      }
      start += m.length
    }
    frames += 1
    const now = Date.now()
    if (now - fpsWindowStart >= 1000) {
      fps = Math.round((frames * 1000) / (now - fpsWindowStart))
      frames = 0
      fpsWindowStart = now
    }
  }

  const timer = setInterval(tick, tickMs)
  const pinger = setInterval(() => {
    for (const m of strip.members) {
      const device = getDevice(m.device_id)
      if (!device) continue
      pingMember(device.ip_address).then((ok) => {
        const h = health.get(m.device_id)
        if (h) {
          h.ok = ok
          h.lastError = ok ? null : 'Unreachable'
        }
      })
    }
  }, pingMs)
  timer.unref?.()
  pinger.unref?.()
  tick()

  players.set(id, { timer, pinger, pattern, params, health, getFps: () => fps, snapshots })
  return getStripStatus(id)
}

export async function stopStrip(id, { restore = true } = {}) {
  const player = players.get(id)
  if (!player) return { playing: false }
  clearInterval(player.timer)
  clearInterval(player.pinger)
  players.delete(id)
  if (restore) {
    const strip = getStrip(id)
    await Promise.all((strip?.members ?? []).map(async (m) => {
      const snap = player.snapshots[m.device_id]
      const device = getDevice(m.device_id)
      if (!snap || !device) return
      try {
        await sendDeviceCommand(device, snap)
      } catch {}
    }))
  }
  return { playing: false }
}

export function getStripStatus(id) {
  const player = players.get(id)
  const strip = getStrip(id)
  if (!strip) return null
  return {
    id,
    playing: !!player,
    pattern: player?.pattern ?? strip.last_play?.pattern ?? null,
    params: player?.params ?? strip.last_play?.params ?? {},
    fps: player ? player.getFps() : 0,
    members: strip.members.map((m) => ({
      device_id: m.device_id,
      ok: player ? player.health.get(m.device_id)?.ok ?? false : null,
      lastError: player ? player.health.get(m.device_id)?.lastError ?? null : null,
    })),
  }
}

export function isStripPlaying(id) {
  return players.has(id)
}

export async function resumeAutoPlay() {
  const strips = listStrips().filter((s) => s.auto_resume && s.last_play?.pattern)
  for (const s of strips) {
    try {
      await playStrip(s.id, s.last_play)
    } catch {}
  }
  return strips.map((s) => s.id)
}
