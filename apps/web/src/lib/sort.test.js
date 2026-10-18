import test from 'node:test'
import assert from 'node:assert/strict'
import { compareText, sortedStrings, sortedByName, sortedByLabel, sortDevices } from './sort.js'

test('compareText is case-insensitive with natural numeric ordering', () => {
  assert.equal(compareText('apple', 'Banana') < 0, true)
  assert.equal(compareText('Strip 2', 'Strip 10') < 0, true)
  assert.equal(compareText('same', 'Same'), 0)
})

test('sortedByName sorts entities by name without mutating', () => {
  const input = [{ name: 'Porch' }, { name: 'arcade' }, { name: 'Deck 10' }, { name: 'Deck 2' }]
  const out = sortedByName(input)
  assert.deepEqual(out.map(o => o.name), ['arcade', 'Deck 2', 'Deck 10', 'Porch'])
  assert.deepEqual(input.map(o => o.name), ['Porch', 'arcade', 'Deck 10', 'Deck 2'])
})

test('sortedByName tolerates nullish input and missing names', () => {
  assert.deepEqual(sortedByName(null), [])
  assert.deepEqual(sortedByName(undefined), [])
  const out = sortedByName([{ name: 'b' }, {}, { name: 'a' }])
  assert.deepEqual(out.map(o => o.name), [undefined, 'a', 'b'])
})

test('sortedStrings sorts plain string lists', () => {
  assert.deepEqual(sortedStrings(['UTC', 'america/new_york', 'Europe/Paris']), ['america/new_york', 'Europe/Paris', 'UTC'])
  assert.deepEqual(sortedStrings(null), [])
})

test('sortedByLabel sorts { label } catalogs', () => {
  const input = [{ value: 'rain', label: 'Rain' }, { value: 'clear_day', label: 'Clear Day' }]
  assert.deepEqual(sortedByLabel(input).map(o => o.value), ['clear_day', 'rain'])
})

test('sortDevices orders rows per mode without mutating', () => {
  const input = [
    { id: 'a', name: 'Porch', sort_order: 0, is_online: 0 },
    { id: 'b', name: 'arcade', sort_order: 2, is_online: 1 },
    { id: 'c', name: 'Deck', sort_order: 1, is_online: 1 },
  ]
  assert.deepEqual(sortDevices(input, 'manual').map(d => d.id), ['a', 'b', 'c'])
  assert.deepEqual(sortDevices(input, 'az').map(d => d.id), ['b', 'c', 'a'])
  assert.deepEqual(sortDevices(input, 'za').map(d => d.id), ['a', 'c', 'b'])
  assert.deepEqual(sortDevices(input, 'date').map(d => d.id), ['b', 'c', 'a'])
  assert.deepEqual(sortDevices(input, 'online').map(d => d.id), ['b', 'c', 'a'])
  assert.deepEqual(sortDevices(input, 'updates', ['a', 'c']).map(d => d.id), ['c', 'a', 'b'])
  assert.deepEqual(input.map(d => d.id), ['a', 'b', 'c'])
  assert.deepEqual(sortDevices(null, 'az'), [])
  assert.deepEqual(sortDevices(input, 'bogus').map(d => d.id), ['a', 'b', 'c'])
})
