import { useEffect, useRef } from 'react'
import { useDeviceStore } from '../stores/deviceStore.js'
import { useUIStore } from '../stores/uiStore.js'

function getWebSocketUrl() {
  if (typeof window === 'undefined') return ''
  if (import.meta.env?.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

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

  useEffect(() => {
    let unmounted = false

    function scheduleRetry() {
      if (unmounted) return
      clearTimeout(retryRef.current)
      retryRef.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000)
        connect()
      }, retryDelay.current)
    }

    function connect() {
      if (unmounted) return
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

      try {
        const url = getWebSocketUrl()
        if (!url) return

        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          if (unmounted) {
            ws.close()
            return
          }
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
            } else if (msg.type === 'weather_update') {
              useUIStore.getState().setWeatherState(msg.state)
            }
          } catch {}
        }

        ws.onclose = () => {
          wsRef.current = null
          scheduleRetry()
        }

        ws.onerror = () => {
          try { ws.close() } catch {}
        }
      } catch (err) {
        console.warn('[ws] Failed to initiate WebSocket connection:', err)
        wsRef.current = null
        scheduleRetry()
      }
    }

    connect()

    return () => {
      unmounted = true
      clearTimeout(retryRef.current)
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {}
        wsRef.current = null
      }
    }
  }, [patchLiveState])
}

