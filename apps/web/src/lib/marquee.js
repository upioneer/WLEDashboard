/**
 * Marquee text renderer for LED matrices.
 *
 * Clean-room 3x5 pixel font (uppercase) with a 1 column inter-character gap
 * and 1px row gap, giving a 6px row pitch. Row capacity follows
 * maxRows = floor((H - 2) / 6) so short banners (H=8) get one row and
 * taller panels stack evenly buffered rows.
 */

export const GLYPH_W = 3
export const GLYPH_H = 5
export const GLYPH_ADVANCE = 4 // 3px glyph + 1px spacing
export const ROW_PITCH = 6 // 5px glyph + 1px gap

// Each glyph is 5 rows of 3 cells. '#' = lit, '.' = dark.
const FONT_3X5 = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '#.#', '#.#', '#.#'],
  N: ['#.#', '###', '###', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '#.#', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '##.', '#.#', '.#.'],
  7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['.#.', '#.#', '.#.', '#.#', '.#.'],
  9: ['.#.', '#.#', '.##', '..#', '##.'],
  ' ': ['...', '...', '...', '...', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '.': ['...', '...', '...', '...', '.#.'],
  ',': ['...', '...', '...', '.#.', '#..'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  "'": ['.#.', '.#.', '...', '...', '...'],
  '-': ['...', '...', '###', '...', '...'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '*': ['...', '#.#', '.#.', '#.#', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '(': ['..#', '.#.', '.#.', '.#.', '..#'],
  ')': ['#..', '.#.', '.#.', '.#.', '#..'],
  '<': ['..#', '.#.', '#..', '.#.', '..#'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '=': ['...', '...', '###', '...', '###'],
  _: ['...', '...', '...', '...', '###'],
}

const BLANK_GLYPH = ['...', '...', '...', '...', '...']

export function getGlyph(char) {
  if (!char) return BLANK_GLYPH
  return FONT_3X5[String(char).toUpperCase()] || BLANK_GLYPH
}

/**
 * Row capacity for a matrix height: floor((H - 2) / 6).
 * Heights below 7px cannot fit the 5px glyph plus buffers.
 */
export function maxRowsForHeight(height) {
  const h = Math.floor(Number(height) || 0)
  if (h < GLYPH_H + 2) return 0
  return Math.max(1, Math.floor((h - 2) / ROW_PITCH))
}

/**
 * Top pixel Y of row `index` when `rowCount` rows share `height` pixels.
 * The glyph block is vertically centered so top/bottom buffers stay even.
 */
export function rowBandTop(index, rowCount, height) {
  const content = rowCount * ROW_PITCH - 1
  const top = Math.floor((height - content) / 2)
  return top + index * ROW_PITCH
}

/**
 * Convert text to an array of columns. Each column is an array of GLYPH_H
 * 0/1 values (top to bottom). One blank column separates characters.
 */
export function textToColumns(text) {
  const chars = Array.from(String(text ?? '').toUpperCase())
  const columns = []
  chars.forEach((ch, ci) => {
    const glyph = getGlyph(ch)
    for (let c = 0; c < GLYPH_W; c++) {
      const col = []
      for (let r = 0; r < GLYPH_H; r++) {
        col.push(glyph[r][c] === '#' ? 1 : 0)
      }
      columns.push(col)
    }
    if (ci < chars.length - 1) {
      columns.push([0, 0, 0, 0, 0])
    }
  })
  return columns
}

export function measureTextWidth(text) {
  const len = Array.from(String(text ?? '')).length
  if (len === 0) return 0
  return len * GLYPH_ADVANCE - 1
}

/**
 * Build the full scroll strip for one row: blank screen, text, blank screen.
 * Frame `offset` shows strip[offset .. offset + width).
 */
export function buildScrollStrip(text, width) {
  const blanks = (n) => Array.from({ length: Math.max(0, n) }, () => [0, 0, 0, 0, 0])
  return [...blanks(width), ...textToColumns(text), ...blanks(width)]
}

export function scrollStripLength(text, width) {
  return width + measureTextWidth(text) + width
}

/**
 * Render one marquee frame as a row-major array of hex color strings.
 * rows: [{ text, color }], bg: hex string, offset: scroll position in columns.
 */
export function renderMarqueeFrame({ width, height, rows = [], bg = '#000000', offset = 0 }) {
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  const frame = Array(w * h).fill(bg)
  const rowCount = rows.length
  if (rowCount === 0) return frame

  rows.forEach((row, ri) => {
    const top = rowBandTop(ri, rowCount, h)
    const strip = buildScrollStrip(row.text, w)
    const color = row.color || '#ffffff'
    for (let x = 0; x < w; x++) {
      const col = strip[offset + x]
      if (!col) continue
      for (let r = 0; r < GLYPH_H; r++) {
        if (!col[r]) continue
        const y = top + r
        if (y < 0 || y >= h) continue
        frame[y * w + x] = color
      }
    }
  })
  return frame
}

/**
 * Reorder a row-major frame for serpentine-wired panels (even rows run
 * left to right, odd rows run right to left). Preview stays linear.
 */
export function applySerpentine(frame, width, height) {
  const out = Array(frame.length)
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const src = r % 2 === 0 ? c : width - 1 - c
      out[r * width + c] = frame[r * width + src]
    }
  }
  return out
}

export function hexToRgbTriplet(hex) {
  const clean = String(hex || '').replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map((ch) => ch + ch).join('')
    : clean.padEnd(6, '0').slice(0, 6)
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return [0, 0, 0]
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

/** Convert a hex frame to the [[r,g,b], ...] triplets the DDP relay expects. */
export function frameToRgbTriplets(frame) {
  return frame.map(hexToRgbTriplet)
}

/**
 * Snapshot the mutable marquee loop inputs for the preview/DDP interval.
 * The text row list (`marqueeRows`) stays separate from the matrix
 * dimensions (`cols`/`rows`): merging them under one `rows` key silently
 * drops the text list and blanks the preview.
 */
export function buildMarqueeLoopState({ marqueeRows, bg, speed, direction, serpentine, pushing, deviceId, cols, rows }) {
  return { marqueeRows, bg, speed, direction, serpentine, pushing, deviceId, cols, rows }
}
