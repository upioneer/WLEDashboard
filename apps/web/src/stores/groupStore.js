import { create } from 'zustand'
import { groupsApi } from '../lib/api.js'
import { useDeviceStore } from './deviceStore.js'

export const useGroupStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  groups: [],
  loading: true,
  error: null,

  // ── Actions ─────────────────────────────────────────────────────────────────
  fetchGroups: async () => {
    try {
      const groups = await groupsApi.list()
      set({ groups, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  addGroup: async (data) => {
    const group = await groupsApi.create(data)
    set(s => ({ groups: [...s.groups, group] }))
    return group
  },

  updateGroup: async (id, data) => {
    const prev = get().groups
    set(s => ({
      groups: s.groups.map(g => g.id === id ? { ...g, ...data } : g)
    }))

    try {
      const updated = await groupsApi.update(id, data)
      set(s => ({
        groups: s.groups.map(g => g.id === id ? { ...g, ...updated } : g)
      }))
    } catch {
      set({ groups: prev })
      throw new Error('Failed to update group')
    }
  },

  removeGroup: async (id) => {
    const prev = get().groups
    set(s => ({ groups: s.groups.filter(g => g.id !== id) }))
    try {
      await groupsApi.delete(id)
    } catch {
      set({ groups: prev })
      throw new Error('Failed to remove group')
    }
  },

  reorderGroups: async (orderedIds) => {
    const prev = get().groups
    const indexMap = Object.fromEntries(orderedIds.map((id, i) => [id, i]))
    set(s => ({
      groups: [...s.groups].sort((a, b) => (indexMap[a.id] ?? 0) - (indexMap[b.id] ?? 0))
    }))
    try {
      await groupsApi.reorder(orderedIds)
    } catch {
      set({ groups: prev })
    }
  },

  // Sends command to all devices in the group via API, plus optimistic patch in deviceStore
  sendGroupCommand: async (groupId, payload) => {
    const group = get().groups.find(g => g.id === groupId)
    if (!group) return

    // Optimistically update device states in deviceStore for member devices
    const deviceStore = useDeviceStore.getState()
    group.device_ids.forEach(devId => {
      const dev = deviceStore.devices.find(d => d.id === devId)
      if (dev && dev.is_online) {
        deviceStore.patchLiveState(devId, { ...dev.liveState, ...payload })
      }
    })

    try {
      await groupsApi.command(groupId, payload)
    } catch (err) {
      // Re-fetch devices to restore actual state
      deviceStore.fetchDevices()
      throw err
    }
  },
}))
