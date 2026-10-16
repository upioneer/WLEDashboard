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

  addToast: ({ message, type = 'info', duration }) => {
    // Error notifications remain persistent until explicitly dismissed by the user (duration = 0)
    const effectiveDuration = duration !== undefined ? duration : (type === 'error' ? 0 : 4000)
    const id = `toast-${Date.now()}-${Math.random()}`
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    if (effectiveDuration > 0) {
      setTimeout(() => get().removeToast(id), effectiveDuration)
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

  // ── Demo Mode ───────────────────────────────────────────────────────────────
  demoMode: false,
  setDemoMode: (val) => set({ demoMode: !!val }),

  // ── Sidebar clock display ───────────────────────────────────────────────────
  // Shared so Settings changes reflect in the chip instantly without remount.
  clockSettings: { enabled: true, style: 'compact', timeZone: 'local' },
  setClockSettings: (patch) => set(s => ({ clockSettings: { ...s.clockSettings, ...patch } })),

  // ── Spotify State ───────────────────────────────────────────────────────────
  spotifyState: { is_playing: false },
  setSpotifyState: (state) => set({ spotifyState: state }),

  // ── Weather State ───────────────────────────────────────────────────────────
  weatherState: null,
  setWeatherState: (state) => set({ weatherState: state }),

  // ── Favorites ───────────────────────────────────────────────────────────────
  favorites: (() => { try { return JSON.parse(localStorage.getItem('wled_favorites') || '[]') } catch { return [] } })(),
  toggleFavorite: (id) => set(s => {
    const next = s.favorites.includes(id) ? s.favorites.filter(x => x !== id) : [...s.favorites, id]
    localStorage.setItem('wled_favorites', JSON.stringify(next))
    return { favorites: next }
  }),

  // ── Dashboard View Preferences ──────────────────────────────────────────────
  dashboardSortMode: (() => { try { return localStorage.getItem('wled_dashboard_sort') || 'manual' } catch { return 'manual' } })(),
  setDashboardSortMode: (mode) => {
    try { localStorage.setItem('wled_dashboard_sort', mode) } catch {}
    set({ dashboardSortMode: mode })
  },

  dashboardViewMode: (() => { try { return localStorage.getItem('wled_dashboard_view_mode') || 'devices' } catch { return 'devices' } })(),
  setDashboardViewMode: (mode) => {
    try { localStorage.setItem('wled_dashboard_view_mode', mode) } catch {}
    set({ dashboardViewMode: mode })
  },

  dashboardFilter: (() => { try { return localStorage.getItem('wled_dashboard_filter') || 'all' } catch { return 'all' } })(),
  setDashboardFilter: (filter) => {
    try { localStorage.setItem('wled_dashboard_filter', filter) } catch {}
    set({ dashboardFilter: filter })
  },

  // ── Advanced Mode ───────────────────────────────────────────────────────────
  advancedMode: (() => {
    try {
      return localStorage.getItem('wled_advanced_mode') === 'true'
    } catch {
      return false
    }
  })(),
  setAdvancedMode: (val) => {
    try {
      localStorage.setItem('wled_advanced_mode', String(val))
    } catch {}
    set({ advancedMode: !!val })
  },

  // ── Device IP Click Behavior Preference ─────────────────────────────────────
  // Options: 'menu' (show action menu), 'open' (open in new tab), 'copy' (copy to clipboard)
  deviceIpClickAction: (() => { try { return localStorage.getItem('wled_ip_click_action') || 'menu' } catch { return 'menu' } })(),
  setDeviceIpClickAction: (action) => {
    try { localStorage.setItem('wled_ip_click_action', action) } catch {}
    set({ deviceIpClickAction: action })
  },
}))
