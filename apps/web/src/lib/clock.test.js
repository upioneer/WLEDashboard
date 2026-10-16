import test from 'node:test'
import assert from 'node:assert/strict'
import { formatClock } from './clock.js'

// Fixed instant: 2026-10-15T14:30:45Z (a Thursday)
const FIXED = new Date('2026-10-15T14:30:45Z')

test('minimal style renders time only', () => {
  const { primary, secondary } = formatClock(FIXED, 'UTC', 'minimal')
  assert.equal(primary, '14:30')
  assert.equal(secondary, null)
})

test('compact style adds a zone abbreviation', () => {
  const { primary, secondary } = formatClock(FIXED, 'UTC', 'compact')
  assert.equal(primary, '14:30')
  assert.equal(secondary, 'UTC')
})

test('full style adds seconds and a date line', () => {
  const { primary, secondary } = formatClock(FIXED, 'UTC', 'full')
  assert.equal(primary, '14:30:45')
  assert.ok(secondary.includes('Oct'))
  assert.ok(secondary.includes('15'))
})

test('time zones shift the rendered time', () => {
  const { primary } = formatClock(FIXED, 'America/New_York', 'minimal')
  assert.equal(primary, '10:30')
})

test('invalid zones fall back gracefully', () => {
  const { primary, secondary } = formatClock(FIXED, 'Not/AZone', 'full')
  assert.equal(primary, '--:--')
  assert.equal(secondary, null)
})
