/**
 * Color utilities for WLEDashboard.
 * Converts between HSL, RGB, Hex, and WLED color array format.
 */

// ─── HSL <-> RGB ──────────────────────────────────────────────────────────────
export function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

// ─── Hex ──────────────────────────────────────────────────────────────────────
export function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function hexToHsl(hex) {
  return rgbToHsl(...hexToRgb(hex))
}

export function hslToHex(h, s, l) {
  return rgbToHex(...hslToRgb(h, s, l))
}

// ─── WLED Color Format ────────────────────────────────────────────────────────
// WLED uses [R, G, B] or [R, G, B, W] arrays in its state JSON

export function wledColorToHex(wledColor) {
  if (!Array.isArray(wledColor) || wledColor.length < 3) return '#000000'
  return rgbToHex(wledColor[0], wledColor[1], wledColor[2])
}

export function hexToWledColor(hex) {
  return hexToRgb(hex)
}

// ─── Dominant Color Extraction ────────────────────────────────────────────────
// Extracts the primary color from a WLED state for ambient glow effects

export function extractDominantColor(liveState) {
  if (!liveState?.seg?.length) return null
  const seg = liveState.seg[0]
  const col = seg?.col?.[0]
  if (!col || !Array.isArray(col)) return null
  return wledColorToHex(col)
}

export function extractAllSegmentColors(liveState) {
  if (!liveState?.seg?.length) return []
  return liveState.seg
    .filter(s => s?.col?.[0])
    .map(s => ({
      color: wledColorToHex(s.col[0]),
      start: s.start ?? 0,
      stop: s.stop ?? 0,
    }))
}

// ─── Brightness Normalization ─────────────────────────────────────────────────
// WLED brightness: 0-255. Normalized: 0-1. Display: 0-100%

// Physical hardware floor: Factual hardware threshold where light output turns on is 5% linear (raw WLED bri = 13).
const WLED_MIN_RAW_BRI = 13
const WLED_MAX_RAW_BRI = 255

export function wledBriToNorm(bri) { return (bri ?? 0) / 255 }
export function normToWledBri(norm) { return Math.round(norm * 255) }

export function wledBriToPct(bri) {
  if (!bri || bri <= 0) return 0
  if (bri < WLED_MIN_RAW_BRI) return 1
  return Math.round(1 + ((bri - WLED_MIN_RAW_BRI) / (WLED_MAX_RAW_BRI - WLED_MIN_RAW_BRI)) * 99)
}

export function pctToWledBri(pct) {
  if (!pct || pct <= 0) return 0
  if (pct >= 100) return WLED_MAX_RAW_BRI
  return Math.round(WLED_MIN_RAW_BRI + ((pct - 1) / 99) * (WLED_MAX_RAW_BRI - WLED_MIN_RAW_BRI))
}

// ─── Glow Calculation ─────────────────────────────────────────────────────────
// Maps brightness (0-255) to a CSS box-shadow glow string

export function briToGlow(bri, color = '#ffffff', maxBlur = 24) {
  if (!bri || !color) return 'none'
  const norm = bri / 255
  const blur  = norm * maxBlur
  const spread = norm * 4
  const opacity = 0.15 + norm * 0.45
  const [r, g, b] = hexToRgb(color)
  return `0 0 ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${opacity})`
}

// ─── Color Blending ───────────────────────────────────────────────────────────
// Blends multiple hex colors into a single averaged color for the header accent

export function blendColors(hexColors) {
  if (!hexColors.length) return null
  const rgbs = hexColors.map(hexToRgb)
  const avg = [0, 1, 2].map(i => Math.round(rgbs.reduce((s, c) => s + c[i], 0) / rgbs.length))
  return rgbToHex(...avg)
}
