import test from 'node:test'
import assert from 'node:assert/strict'
import { renderStripFrame, STRIP_PATTERN_IDS } from '../src/services/stripPatterns.js'

test('strip pattern catalog holds the six starter patterns', () => {
  assert.deepEqual(STRIP_PATTERN_IDS, ['solid', 'chase', 'wipe', 'rainbow', 'gradient', 'theater'])
})

test('solid fills every LED with color1', () => {
  assert.deepEqual(renderStripFrame('solid', 4, { color1: [10, 20, 30] }, 999), [
    [10, 20, 30], [10, 20, 30], [10, 20, 30], [10, 20, 30],
  ])
})

test('gradient interpolates from color1 to color2', () => {
  const frame = renderStripFrame('gradient', 3, { color1: [0, 0, 0], color2: [200, 100, 0] }, 0)
  assert.deepEqual(frame[0], [0, 0, 0])
  assert.deepEqual(frame[2], [200, 100, 0])
  assert.deepEqual(frame[1], [100, 50, 0])
})

test('chase head travels with elapsed time and direction', () => {
  const fwd0 = renderStripFrame('chase', 60, { color1: [255, 0, 0], color2: [0, 0, 0], speed: 255, direction: 1 }, 0)
  // Head at LED 0 with a fading tail behind it (wrapping).
  assert.deepEqual(fwd0[0], [255, 0, 0])
  assert.deepEqual(fwd0[1], [0, 0, 0])
  assert.ok(fwd0[59][0] > 0)
  const fwd1s = renderStripFrame('chase', 60, { color1: [255, 0, 0], color2: [0, 0, 0], speed: 255, direction: 1 }, 1000)
  // 64 px/s wraps a 60 LED strip to LED 4.
  assert.deepEqual(fwd1s[4], [255, 0, 0])
  const rev1s = renderStripFrame('chase', 60, { color1: [255, 0, 0], color2: [0, 0, 0], speed: 255, direction: -1 }, 1000)
  assert.deepEqual(rev1s[56], [255, 0, 0])
})

test('wipe fills then drains across its period', () => {
  const start = renderStripFrame('wipe', 10, { color1: [1, 2, 3], color2: [0, 0, 0], speed: 255 }, 0)
  assert.deepEqual(start[0], [1, 2, 3])
  assert.deepEqual(start[9], [0, 0, 0])
  // 64 px/s on a 10 LED strip: 10px in ~156ms fills everything.
  const full = renderStripFrame('wipe', 10, { color1: [1, 2, 3], color2: [0, 0, 0], speed: 255 }, 156)
  assert.ok(full.every((p) => p[0] === 1 && p[1] === 2 && p[2] === 3))
})

test('rainbow varies across the strip and moves with time', () => {
  const a = renderStripFrame('rainbow', 30, { speed: 128 }, 0)
  const b = renderStripFrame('rainbow', 30, { speed: 128 }, 500)
  assert.ok(new Set(a.map((p) => p.join(','))).size > 10)
  assert.notDeepEqual(a, b)
})

test('theater lights every third LED with a rotating offset', () => {
  const a = renderStripFrame('theater', 9, { color1: [5, 5, 5], color2: [0, 0, 0], speed: 255 }, 0)
  assert.deepEqual(a.map((p) => p[0]), [5, 0, 0, 5, 0, 0, 5, 0, 0])
  const later = renderStripFrame('theater', 9, { color1: [5, 5, 5], color2: [0, 0, 0], speed: 255 }, 100)
  assert.notDeepEqual(later, a)
})

test('unknown patterns fall back to solid and empty strips render empty', () => {
  assert.deepEqual(renderStripFrame('nope', 2, { color1: [7, 7, 7] }, 0), [[7, 7, 7], [7, 7, 7]])
  assert.deepEqual(renderStripFrame('solid', 0, {}, 0), [])
})
