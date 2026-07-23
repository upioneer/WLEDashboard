import { create } from 'zustand'
import { automationApi } from '../lib/api.js'

export const useAutomationStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  schedules: [],
  routines: [],
  sunTimes: null,
  loading: true,
  error: null,

  // ── Actions ─────────────────────────────────────────────────────────────────

  fetchAutomation: async () => {
    try {
      const [schedules, routines, sunTimes] = await Promise.all([
        automationApi.listSchedules(),
        automationApi.listRoutines(),
        automationApi.getSunTimes().catch(() => null),
      ])
      set({ schedules, routines, sunTimes, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  // Schedules CRUD
  addSchedule: async (data) => {
    const item = await automationApi.createSchedule(data)
    set(s => ({ schedules: [item, ...s.schedules] }))
    return item
  },

  updateSchedule: async (id, data) => {
    const prev = get().schedules
    set(s => ({
      schedules: s.schedules.map(sch => sch.id === id ? { ...sch, ...data } : sch)
    }))

    try {
      const updated = await automationApi.updateSchedule(id, data)
      set(s => ({
        schedules: s.schedules.map(sch => sch.id === id ? { ...sch, ...updated } : sch)
      }))
    } catch {
      set({ schedules: prev })
      throw new Error('Failed to update schedule')
    }
  },

  removeSchedule: async (id) => {
    const prev = get().schedules
    set(s => ({ schedules: s.schedules.filter(sch => sch.id !== id) }))
    try {
      await automationApi.deleteSchedule(id)
    } catch {
      set({ schedules: prev })
      throw new Error('Failed to remove schedule')
    }
  },

  triggerSchedule: async (id) => {
    await automationApi.triggerSchedule(id)
    get().fetchAutomation()
  },

  // Routines CRUD
  addRoutine: async (data) => {
    const item = await automationApi.createRoutine(data)
    set(s => ({ routines: [item, ...s.routines] }))
    return item
  },

  updateRoutine: async (id, data) => {
    const prev = get().routines
    set(s => ({
      routines: s.routines.map(r => r.id === id ? { ...r, ...data } : r)
    }))

    try {
      const updated = await automationApi.updateRoutine(id, data)
      set(s => ({
        routines: s.routines.map(r => r.id === id ? { ...r, ...updated } : r)
      }))
    } catch {
      set({ routines: prev })
      throw new Error('Failed to update routine')
    }
  },

  removeRoutine: async (id) => {
    const prev = get().routines
    set(s => ({ routines: s.routines.filter(r => r.id !== id) }))
    try {
      await automationApi.deleteRoutine(id)
    } catch {
      set({ routines: prev })
      throw new Error('Failed to remove routine')
    }
  },

  executeRoutine: async (id) => {
    await automationApi.executeRoutine(id)
  },
}))
