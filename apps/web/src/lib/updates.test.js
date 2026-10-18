import test from 'node:test'
import assert from 'node:assert/strict'
import { parseVersion, isNewerVersion, pickLatestTag } from './updates.js'

test('parseVersion tolerates prefixes and junk', () => {
  assert.deepEqual(parseVersion('v0.29.1'), [0, 29, 1])
  assert.deepEqual(parseVersion('1.2'), [1, 2, 0])
  assert.deepEqual(parseVersion('latest'), [0, 0, 0])
  assert.deepEqual(parseVersion(null), [0, 0, 0])
  assert.deepEqual(parseVersion('  V2.0.0  '), [2, 0, 0])
})

test('isNewerVersion compares segment by segment', () => {
  assert.equal(isNewerVersion('0.29.0', '0.29.1'), true)
  assert.equal(isNewerVersion('0.29.1', '0.29.1'), false)
  assert.equal(isNewerVersion('0.30.0', '0.29.9'), false)
  assert.equal(isNewerVersion('0.9.0', '0.10.0'), true)
  assert.equal(isNewerVersion('1.0.0', '0.99.99'), false)
  assert.equal(isNewerVersion('0.29.0', null), false)
  assert.equal(isNewerVersion('v0.29.0', 'v0.30.0'), true)
})

test('pickLatestTag finds the max semantic tag', () => {
  assert.equal(pickLatestTag([{ name: 'v0.28.0' }, { name: 'v0.29.1' }, { name: 'v0.9.0' }]), '0.29.1')
  assert.equal(pickLatestTag(['v1.2.0', 'v1.10.0']), '1.10.0')
  assert.equal(pickLatestTag([{ name: 'nightly' }, { name: 'v0.1.0' }]), '0.1.0')
  assert.equal(pickLatestTag([]), null)
  assert.equal(pickLatestTag(null), null)
  assert.equal(pickLatestTag([{ name: 'nightly' }]), null)
})
