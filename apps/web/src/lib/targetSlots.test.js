import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTargetSlot } from './targetSlots.js'

test('shows the toggle once any group exists', () => {
  assert.equal(resolveTargetSlot({ groupCount: 2, groupsLoading: false }), 'toggle')
  assert.equal(resolveTargetSlot({ groupCount: 1, groupsLoading: true }), 'toggle')
})

test('prefers the error slot when targets failed to load', () => {
  assert.equal(resolveTargetSlot({ groupCount: 0, groupsLoading: false, groupsError: 'boom' }), 'error')
  assert.equal(resolveTargetSlot({ groupCount: 0, groupsLoading: false, devicesError: 'boom' }), 'error')
  assert.equal(
    resolveTargetSlot({ groupCount: 0, groupsLoading: false, groupsError: 'x', devicesError: 'y' }),
    'error'
  )
})

test('stays quiet while the first load is in flight', () => {
  assert.equal(resolveTargetSlot({ groupCount: 0, groupsLoading: true }), 'loading')
})

test('offers group creation once loaded with none', () => {
  assert.equal(resolveTargetSlot({ groupCount: 0, groupsLoading: false }), 'empty')
})
