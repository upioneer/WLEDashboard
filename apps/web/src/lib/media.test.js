import test from 'node:test'
import assert from 'node:assert/strict'
import { checkMicrophoneSupport, describeMicError } from './media.js'

test('checkMicrophoneSupport passes with secure context and getUserMedia', () => {
  const out = checkMicrophoneSupport({ isSecureContext: true, mediaDevices: { getUserMedia: async () => ({}) } })
  assert.equal(out.supported, true)
  assert.equal(out.reason, null)
})

test('checkMicrophoneSupport fails closed on insecure context', () => {
  const out = checkMicrophoneSupport({ isSecureContext: false, mediaDevices: { getUserMedia: async () => ({}) } })
  assert.equal(out.supported, false)
  assert.equal(out.reason, 'insecure-context')
  assert.match(out.message, /HTTPS/i)
})

test('checkMicrophoneSupport fails closed when the API is missing', () => {
  for (const mediaDevices of [undefined, null, {}]) {
    const out = checkMicrophoneSupport({ isSecureContext: true, mediaDevices })
    assert.equal(out.supported, false)
    assert.equal(out.reason, 'no-api')
  }
})

test('checkMicrophoneSupport fails closed with no environment', () => {
  assert.equal(checkMicrophoneSupport().supported, false)
  assert.equal(checkMicrophoneSupport({}).supported, false)
})

test('describeMicError maps denial, missing device, and busy states', () => {
  assert.match(describeMicError({ name: 'NotAllowedError' }), /denied/i)
  assert.match(describeMicError({ name: 'SecurityError' }), /denied/i)
  assert.match(describeMicError({ name: 'NotFoundError' }), /No microphone/i)
  assert.match(describeMicError({ name: 'NotReadableError' }), /in use/i)
})

test('describeMicError falls back to the raw message', () => {
  assert.match(describeMicError({ name: 'TypeError', message: 'boom' }), /boom/)
  assert.match(describeMicError(undefined), /Could not access/)
})
