/**
 * API client for WLEDashboard backend.
 * All WLED calls are proxied through /api — the frontend never talks directly
 * to device IPs.
 */

const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error ?? res.statusText), { status: res.status, data: err })
  }

  if (res.status === 204) return null
  return res.json()
}

// ─── Devices ──────────────────────────────────────────────────────────────────
export const devicesApi = {
  list: () => request('GET', '/devices'),
  get: (id) => request('GET', `/devices/${id}`),
  create: (data) => request('POST', '/devices', data),
  update: (id, data) => request('PATCH', `/devices/${id}`, data),
  delete: (id) => request('DELETE', `/devices/${id}`),
  reorder: (ids) => request('POST', '/devices/reorder', { ids }),
  command: (id, payload) => request('POST', `/devices/${id}/command`, payload),
  state: (id) => request('GET', `/devices/${id}/state`),
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => request('GET', '/settings'),
  update: (data) => request('PATCH', '/settings', data),
}

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => request('GET', '/health'),
}
