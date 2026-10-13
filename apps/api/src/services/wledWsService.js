import WebSocket from 'ws'

// deviceId -> { ws, timer, attempts, device, onStateUpdate }
const deviceEntries = new Map()

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000

/**
 * Connects or maintains a direct WebSocket connection to a WLED controller.
 * WLED 0.14+ exposes a WebSocket endpoint at ws://<ip>/ws
 */
export function connectWledWebSocket(device, onStateUpdate) {
  if (!device || !device.ip_address) return

  let entry = deviceEntries.get(device.id)
  if (entry?.ws && entry.ws.readyState === WebSocket.OPEN) {
    return
  }
  if (entry?.timer) {
    clearTimeout(entry.timer)
    entry.timer = null
  }
  if (entry?.ws) {
    try { entry.ws.close() } catch {}
    entry.ws = null
  }
  if (!entry) {
    entry = { ws: null, timer: null, attempts: 0, device, onStateUpdate }
    deviceEntries.set(device.id, entry)
  } else {
    entry.device = device
    entry.onStateUpdate = onStateUpdate
  }
  openSocket(device.id, entry)
}

function openSocket(deviceId, entry) {
  const wsUrl = `ws://${entry.device.ip_address}/ws`
  let ws
  try {
    ws = new WebSocket(wsUrl, { handshakeTimeout: 3000 })
  } catch {
    scheduleReconnect(deviceId, entry)
    return
  }
  entry.ws = ws

  ws.on('open', () => {
    entry.attempts = 0
    console.log(`[wled-ws] Connected directly to WLED device "${entry.device.name}" (${entry.device.ip_address})`)
  })

  ws.on('message', (data) => {
    try {
      const payload = JSON.parse(data.toString())
      if (payload.state && entry.onStateUpdate) {
        entry.onStateUpdate(deviceId, payload.state)
      }
    } catch {}
  })

  ws.on('error', () => {
    // Quiet fail fallback to HTTP polling
  })

  ws.on('close', () => {
    if (entry.ws === ws) entry.ws = null
    scheduleReconnect(deviceId, entry)
  })
}

function scheduleReconnect(deviceId, entry) {
  if (!deviceEntries.has(deviceId)) return // intentionally disconnected
  if (entry.timer) return
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** entry.attempts, RECONNECT_MAX_MS)
  entry.attempts += 1
  entry.timer = setTimeout(() => {
    entry.timer = null
    if (!deviceEntries.has(deviceId)) return
    openSocket(deviceId, entry)
  }, delay)
  if (entry.timer.unref) entry.timer.unref()
}

/**
 * Send real-time state command over active WebSocket if available.
 */
export function sendWledWebSocketCommand(deviceId, statePayload) {
  const ws = deviceEntries.get(deviceId)?.ws
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(statePayload))
      return true
    } catch {}
  }
  return false
}

/**
 * Disconnect a device WebSocket connection and stop reconnecting.
 */
export function disconnectWledWebSocket(deviceId) {
  const entry = deviceEntries.get(deviceId)
  if (!entry) return
  deviceEntries.delete(deviceId)
  if (entry.timer) clearTimeout(entry.timer)
  if (entry.ws) {
    try { entry.ws.close() } catch {}
  }
}

/** Diagnostic snapshot for tests and status endpoints. */
export function getWledWsStatus(deviceId) {
  const entry = deviceEntries.get(deviceId)
  if (!entry) return { connected: false, pendingReconnect: false, attempts: 0 }
  return {
    connected: !!entry.ws && entry.ws.readyState === WebSocket.OPEN,
    pendingReconnect: !!entry.timer,
    attempts: entry.attempts,
  }
}
