/**
 * API client for WLEDashboard backend.
 * All WLED calls are proxied through /api — the frontend never talks directly
 * to device IPs.
 */

const BASE = '/api'

async function request(method, path, body) {
  const isFormData = body instanceof FormData
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: isFormData ? undefined : (body ? { 'Content-Type': 'application/json' } : undefined),
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
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
  uploadFirmware: (id, formData) => request('POST', `/devices/${id}/firmware`, formData),
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

// ─── Automation (Schedules & Routines) ────────────────────────────────────────
export const automationApi = {
  listSchedules: () => request('GET', '/automation/schedules'),
  createSchedule: (data) => request('POST', '/automation/schedules', data),
  updateSchedule: (id, data) => request('PATCH', `/automation/schedules/${id}`, data),
  deleteSchedule: (id) => request('DELETE', `/automation/schedules/${id}`),
  triggerSchedule: (id) => request('POST', `/automation/schedules/${id}/trigger`),

  listRoutines: () => request('GET', '/automation/routines'),
  createRoutine: (data) => request('POST', '/automation/routines', data),
  updateRoutine: (id, data) => request('PATCH', `/automation/routines/${id}`, data),
  deleteRoutine: (id) => request('DELETE', `/automation/routines/${id}`),
  executeRoutine: (id) => request('POST', `/automation/routines/${id}/execute`),

  getSunTimes: () => request('GET', '/automation/suntimes'),
}

// ─── Spatial ──────────────────────────────────────────────────────────────────
export const spatialApi = {
  getHierarchy: () => request('GET', '/spatial/hierarchy'),
  createDwelling: (data) => request('POST', '/spatial/dwellings', data),
  createFloor: (data) => request('POST', '/spatial/floors', data),
  createRoom: (data) => request('POST', '/spatial/rooms', data),
  updateRoom: (id, data) => request('PATCH', `/spatial/rooms/${id}`, data),
  deleteRoom: (id) => request('DELETE', `/spatial/rooms/${id}`),
  createAnchor: (data) => request('POST', '/spatial/anchors', data),
  updateAnchor: (id, data) => request('PATCH', `/spatial/anchors/${id}`, data),
  deleteAnchor: (id) => request('DELETE', `/spatial/anchors/${id}`),
}

// ─── Studio ───────────────────────────────────────────────────────────────────
export const studioApi = {
  getEffects: () => request('GET', '/studio/effects'),
  getPaletteCatalog: () => request('GET', '/studio/palettes/catalog'),
  listAnimations: () => request('GET', '/studio/animations'),
  createAnimation: (data) => request('POST', '/studio/animations', data),
  updateAnimation: (id, data) => request('PATCH', `/studio/animations/${id}`, data),
  deleteAnimation: (id) => request('DELETE', `/studio/animations/${id}`),
  listPalettes: () => request('GET', '/studio/palettes'),
  createPalette: (data) => request('POST', '/studio/palettes', data),
  deletePalette: (id) => request('DELETE', `/studio/palettes/${id}`),
}

// ─── MQTT ─────────────────────────────────────────────────────────────────────
export const mqttApi = {
  getStatus: () => request('GET', '/mqtt/status'),
  configure: (data) => request('POST', '/mqtt/configure', data),
  publishDiscovery: () => request('POST', '/mqtt/discover'),
}

// ─── Audio ────────────────────────────────────────────────────────────────────
export const audioApi = {
  streamDdp: (data) => request('POST', '/audio/stream-ddp', data),
}

// ─── Matrix ───────────────────────────────────────────────────────────────────
export const matrixApi = {
  listConfigs: () => request('GET', '/matrix/configs'),
  createConfig: (data) => request('POST', '/matrix/configs', data),
  deleteConfig: (id) => request('DELETE', `/matrix/configs/${id}`),
  listDrawings: () => request('GET', '/matrix/drawings'),
  saveDrawing: (data) => request('POST', '/matrix/drawings', data),
  deleteDrawing: (id) => request('DELETE', `/matrix/drawings/${id}`),
}

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => request('GET', '/health'),
}
