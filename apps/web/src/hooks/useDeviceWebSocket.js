import { useEffect, useRef } from 'react'
import { useDeviceStore } from '../stores/deviceStore.js'
import { useUIStore } from '../stores/uiStore.js'

const WS_URL = `ws://${window.location.hostname}:3001/ws`

/**
 * Maintains a persistent WebSocket connection to the API.
 * Receives live state_update messages and patches the device store.
 * Reconnects automatically with exponential backoff.
 */
export function useDeviceWebSocket() {
  const patchLiveState = useDeviceStore(s => s.patchLiveState)
  const wsRef = useRef(null)
  const retryRef = useRef(null)
  const retryDelay = useRef(1000)

  function connect() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      retryDelay.current = 1000
      console.log('[ws] Connected to API')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'state_update') {
          patchLiveState(msg.deviceId, msg.state)
        } else if (msg.type === 'spotify_update') {
          useUIStore.getState().setSpotifyState(msg.state)
        }
      } catch {}
    }

    ws.onclose = () => {
      wsRef.current = null
      retryRef.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000)
        connect()
      }, retryDelay.current)
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [])
}
