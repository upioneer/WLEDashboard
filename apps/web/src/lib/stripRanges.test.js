import test from 'node:test'
import assert from 'node:assert/strict'
import { endOf, lengthOf, deviceMax, clampMemberToMax, validateMemberRange, displayRange } from './stripRanges.js'

test('strip range helpers mirror the server bookend contract', async (t) => {
  await t.test('start/end convert to offset/length without drift', async () => {
    assert.equal(endOf(0, 30), 29)
    assert.equal(endOf(90, 10), 99)
    assert.equal(lengthOf(0, 29), 30)
    assert.equal(lengthOf(90, 99), 10)
  })

  await t.test('deviceMax accepts positive integers only', async () => {
    assert.equal(deviceMax({ led_count: 300 }), 300)
    assert.equal(deviceMax({ led_count: null }), null)
    assert.equal(deviceMax({}), null)
    assert.equal(deviceMax({ led_count: 0 }), null)
    assert.equal(deviceMax({ led_count: -5 }), null)
    assert.equal(deviceMax({ led_count: 12.5 }), null)
  })

  await t.test('clamp keeps ranges inside 0..max-1', async () => {
    assert.deepEqual(clampMemberToMax({ offset: 0, length: 30 }, 300), { offset: 0, length: 30 })
    assert.deepEqual(clampMemberToMax({ offset: 0, length: 800 }, 300), { offset: 0, length: 300 })
    assert.deepEqual(clampMemberToMax({ offset: 290, length: 30 }, 300), { offset: 290, length: 10 })
    assert.deepEqual(clampMemberToMax({ offset: 500, length: 5 }, 300), { offset: 299, length: 1 })
    assert.deepEqual(clampMemberToMax({ offset: -4, length: 0 }, 300), { offset: 0, length: 1 })
  })

  await t.test('displayRange shows traversal order', async () => {
    assert.deepEqual(displayRange({ offset: 0, length: 30 }), { start: 0, end: 29 })
    assert.deepEqual(displayRange({ offset: 0, length: 30, reverse: false }), { start: 0, end: 29 })
    assert.deepEqual(displayRange({ offset: 0, length: 30, reverse: true }), { start: 29, end: 0 })
    assert.deepEqual(displayRange({ offset: 90, length: 10, reverse: true }), { start: 99, end: 90 })
  })

  await t.test('validation reports shape errors before bookends', async () => {
    assert.equal(validateMemberRange({ offset: 0, length: 30 }, 300), null)
    assert.equal(validateMemberRange({ offset: 290, length: 10 }, 300), null)
    assert.match(validateMemberRange({ offset: 290, length: 11 }, 300), /exceeds the device max of 300/)
    assert.match(validateMemberRange({ offset: -1, length: 5 }, 300), /Start must be/)
    assert.match(validateMemberRange({ offset: 0, length: 0 }, 300), /at least 1 LED/)
    assert.equal(validateMemberRange({ offset: 0, length: 30 }, null), null)
  })
})
