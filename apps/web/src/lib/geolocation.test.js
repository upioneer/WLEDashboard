import test from 'node:test'
import assert from 'node:assert/strict'
import { checkGeolocationSupport, describeGeoError } from './geolocation.js'

test('checkGeolocationSupport passes with secure context and geolocation', () => {
  const out = checkGeolocationSupport({ isSecureContext: true, geolocation: { getCurrentPosition: () => {} } })
  assert.equal(out.supported, true)
  assert.equal(out.reason, null)
})

test('checkGeolocationSupport fails closed on insecure context', () => {
  const out = checkGeolocationSupport({ isSecureContext: false, geolocation: { getCurrentPosition: () => {} } })
  assert.equal(out.supported, false)
  assert.equal(out.reason, 'insecure-context')
  assert.match(out.message, /HTTPS/i)
})

test('checkGeolocationSupport fails closed when the API is missing', () => {
  for (const geolocation of [undefined, null, {}]) {
    const out = checkGeolocationSupport({ isSecureContext: true, geolocation })
    assert.equal(out.supported, false)
    assert.equal(out.reason, 'no-api')
  }
})

test('checkGeolocationSupport fails closed with no environment', () => {
  assert.equal(checkGeolocationSupport().supported, false)
  assert.equal(checkGeolocationSupport({}).supported, false)
})

test('describeGeoError maps denial, unavailable, and timeout codes', () => {
  assert.match(describeGeoError({ code: 1, message: 'Only secure origins are allowed' }), /denied/i)
  assert.match(describeGeoError({ code: 2 }), /unavailable/i)
  assert.match(describeGeoError({ code: 3 }), /timed out/i)
})

test('describeGeoError falls back to the raw message', () => {
  assert.match(describeGeoError({ message: 'boom' }), /boom/)
  assert.match(describeGeoError(undefined), /Could not detect/)
})
