import { v4 as uuidv4 } from 'uuid'
import SunCalc from 'suncalc'
import { getDb } from '../db/database.js'
import { sendDeviceCommand, listDevices, getDevice } from './deviceService.js'
import { sendGroupCommand, getGroup } from './groupService.js'

let schedulerTimer = null

// ─── Schedules CRUD ───────────────────────────────────────────────────────────

export function listSchedules() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT id, name, trigger_type, trigger_value, target_type, target_id, payload_json, enabled, last_run_at, created_at
    FROM schedules
    ORDER BY created_at DESC
  `).all()

  return rows.map(r => ({
    ...r,
    enabled: r.enabled === 1,
    payload: JSON.parse(r.payload_json || '{}'),
  }))
}

export function getSchedule(id) {
  const db = getDb()
  const r = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id)
  if (!r) return null
  return {
    ...r,
    enabled: r.enabled === 1,
    payload: JSON.parse(r.payload_json || '{}'),
  }
}

export function createSchedule({
  name,
  trigger_type = 'time',
  trigger_value = '12:00',
  target_type = 'device',
  target_id,
  payload = {},
  enabled = true,
}) {
  const db = getDb()
  const id = uuidv4()

  db.prepare(`
    INSERT INTO schedules (
      id, name, trigger_type, trigger_config, trigger_value,
      action_type, action_config, target_type, target_id,
      payload_json, enabled, is_enabled
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    trigger_type,
    trigger_value,
    trigger_value,
    'device_state',
    JSON.stringify(payload),
    target_type,
    target_id,
    JSON.stringify(payload),
    enabled ? 1 : 0,
    enabled ? 1 : 0
  )

  return getSchedule(id)
}

export function updateSchedule(id, data) {
  const db = getDb()
  const existing = getSchedule(id)
  if (!existing) return null

  const name          = data.name ?? existing.name
  const trigger_type  = data.trigger_type ?? existing.trigger_type
  const trigger_value = data.trigger_value ?? existing.trigger_value
  const target_type   = data.target_type ?? existing.target_type
  const target_id     = data.target_id ?? existing.target_id
  const payload       = data.payload ? JSON.stringify(data.payload) : existing.payload_json
  const enabled       = data.enabled !== undefined ? (data.enabled ? 1 : 0) : (existing.enabled ? 1 : 0)

  db.prepare(`
    UPDATE schedules SET
      name          = ?,
      trigger_type  = ?,
      trigger_value = ?,
      target_type   = ?,
      target_id     = ?,
      payload_json  = ?,
      enabled       = ?
    WHERE id = ?
  `).run(name, trigger_type, trigger_value, target_type, target_id, payload, enabled, id)

  return getSchedule(id)
}

export function deleteSchedule(id) {
  const db = getDb()
  return db.prepare('DELETE FROM schedules WHERE id = ?').run(id).changes > 0
}

export async function executeScheduleAction(schedule) {
  const { target_type, target_id, payload } = schedule

  if (target_type === 'device') {
    const device = getDevice(target_id)
    if (device) await sendDeviceCommand(device, payload)
  } else if (target_type === 'group') {
    const group = getGroup(target_id)
    if (group) await sendGroupCommand(group.id, payload)
  } else if (target_type === 'routine') {
    await executeRoutineNow(target_id)
  }

  // Update last_run_at timestamp
  getDb().prepare(`
    UPDATE schedules SET last_run_at = datetime('now') WHERE id = ?
  `).run(schedule.id)
}

// ─── Routines CRUD ────────────────────────────────────────────────────────────

export function listRoutines() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT id, name, description, steps_json, enabled, created_at
    FROM routines
    ORDER BY created_at DESC
  `).all()

  return rows.map(r => ({
    ...r,
    enabled: r.enabled === 1,
    steps: JSON.parse(r.steps_json || '[]'),
  }))
}

export function getRoutine(id) {
  const db = getDb()
  const r = db.prepare('SELECT * FROM routines WHERE id = ?').get(id)
  if (!r) return null
  return {
    ...r,
    enabled: r.enabled === 1,
    steps: JSON.parse(r.steps_json || '[]'),
  }
}

export function createRoutine({ name, description = '', steps = [], enabled = true }) {
  const db = getDb()
  const id = uuidv4()

  db.prepare(`
    INSERT INTO routines (id, name, description, steps_json, enabled)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, description, JSON.stringify(steps), enabled ? 1 : 0)

  return getRoutine(id)
}

export function updateRoutine(id, data) {
  const db = getDb()
  const existing = getRoutine(id)
  if (!existing) return null

  const name        = data.name ?? existing.name
  const description = data.description ?? existing.description
  const steps       = data.steps ? JSON.stringify(data.steps) : existing.steps_json
  const enabled     = data.enabled !== undefined ? (data.enabled ? 1 : 0) : (existing.enabled ? 1 : 0)

  db.prepare(`
    UPDATE routines SET
      name        = ?,
      description = ?,
      steps_json  = ?,
      enabled     = ?
    WHERE id = ?
  `).run(name, description, steps, enabled, id)

  return getRoutine(id)
}

export function deleteRoutine(id) {
  const db = getDb()
  return db.prepare('DELETE FROM routines WHERE id = ?').run(id).changes > 0
}

/**
 * Execute routine step timeline sequentially with delays.
 * Step structure: { target_type: 'device'|'group', target_id: string, payload: object, delay_ms: number }
 */
export async function executeRoutineNow(routineId) {
  const routine = getRoutine(routineId)
  if (!routine || !routine.enabled) return

  for (const step of routine.steps) {
    if (step.delay_ms && step.delay_ms > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.min(step.delay_ms, 60000)))
    }

    if (step.target_type === 'device') {
      const device = getDevice(step.target_id)
      if (device) await sendDeviceCommand(device, step.payload || {})
    } else if (step.target_type === 'group') {
      const group = getGroup(step.target_id)
      if (group) await sendGroupCommand(group.id, step.payload || {})
    }
  }
}

export function getSunTimes(lat, lng) {
  const db = getDb()
  const dbLat = lat ?? parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('latitude')?.value ?? '37.7749')
  const dbLng = lng ?? parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('longitude')?.value ?? '-122.4194')

  const finalLat = isNaN(dbLat) ? 37.7749 : dbLat
  const finalLng = isNaN(dbLng) ? -122.4194 : dbLng

  const times = SunCalc.getTimes(new Date(), finalLat, finalLng)
  const formatTime = (d) => {
    if (!d || isNaN(d.getTime())) return '--:--'
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  return {
    sunrise: formatTime(times.sunrise),
    sunset: formatTime(times.sunset),
    dusk: formatTime(times.dusk),
    dawn: formatTime(times.dawn),
    latitude: finalLat,
    longitude: finalLng,
  }
}

// ─── Scheduler Loop ───────────────────────────────────────────────────────────

export function startAutomationScheduler() {
  if (schedulerTimer) return

  async function checkSchedules() {
    const now = new Date()
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const db = getDb()
    const lat = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('latitude')?.value ?? '37.7749')
    const lng = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('longitude')?.value ?? '-122.4194')

    const sunTimes = getSunTimes(lat, lng)

    const activeSchedules = listSchedules().filter(s => s.enabled)

    for (const schedule of activeSchedules) {
      let targetTime = null

      if (schedule.trigger_type === 'time') {
        targetTime = schedule.trigger_value
      } else if (schedule.trigger_type === 'sunrise') {
        targetTime = sunTimes.sunrise
      } else if (schedule.trigger_type === 'sunset') {
        targetTime = sunTimes.sunset
      }

      if (targetTime === currentHHMM) {
        // Prevent multiple triggers within the same minute
        const lastRunMinute = schedule.last_run_at
          ? schedule.last_run_at.slice(0, 16)
          : null
        const currentMinuteIso = now.toISOString().slice(0, 16)

        if (lastRunMinute !== currentMinuteIso) {
          console.log(`[automation] Triggering schedule: "${schedule.name}" (${schedule.trigger_type} @ ${targetTime})`)
          executeScheduleAction(schedule).catch(err => {
            console.error(`[automation] Schedule execution error: ${err.message}`)
          })
        }
      }
    }
  }

  schedulerTimer = setInterval(checkSchedules, 30000)
  console.log('[automation] Automation scheduler started (30s interval)')
}

export function stopAutomationScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
}
