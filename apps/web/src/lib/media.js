// Microphone capability probing and failure copy for the Studio audio
// visualizer. Kept DOM-free so the rules stay unit testable; callers pass
// the live globals (window.isSecureContext, navigator.mediaDevices).

export function checkMicrophoneSupport(env = {}) {
  const { isSecureContext = false, mediaDevices } = env
  if (!isSecureContext) {
    return {
      supported: false,
      reason: 'insecure-context',
      message: 'Microphone capture needs a secure context (HTTPS or localhost). Serve the dashboard over HTTPS to enable it.',
    }
  }
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
    return {
      supported: false,
      reason: 'no-api',
      message: 'This browser does not expose microphone capture (navigator.mediaDevices is unavailable).',
    }
  }
  return { supported: true, reason: null, message: '' }
}

export function describeMicError(err) {
  const name = err?.name || ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone permission was denied. Allow microphone access in the browser address bar and try again.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone was found. Connect an input device and try again.'
    case 'NotReadableError':
      return 'The microphone is in use by another application. Close it and try again.'
    case 'AbortError':
      return 'The microphone request was aborted before it completed.'
    default:
      return err?.message ? `Could not access the microphone: ${err.message}` : 'Could not access the microphone.'
  }
}
