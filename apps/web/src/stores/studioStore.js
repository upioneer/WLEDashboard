import { create } from 'zustand'
import { studioApi } from '../lib/api.js'

export const useStudioStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  effects: [],
  paletteCatalog: [],
  animations: [],
  customPalettes: [],
  objectShapes: [],
  objectStrategies: {},
  objectChips: {},
  powerDisclaimer: '',
  studioObjects: [],
  activeTab: 'presets', // 'presets' | 'timeline' | 'palette' | 'audio' | 'matrix' | 'objects'
  loading: true,
  error: null,

  // Active Live Preview State
  selectedEffectId: 0,
  selectedPaletteId: 0,
  speed: 128,
  intensity: 128,
  previewColor: '#8b5cf6',

  // Animation Timeline Player
  currentAnimation: null,
  isPlaying: false,
  playheadMs: 0,

  // ── Actions ─────────────────────────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchStudioData: async () => {
    try {
      const [effects, paletteCatalog, animations, customPalettes, shapes, studioObjects] = await Promise.all([
        studioApi.getEffects().catch(() => []),
        studioApi.getPaletteCatalog().catch(() => []),
        studioApi.listAnimations().catch(() => []),
        studioApi.listPalettes().catch(() => []),
        studioApi.getShapes().catch(() => ({})),
        studioApi.listObjects().catch(() => []),
      ])

      set({
        effects,
        paletteCatalog,
        animations,
        customPalettes,
        objectShapes: shapes.shapes ?? [],
        objectStrategies: shapes.strategies ?? {},
        objectChips: shapes.chips ?? {},
        powerDisclaimer: shapes.powerDisclaimer ?? '',
        studioObjects,
        loading: false,
        error: null,
      })
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  setEffect: (id) => set({ selectedEffectId: id }),
  setPalette: (id) => set({ selectedPaletteId: id }),
  setSpeed: (speed) => set({ speed }),
  setIntensity: (intensity) => set({ intensity }),
  setPreviewColor: (previewColor) => set({ previewColor }),

  // Animations CRUD
  saveAnimation: async (animationData) => {
    if (animationData.id) {
      const updated = await studioApi.updateAnimation(animationData.id, animationData)
      set(s => ({
        animations: s.animations.map(a => a.id === updated.id ? updated : a)
      }))
      return updated
    } else {
      const created = await studioApi.createAnimation(animationData)
      set(s => ({ animations: [created, ...s.animations] }))
      return created
    }
  },

  deleteAnimation: async (id) => {
    await studioApi.deleteAnimation(id)
    set(s => ({ animations: s.animations.filter(a => a.id !== id) }))
  },

  // Custom Palettes CRUD
  savePalette: async (paletteData) => {
    const created = await studioApi.createPalette(paletteData)
    set(s => ({ customPalettes: [created, ...s.customPalettes] }))
    return created
  },

  deletePalette: async (id) => {
    await studioApi.deletePalette(id)
    set(s => ({ customPalettes: s.customPalettes.filter(p => p.id !== id) }))
  },

  // Studio 3D Objects CRUD
  saveStudioObject: async (objectData) => {
    if (objectData.id) {
      const updated = await studioApi.updateObject(objectData.id, objectData)
      set(s => ({
        studioObjects: s.studioObjects.map(o => o.id === updated.id ? updated : o)
      }))
      return updated
    } else {
      const created = await studioApi.createObject(objectData)
      set(s => ({ studioObjects: [created, ...s.studioObjects] }))
      return created
    }
  },

  deleteStudioObject: async (id) => {
    await studioApi.deleteObject(id)
    set(s => ({ studioObjects: s.studioObjects.filter(o => o.id !== id) }))
  },

  // Playhead Player Controls
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPlayheadMs: (playheadMs) => set({ playheadMs }),
}))
