import { extractDominantColor, blendColors, hexToRgb } from './colors.js'

export const BACKGROUND_PATTERNS = [
  { id: 'none', label: 'None' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'stripes', label: 'Diagonal stripes' },
  { id: 'dots', label: 'Dots' },
  { id: 'grid', label: 'Grid' },
  { id: 'matrix', label: 'Matrix rain' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'waves', label: 'Waves' },
]

export const BACKGROUND_MODES = [
  { id: 'custom', label: 'Custom color' },
  { id: 'device', label: 'Follow a device' },
  { id: 'group', label: 'Follow a group' },
]

export const DEFAULT_BACKGROUND = { pattern: 'none', mode: 'custom', color: '#8b5cf6', targetId: null }

/**
 * Resolve the pattern tint. Custom mode uses the picked color; device and
 * group modes track live light output and fall back to the picked color
 * while the target is missing or dark.
 */
export function resolveBackgroundColor(prefs, { devices = [], groups = [] } = {}) {
  const fallback = typeof prefs?.color === 'string' && prefs.color ? prefs.color : DEFAULT_BACKGROUND.color
  if (prefs?.mode === 'device' && prefs?.targetId) {
    const dev = (devices ?? []).find(d => d.id === prefs.targetId)
    return extractDominantColor(dev?.liveState) ?? fallback
  }
  if (prefs?.mode === 'group' && prefs?.targetId) {
    const grp = (groups ?? []).find(g => g.id === prefs.targetId)
    const memberColors = (grp?.device_ids ?? [])
      .map(id => (devices ?? []).find(d => d.id === id))
      .map(d => extractDominantColor(d?.liveState))
      .filter(Boolean)
    return blendColors(memberColors) ?? fallback
  }
  return fallback
}

export function withAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
