import test from 'node:test'
import assert from 'node:assert/strict'
import { effectNameById, effectIdByName, toLiveEntries } from './effects.js'

const CATALOG = [
  { id: 0, name: 'Solid', category: 'Basic' },
  { id: 41, name: 'Candle', category: 'Fire' },
]

test('effectNameById and effectIdByName resolve within the given list', () => {
  assert.equal(effectNameById(CATALOG, 41), 'Candle')
  assert.equal(effectIdByName(CATALOG, 'Candle'), 41)
  assert.equal(effectNameById(CATALOG, 999), null)
  assert.equal(effectIdByName(CATALOG, 'Missing'), null)
})

test('effect lookups tolerate nullish lists', () => {
  assert.equal(effectNameById(null, 0), null)
  assert.equal(effectIdByName(undefined, 'Solid'), null)
})

test('toLiveEntries indexes names and enriches known categories', () => {
  const entries = toLiveEntries(['Solid', 'Candle', 'Lighthouse'], CATALOG)
  assert.deepEqual(entries, [
    { id: 0, name: 'Solid', category: 'Basic' },
    { id: 1, name: 'Candle', category: 'Fire' },
    { id: 2, name: 'Lighthouse', category: 'Device' },
  ])
})

test('toLiveEntries tolerates nullish input', () => {
  assert.deepEqual(toLiveEntries(null), [])
  assert.deepEqual(toLiveEntries(undefined), [])
  assert.deepEqual(toLiveEntries(['Solid'], null), [{ id: 0, name: 'Solid', category: 'Device' }])
})
