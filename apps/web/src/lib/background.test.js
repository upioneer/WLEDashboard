import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BACKGROUND_PATTERNS,
  BACKGROUND_MODES,
  DEFAULT_BACKGROUND,
  resolveBackgroundColor,
  withAlpha,
} from './background.js'

test('pattern and mode catalogs are unique and stable', () => {
  const ids = BACKGROUND_PATTERNS.map(p => p.id)
  assert.deepEqual(ids, ['none', 'aurora', 'stripes', 'dots', 'grid', 'matrix', 'shapes', 'waves'])
  assert.deepEqual(BACKGROUND_MODES.map(m => m.id), ['custom', 'device', 'group'])
  assert.deepEqual(DEFAULT_BACKGROUND, { pattern: 'none', mode: 'custom', color: '#8b5cf6', targetId: null })
})

test('custom mode returns the picked color', () => {
  assert.equal(resolveBackgroundColor({ mode: 'custom', color: '#ff0000' }), '#ff0000')
  assert.equal(resolveBackgroundColor(null), '#8b5cf6')
  assert.equal(resolveBackgroundColor({}), '#8b5cf6')
})

test('device mode tracks live output with fallback', () => {
  const devices = [
    { id: 'a', liveState: { seg: [{ col: [[0, 255, 0]] }] } },
    { id: 'b', liveState: null },
  ]
  assert.equal(
    resolveBackgroundColor({ mode: 'device', targetId: 'a', color: '#111111' }, { devices }),
    '#00ff00'
  )
  assert.equal(
    resolveBackgroundColor({ mode: 'device', targetId: 'b', color: '#111111' }, { devices }),
    '#111111'
  )
  assert.equal(
    resolveBackgroundColor({ mode: 'device', targetId: 'missing', color: '#111111' }, { devices }),
    '#111111'
  )
})

test('group mode blends member colors with fallback', () => {
  const devices = [
    { id: 'a', liveState: { seg: [{ col: [[255, 0, 0]] }] } },
    { id: 'b', liveState: { seg: [{ col: [[0, 0, 255]] }] } },
  ]
  const groups = [{ id: 'g', device_ids: ['a', 'b'] }]
  assert.equal(
    resolveBackgroundColor({ mode: 'group', targetId: 'g', color: '#111111' }, { devices, groups }),
    '#800080'
  )
  assert.equal(
    resolveBackgroundColor({ mode: 'group', targetId: 'missing', color: '#111111' }, { devices, groups }),
    '#111111'
  )
  assert.equal(
    resolveBackgroundColor({ mode: 'group', targetId: 'g', color: '#111111' }, { devices: [], groups }),
    '#111111'
  )
})

test('withAlpha formats rgba tints', () => {
  assert.equal(withAlpha('#ff0000', 0.1), 'rgba(255, 0, 0, 0.1)')
  assert.equal(withAlpha('#8b5cf6', 0.06), 'rgba(139, 92, 246, 0.06)')
})
