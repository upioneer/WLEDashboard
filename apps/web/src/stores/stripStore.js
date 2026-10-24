import { create } from 'zustand'
import { stripsApi } from '../lib/api.js'

export const useStripStore = create((set, get) => ({
  strips: [],
  loading: true,
  error: null,

  fetchStrips: async () => {
    try {
      const strips = await stripsApi.list()
      set({ strips, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  addStrip: async (data) => {
    const strip = await stripsApi.create(data)
    set(s => ({ strips: [...s.strips, strip] }))
    return strip
  },

  updateStrip: async (id, data) => {
    const prev = get().strips
    set(s => ({
      strips: s.strips.map(st => st.id === id ? { ...st, ...data } : st)
    }))

    try {
      const updated = await stripsApi.update(id, data)
      set(s => ({
        strips: s.strips.map(st => st.id === id ? { ...st, ...updated } : st)
      }))
    } catch {
      set({ strips: prev })
      throw new Error('Failed to update strip')
    }
  },

  removeStrip: async (id) => {
    const prev = get().strips
    set(s => ({ strips: s.strips.filter(st => st.id !== id) }))
    try {
      await stripsApi.delete(id)
    } catch {
      set({ strips: prev })
      throw new Error('Failed to remove strip')
    }
  },

  playStrip: async (id, data) => {
    const status = await stripsApi.play(id, data)
    set(s => ({
      strips: s.strips.map(st => st.id === id ? { ...st, playing: true } : st)
    }))
    return status
  },

  stopStrip: async (id) => {
    const status = await stripsApi.stop(id)
    set(s => ({
      strips: s.strips.map(st => st.id === id ? { ...st, playing: false } : st)
    }))
    return status
  },
}))
