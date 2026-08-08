import { create } from 'zustand'

/**
 * UI store: manages sidebar state, active view, toast queue, and modals.
 * No async operations — pure UI state only.
 */
export const useUIStore = create((set, get) => ({
  // ── Sidebar ─────────────────────────────────────────────────────────────────
  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  // ── Active view ─────────────────────────────────────────────────────────────
  activeView: 'dashboard',
  setActiveView: (v) => set({ activeView: v }),

  // ── Toast queue ─────────────────────────────────────────────────────────────
  toasts: [],

  addToast: ({ message, type = 'info', duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration)
    }
    return id
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Modal stack ─────────────────────────────────────────────────────────────
  modals: [],

  openModal: (id, props = {}) => {
    set(s => ({
      modals: s.modals.some(m => m.id === id)
        ? s.modals
        : [...s.modals, { id, props }]
    }))
  },

  closeModal: (id) => set(s => ({ modals: s.modals.filter(m => m.id !== id) })),
  closeAllModals: () => set({ modals: [] }),
  isModalOpen: (id) => get().modals.some(m => m.id === id),

  // ── Global accent color (blended from live WLED output) ─────────────────────
  headerAccentColor: null,
  setHeaderAccentColor: (color) => set({ headerAccentColor: color }),

  // ── Spotify State ───────────────────────────────────────────────────────────
  spotifyState: { is_playing: false },
  setSpotifyState: (state) => set({ spotifyState: state }),

  // ── Favorites ───────────────────────────────────────────────────────────────
  favorites: (() => { try { return JSON.parse(localStorage.getItem('wled_favorites') || '[]') } catch { return [] } })(),
  toggleFavorite: (id) => set(s => {
    const next = s.favorites.includes(id) ? s.favorites.filter(x => x !== id) : [...s.favorites, id]
    localStorage.setItem('wled_favorites', JSON.stringify(next))
    return { favorites: next }
  }),
}))
