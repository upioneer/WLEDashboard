import { create } from 'zustand'
import { spatialApi } from '../lib/api.js'

export const useSpatialStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  hierarchy: [],
  selectedRoomId: null,
  selectedAnchorId: null,
  loading: true,
  error: null,

  // ── Actions ─────────────────────────────────────────────────────────────────
  fetchHierarchy: async () => {
    try {
      const hierarchy = await spatialApi.getHierarchy()
      const firstRoom = hierarchy[0]?.floors[0]?.rooms[0]?.id || null
      set({
        hierarchy,
        selectedRoomId: get().selectedRoomId || firstRoom,
        loading: false,
        error: null,
      })
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  selectRoom: (roomId) => set({ selectedRoomId: roomId, selectedAnchorId: null }),
  selectAnchor: (anchorId) => set({ selectedAnchorId: anchorId }),

  createDwelling: async (data) => {
    const dwelling = await spatialApi.createDwelling(data)
    await get().fetchHierarchy()
    return dwelling
  },

  createFloor: async (data) => {
    const floor = await spatialApi.createFloor(data)
    await get().fetchHierarchy()
    return floor
  },

  addRoom: async (data) => {
    const room = await spatialApi.createRoom(data)
    await get().fetchHierarchy()
    return room
  },

  updateRoom: async (id, data) => {
    await spatialApi.updateRoom(id, data)
    await get().fetchHierarchy()
  },

  removeRoom: async (id) => {
    await spatialApi.deleteRoom(id)
    if (get().selectedRoomId === id) set({ selectedRoomId: null })
    await get().fetchHierarchy()
  },

  addAnchor: async (data) => {
    const anchor = await spatialApi.createAnchor(data)
    await get().fetchHierarchy()
    return anchor
  },

  updateAnchor: async (id, data) => {
    await spatialApi.updateAnchor(id, data)
    await get().fetchHierarchy()
  },

  removeAnchor: async (id) => {
    await spatialApi.deleteAnchor(id)
    if (get().selectedAnchorId === id) set({ selectedAnchorId: null })
    await get().fetchHierarchy()
  },
}))
