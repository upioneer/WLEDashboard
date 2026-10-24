// Headless 1D pattern renderer for virtual strips. Pure functions of
// (pattern, led count, params, elapsed ms): deterministic, no DOM, no clock
// reads, so frames stay unit testable and reproducible.

export const STRIP_PATTERNS = [
  { id: 'solid', label: 'Solid' },
  { id: 'chase', label: 'Chase' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'rainbow', label: 'Rainbow' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'theater', label: 'Theater Chase' },
]

export const STRIP_PATTERN_IDS = STRIP_PATTERNS.map((p) => p.id)

const CHASE_TAIL = 8

function clampByte(n) {
  const v = Math.round(n)
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function normColor(c, fallback) {
  if (Array.isArray(c) && c.length >= 3) return [clampByte(c[0]), clampByte(c[1]), clampByte(c[2])]
  return [...fallback]
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function mix(c1, c2, t) {
  return [clampByte(lerp(c1[0], c2[0], t)), clampByte(lerp(c1[1], c2[1], t)), clampByte(lerp(c1[2], c2[2], t))]
}

function hsvToRgb(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return [clampByte((r + m) * 255), clampByte((g + m) * 255), clampByte((b + m) * 255)]
}

// Speed 0..255 maps to 4..64 pixels per second.
function pixelsPerSecond(speed) {
  const s = Math.max(0, Math.min(255, Number(speed) || 0))
  return 4 + (s / 255) * 60
}

export function renderStripFrame(pattern, count, params = {}, elapsedMs = 0) {
  const n = Math.max(0, Math.floor(count) || 0)
  const color1 = normColor(params.color1, [255, 255, 255])
  const color2 = normColor(params.color2, [0, 0, 0])
  const dir = params.direction === -1 ? -1 : 1
  const traveled = pixelsPerSecond(params.speed) * (elapsedMs / 1000) * dir

  const frame = new Array(n)
  switch (pattern) {
    case 'chase': {
      const head = ((Math.round(traveled) % n) + n) % n
      for (let i = 0; i < n; i++) {
        const dist = (head - i + n) % n
        frame[i] = dist <= CHASE_TAIL ? mix(color2, color1, 1 - dist / (CHASE_TAIL + 1)) : [...color2]
      }
      return frame
    }
    case 'wipe': {
      const period = n * 2
      const p = ((traveled % period) + period) % period
      const fill = p < n ? p / n : 1 - (p - n) / n
      for (let i = 0; i < n; i++) {
        frame[i] = i / n <= fill ? [...color1] : [...color2]
      }
      return frame
    }
    case 'rainbow': {
      for (let i = 0; i < n; i++) {
        const hue = (((i / Math.max(1, n)) * 360 + traveled * 4) % 360 + 360) % 360
        frame[i] = hsvToRgb(hue, 1, 1)
      }
      return frame
    }
    case 'gradient': {
      for (let i = 0; i < n; i++) {
        frame[i] = mix(color1, color2, n <= 1 ? 0 : i / (n - 1))
      }
      return frame
    }
    case 'theater': {
      const offset = ((Math.floor(traveled / 4) % 3) + 3) % 3
      for (let i = 0; i < n; i++) {
        frame[i] = (i + offset) % 3 === 0 ? [...color1] : [...color2]
      }
      return frame
    }
    case 'solid':
    default: {
      for (let i = 0; i < n; i++) {
        frame[i] = [...color1]
      }
      return frame
    }
  }
}
