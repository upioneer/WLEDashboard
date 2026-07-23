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

// ─── Groups ───────────────────────────────────────────────────────────────────
export const groupsApi = {
  list: () => request('GET', '/groups'),
  get: (id) => request('GET', `/groups/${id}`),
  create: (data) => request('POST', '/groups', data),
  update: (id, data) => request('PATCH', `/groups/${id}`, data),
  delete: (id) => request('DELETE', `/groups/${id}`),
  reorder: (ids) => request('POST', '/groups/reorder', { ids }),
  command: (id, payload) => request('POST', `/groups/${id}/command`, payload),
}

// ─── Config (Export/Import) ───────────────────────────────────────────────────
export const configApi = {
  export: () => request('GET', '/config/export'),
  import: (data, mode = 'merge') => request('POST', '/config/import', { data, mode }),
}

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => request('GET', '/health'),
}
