// Pure helpers for virtual strip member ranges. The server stores members as
// { offset, length } and enforces per-device bookends; the builder edits them
// as inclusive Start/End LED indices. All functions here are UI side mirrors
// of that contract.

export function endOf(offset, length) {
  return Number(offset) + Number(length) - 1
}

export function lengthOf(start, end) {
  return Number(end) - Number(start) + 1
}

export function deviceMax(device) {
  const n = Number(device?.led_count)
  return Number.isInteger(n) && n > 0 ? n : null
}

// Clamp a member range into 0..max-1. Returns a fresh { offset, length }.
export function clampMemberToMax(member, max) {
  const offset = Math.min(Math.max(Number(member.offset) || 0, 0), Math.max(max - 1, 0))
  const length = Math.min(
    Math.max(Number(member.length) || 1, 1),
    Math.max(max - offset, 1),
  )
  return { offset, length }
}

// Traversal order Start/End for display. Canonical storage stays normalized
// (offset low, length), so a reversed member displays high to low.
export function displayRange(member) {
  const offset = Number(member.offset) || 0
  const length = Math.max(Number(member.length) || 0, 0)
  if (member.reverse) {
    return { start: offset + length - 1, end: offset }
  }
  return { start: offset, end: offset + length - 1 }
}

// Validate one member against a known device max. Returns null when the range
// is usable, otherwise a human readable reason. An unknown max (null) is not
// an error here; the server rejects it with guidance to sync first.
export function validateMemberRange(member, max) {
  const offset = Number(member.offset)
  const length = Number(member.length)
  if (!Number.isInteger(offset) || offset < 0) return 'Start must be 0 or higher'
  if (!Number.isInteger(length) || length < 1) return 'Range must cover at least 1 LED'
  if (max == null) return null
  if (offset + length > max) {
    return `Range ${offset} to ${offset + length - 1} exceeds the device max of ${max} LEDs`
  }
  return null
}
