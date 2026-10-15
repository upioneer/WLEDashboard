import { create } from 'zustand'
import { devicesApi } from '../lib/api.js'
import { nextCommandSeq, isStaleResponse } from '../lib/commands.js'

/**
 * Device store: source of truth for all registered WLED devices and their
 * live state. Handles optimistic updates with rollback on API failure.
 */
export const useDeviceStore = create((set, get) => ({
  // ─── State ───────────────────────────────────────────────────────────────────
  devices: [],
  loading: true,
  error: null,
  latestFirmwareVersion: null,
  latestReleaseInfo: null,
  isFetchingFirmware: false,

  // ─── Actions ─────────────────────────────────────────────────────────────────

  fetchLatestFirmware: async (force = false) => {
    if (get().isFetchingFirmware) return
    set({ isFetchingFirmware: true })
    try {
      const headers = force ? { 'Cache-Control': 'no-cache' } : {}
      let res = await fetch('https://api.github.com/repos/wled/WLED/releases/latest', { headers })
      if (!res.ok) {
        res = await fetch('https://api.github.com/repos/Aircoookie/WLED/releases/latest', { headers })
      }
      if (res.ok) {
        const data = await res.json()
        if (data.tag_name) {
          const cleanTag = data.tag_name.replace(/^v/i, '')
          set({
            latestFirmwareVersion: cleanTag,
            latestReleaseInfo: {
              name: data.name || data.tag_name,
              tagName: cleanTag,
              publishedAt: data.published_at,
              body: data.body || '',
              htmlUrl: data.html_url,
            },
            isFetchingFirmware: false,
          })
          return
        }
      }
    } catch (err) {
      console.warn('Failed to fetch latest WLED firmware from GitHub', err)
    }
    set({ isFetchingFirmware: false })
  },

  fetchDevices: async () => {
    try {
      const devices = await devicesApi.list()
      set({ devices, loading: false, error: null })
      get().fetchLatestFirmware() // Fetch firmware in background on initial load
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  addDevice: async (data) => {
    const device = await devicesApi.create(data)
    set(s => ({ devices: [...s.devices, device] }))
    return device
  },

  updateDevice: async (id, data) => {
    // Optimistic update
    const prev = get().devices
    set(s => ({
      devices: s.devices.map(d => d.id === id ? { ...d, ...data } : d)
    }))
    try {
      const updated = await devicesApi.update(id, data)
      set(s => ({
        devices: s.devices.map(d => d.id === id ? { ...d, ...updated } : d)
      }))
    } catch {
      // Rollback
      set({ devices: prev })
      throw new Error('Failed to update device')
    }
  },

  removeDevice: async (id) => {
    const prev = get().devices
    set(s => ({ devices: s.devices.filter(d => d.id !== id) }))
    try {
      await devicesApi.delete(id)
    } catch {
      set({ devices: prev })
      throw new Error('Failed to remove device')
    }
  },

  uploadFirmware: async (id, formData) => {
    return await devicesApi.uploadFirmware(id, formData)
  },

  refreshDevice: async (id) => {
    const data = await devicesApi.refresh(id)
    get().patchLiveState(id, data)
    return data
  },

  reorderDevices: async (orderedIds) => {
    const prev = get().devices
    const indexMap = Object.fromEntries(orderedIds.map((id, i) => [id, i]))
    set(s => ({
      devices: [...s.devices].sort((a, b) => (indexMap[a.id] ?? 0) - (indexMap[b.id] ?? 0))
    }))
    try {
      await devicesApi.reorder(orderedIds)
    } catch {
      set({ devices: prev })
    }
  },

  // Live state patch from WebSocket or polling response
  patchLiveState: (deviceId, liveState) => {
    set(s => ({
      devices: s.devices.map(d => {
        if (d.id !== deviceId) return d
        const updated = { ...d, liveState }
        if (liveState?.info?.ver && liveState.info.ver !== d.firmware_ver) {
          updated.firmware_ver = String(liveState.info.ver)
        }
        if (liveState?.info?.leds?.count != null && liveState.info.leds.count !== d.led_count) {
          updated.led_count = liveState.info.leds.count
        }
        return updated
      })
    }))
  },

  // Optimistic command: update local state, fire API, rollback on failure.
  // Reports { ok, stale } so callers can toast honestly. Stale means a newer
  // command superseded this one and owns the user feedback.
  sendCommand: async (deviceOrId, payload) => {
    const deviceId = typeof deviceOrId === 'object' && deviceOrId !== null ? deviceOrId.id : deviceOrId
    const device = get().devices.find(d => d.id === deviceId)
    if (!device) return { ok: false, stale: false }

    const prevState = device.liveState

    // Deep merge liveState including array segment preservation
    const mergeLiveState = (existing = {}, patch = {}) => {
      const merged = { ...existing, ...patch }
      if (Array.isArray(patch.seg) && Array.isArray(existing.seg)) {
        merged.seg = existing.seg.map((existingSeg, idx) => {
          const patchSeg = patch.seg.find(s => (s.id !== undefined ? s.id === existingSeg.id : idx === 0))
          return patchSeg ? { ...existingSeg, ...patchSeg } : existingSeg
        })
      }
      return merged
    }

    const seq = nextCommandSeq(deviceId)

    // Optimistic: merge payload into liveState
    set(s => ({
      devices: s.devices.map(d => d.id === deviceId
        ? { ...d, liveState: mergeLiveState(d.liveState, payload) }
        : d
      )
    }))

    try {
      const result = await devicesApi.command(deviceId, payload)
      // A newer command already moved on: never let a stale response win
      if (isStaleResponse(deviceId, seq)) return { ok: true, stale: true }
      // Merge actual response
      set(s => ({
        devices: s.devices.map(d => d.id === deviceId
          ? { ...d, liveState: mergeLiveState(d.liveState, result) }
          : d
        )
      }))
      return { ok: true, stale: false }
    } catch {
      // Stale failures must not roll back newer optimistic state
      if (isStaleResponse(deviceId, seq)) return { ok: true, stale: true }
      // Rollback with bouncy preset signal for UI (UI reads this flag)
      set(s => ({
        devices: s.devices.map(d => d.id === deviceId
          ? { ...d, liveState: prevState, _commandRejected: Date.now() }
          : d
        )
      }))
      return { ok: false, stale: false }
    }
  },
}))
