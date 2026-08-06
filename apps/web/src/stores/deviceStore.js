import { create } from 'zustand'
import { devicesApi } from '../lib/api.js'

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

  // ─── Actions ─────────────────────────────────────────────────────────────────

  fetchLatestFirmware: async () => {
    try {
      const res = await fetch('https://api.github.com/repos/Aircoookie/WLED/releases/latest')
      if (res.ok) {
        const data = await res.json()
        set({ latestFirmwareVersion: data.tag_name.replace('v', '') })
      }
    } catch (err) {
      console.warn('Failed to fetch latest WLED firmware from GitHub', err)
    }
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
      devices: s.devices.map(d =>
        d.id === deviceId ? { ...d, liveState } : d
      )
    }))
  },

  // Optimistic command: update local state, fire API, rollback on failure
  sendCommand: async (deviceOrId, payload) => {
    const deviceId = typeof deviceOrId === 'object' && deviceOrId !== null ? deviceOrId.id : deviceOrId
    const device = get().devices.find(d => d.id === deviceId)
    if (!device) return

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

    // Optimistic: merge payload into liveState
    set(s => ({
      devices: s.devices.map(d => d.id === deviceId
        ? { ...d, liveState: mergeLiveState(d.liveState, payload) }
        : d
      )
    }))

    try {
      const result = await devicesApi.command(deviceId, payload)
      // Merge actual response
      set(s => ({
        devices: s.devices.map(d => d.id === deviceId
          ? { ...d, liveState: mergeLiveState(d.liveState, result) }
          : d
        )
      }))
    } catch {
      // Rollback with bouncy preset signal for UI (UI reads this flag)
      set(s => ({
        devices: s.devices.map(d => d.id === deviceId
          ? { ...d, liveState: prevState, _commandRejected: Date.now() }
          : d
        )
      }))
    }
  },
}))
