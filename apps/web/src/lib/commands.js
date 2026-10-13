/**
 * Command plumbing shared by the device and group stores.
 *
 * Rapid control input fires concurrent requests whose responses can land
 * out of order. Per-device sequence numbers let callers drop stale
 * responses instead of merging old state over new. The fetch wrapper
 * bounds hung requests so optimistic updates always settle.
 */

const deviceSeq = new Map()

export function nextCommandSeq(deviceId) {
  const next = (deviceSeq.get(deviceId) ?? 0) + 1
  deviceSeq.set(deviceId, next)
  return next
}

export function isStaleResponse(deviceId, seq) {
  return seq < (deviceSeq.get(deviceId) ?? 0)
}

export function resetCommandSeq(deviceId) {
  if (deviceId === undefined) {
    deviceSeq.clear()
    return
  }
  deviceSeq.delete(deviceId)
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Convert a captured liveState snapshot back into a WLED command payload.
 * Only restorable keys survive: dashboardside metadata (info, _ts,
 * _misses, _offline) is stripped. Returns null when there is nothing
 * worth restoring.
 */
export function snapshotToCommand(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null
  const cmd = {}
  if (snapshot.on !== undefined) cmd.on = snapshot.on
  if (snapshot.bri !== undefined) cmd.bri = snapshot.bri
  if (Array.isArray(snapshot.seg)) cmd.seg = snapshot.seg.map((s) => ({ ...s }))
  if (Object.keys(cmd).length === 0) return null
  return cmd
}
