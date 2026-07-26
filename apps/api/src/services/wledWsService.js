import WebSocket from 'ws'

const deviceSockets = new Map() // deviceId -> WebSocket instance

/**
 * Connects or maintains a direct WebSocket connection to a WLED controller.
 * WLED 0.14+ exposes a WebSocket endpoint at ws://<ip>/ws
 */
export function connectWledWebSocket(device, onStateUpdate) {
  if (!device || !device.ip_address) return

  // If already connected and open, return existing
  const existing = deviceSockets.get(device.id)
  if (existing && existing.readyState === WebSocket.OPEN) {
    return
  }

  // Close stale connection if any
  if (existing) {
    try { existing.close() } catch {}
    deviceSockets.delete(device.id)
  }

  const wsUrl = `ws://${device.ip_address}/ws`
  try {
    const ws = new WebSocket(wsUrl, { handshakeTimeout: 3000 })

    ws.on('open', () => {
      console.log(`[wled-ws] Connected directly to WLED device "${device.name}" (${device.ip_address})`)
    })

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString())
        if (payload.state && onStateUpdate) {
          onStateUpdate(device.id, payload.state)
        }
      } catch {}
    })

    ws.on('error', () => {
      // Quiet fail fallback to HTTP polling
    })

    ws.on('close', () => {
      deviceSockets.delete(device.id)
    })

    deviceSockets.set(device.id, ws)
  } catch (err) {
    // Fail silently to keep HTTP polling active
  }
}

/**
 * Send real-time state command over active WebSocket if available.
 */
export function sendWledWebSocketCommand(deviceId, statePayload) {
  const ws = deviceSockets.get(deviceId)
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(statePayload))
      return true
    } catch {}
  }
  return false
}

/**
 * Disconnect a device WebSocket connection.
 */
export function disconnectWledWebSocket(deviceId) {
  const ws = deviceSockets.get(deviceId)
  if (ws) {
    try { ws.close() } catch {}
    deviceSockets.delete(deviceId)
  }
}
