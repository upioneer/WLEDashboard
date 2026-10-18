// Browser geolocation capability probing and failure copy for the Settings
// Auto-Detect Location button. Mirrors lib/media.js: DOM-free and unit
// testable; callers pass the live globals (window.isSecureContext,
// navigator.geolocation).

export function checkGeolocationSupport(env = {}) {
  const { isSecureContext = false, geolocation } = env
  if (!isSecureContext) {
    return {
      supported: false,
      reason: 'insecure-context',
      message: 'Location auto-detect needs a secure context (HTTPS or localhost). Serve the dashboard over HTTPS to enable it, or enter coordinates manually.',
    }
  }
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    return {
      supported: false,
      reason: 'no-api',
      message: 'This browser does not expose geolocation (navigator.geolocation is unavailable). Enter coordinates manually.',
    }
  }
  return { supported: true, reason: null, message: '' }
}

export function describeGeoError(err) {
  const code = err?.code
  if (code === 1) {
    return 'Location permission was denied. Allow location access in the browser address bar, or serve the dashboard over HTTPS, and try again.'
  }
  if (code === 2) {
    return 'The current position is unavailable. Check the device location signal and try again.'
  }
  if (code === 3) {
    return 'Detecting the location timed out. Try again.'
  }
  return err?.message ? `Location error: ${err.message}` : 'Could not detect the location.'
}
