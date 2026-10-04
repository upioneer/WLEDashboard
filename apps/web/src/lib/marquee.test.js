import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GLYPH_H,
  maxRowsForHeight,
  rowBandTop,
  textToColumns,
  measureTextWidth,
  scrollStripLength,
  renderMarqueeFrame,
  applySerpentine,
  hexToRgbTriplet,
  frameToRgbTriplets,
  buildMarqueeLoopState,
} from './marquee.js'

test('maxRowsForHeight follows floor((H - 2) / 6)', () => {
  assert.equal(maxRowsForHeight(8), 1)
  assert.equal(maxRowsForHeight(16), 2)
  assert.equal(maxRowsForHeight(32), 5)
  assert.equal(maxRowsForHeight(7), 1)
  assert.equal(maxRowsForHeight(6), 0)
  assert.equal(maxRowsForHeight(0), 0)
})

test('rowBandTop centers rows with even buffers', () => {
  // 16px tall, 2 rows: content = 11px, top margin = 2, bands at 2..6 and 8..12
  assert.equal(rowBandTop(0, 2, 16), 2)
  assert.equal(rowBandTop(1, 2, 16), 8)
  // 8px tall, 1 row: content = 5px, top margin = 1
  assert.equal(rowBandTop(0, 1, 8), 1)
  // 32px tall, 5 rows: content = 29px, top margin = 1
  assert.equal(rowBandTop(0, 5, 32), 1)
  assert.equal(rowBandTop(4, 5, 32), 25)
})

test('textToColumns emits 3 columns per glyph plus separators', () => {
  const single = textToColumns('A')
  assert.equal(single.length, 3)
  assert.equal(single[0].length, GLYPH_H)
  // 'A' top row is .#. so first column top cell is dark, second is lit
  assert.equal(single[0][0], 0)
  assert.equal(single[1][0], 1)

  const pair = textToColumns('AB')
  assert.equal(pair.length, 7)
  assert.deepEqual(pair[3], [0, 0, 0, 0, 0])
})

test('measureTextWidth matches column layout', () => {
  assert.equal(measureTextWidth(''), 0)
  assert.equal(measureTextWidth('A'), 3)
  assert.equal(measureTextWidth('AB'), 7)
  assert.equal(measureTextWidth('HELLO'), 19)
})

test('text is uppercased and unknown glyphs render blank', () => {
  assert.deepEqual(textToColumns('a'), textToColumns('A'))
  const unknown = textToColumns('\u{1F600}')
  assert.equal(unknown.length, 3)
  assert.ok(unknown.every((col) => col.every((v) => v === 0)))
})

test('scrollStripLength pads one blank screen on each side', () => {
  assert.equal(scrollStripLength('A', 8), 8 + 3 + 8)
  assert.equal(scrollStripLength('', 16), 32)
})

test('renderMarqueeFrame starts blank then scrolls text in from the right', () => {
  const base = { width: 8, height: 8, rows: [{ text: 'A', color: '#ff0000' }], bg: '#000000' }
  const first = renderMarqueeFrame({ ...base, offset: 0 })
  assert.equal(first.length, 64)
  assert.ok(first.every((px) => px === '#000000'))

  // After one full screen of travel the glyph starts at x = 0, band top = 1
  const entered = renderMarqueeFrame({ ...base, offset: 8 })
  assert.equal(entered[1 * 8 + 0], '#000000') // .#.
  assert.equal(entered[1 * 8 + 1], '#ff0000')
  assert.equal(entered[1 * 8 + 2], '#000000')
})

test('renderMarqueeFrame paints each row in its own band and color', () => {
  const frame = renderMarqueeFrame({
    width: 16,
    height: 16,
    rows: [
      { text: 'A', color: '#ff0000' },
      { text: 'B', color: '#00ff00' },
    ],
    bg: '#000000',
    offset: 16,
  })
  // Row 0 band starts at y = 2, row 1 band starts at y = 8
  assert.equal(frame[2 * 16 + 1], '#ff0000')
  assert.equal(frame[7 * 16 + 1], '#000000') // gap between bands
  assert.equal(frame[8 * 16 + 0], '#00ff00') // B top row is ##.
})

test('renderMarqueeFrame clips rows that overflow short panels', () => {
  const frame = renderMarqueeFrame({
    width: 8,
    height: 8,
    rows: [
      { text: 'A', color: '#ff0000' },
      { text: 'B', color: '#00ff00' },
    ],
    bg: '#000000',
    offset: 8,
  })
  assert.equal(frame.length, 64)
  assert.ok(frame.every((px) => typeof px === 'string'))
})

test('applySerpentine reverses odd rows only', () => {
  const frame = ['a', 'b', 'c', 'd', 'e', 'f']
  assert.deepEqual(applySerpentine(frame, 3, 2), ['a', 'b', 'c', 'f', 'e', 'd'])
})

test('hexToRgbTriplet parses full, short, and invalid hex', () => {
  assert.deepEqual(hexToRgbTriplet('#ff0000'), [255, 0, 0])
  assert.deepEqual(hexToRgbTriplet('#0f0'), [0, 255, 0])
  assert.deepEqual(hexToRgbTriplet(null), [0, 0, 0])
  assert.deepEqual(hexToRgbTriplet('nope'), [0, 0, 0])
})

test('frameToRgbTriplets converts a full frame', () => {
  assert.deepEqual(frameToRgbTriplets(['#ff0000', '#00ff00']), [[255, 0, 0], [0, 255, 0]])
})

test('buildMarqueeLoopState keeps text rows separate from matrix dimensions', () => {
  const textRows = [{ text: 'HI', color: '#ffffff' }]
  const s = buildMarqueeLoopState({
    marqueeRows: textRows,
    bg: '#000000',
    speed: 12,
    direction: 'left',
    serpentine: false,
    pushing: false,
    deviceId: '',
    cols: 64,
    rows: 16,
  })
  // Regression: these used to share one `rows` key, dropping the text list
  assert.equal(s.marqueeRows, textRows)
  assert.equal(typeof s.marqueeRows.map, 'function')
  assert.equal(s.cols, 64)
  assert.equal(s.rows, 16)
  // The loop shape must feed renderMarqueeFrame end to end
  const frame = renderMarqueeFrame({ width: s.cols, height: s.rows, rows: s.marqueeRows, bg: s.bg, offset: 64 })
  assert.equal(frame.length, 64 * 16)
  assert.ok(frame.includes('#ffffff'))
})
