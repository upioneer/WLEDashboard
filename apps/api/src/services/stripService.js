import { v4 as uuid } from 'uuid'
import { getDb } from '../db/database.js'
import { getDevice } from './deviceService.js'
import { STRIP_PATTERN_IDS } from './stripPatterns.js'

export const STRIP_MAX_LEDS = 1500
export const STRIP_MAX_MEMBERS = 8

function parseJson(raw, fallback) {
  try {
    const v = JSON.parse(raw)
    return v ?? fallback
  } catch {
    return fallback
  }
}

function toStrip(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    members: parseJson(row.members_json, []),
    total_leds: row.total_leds,
    fallback: parseJson(row.fallback_json, {}),
    last_play: parseJson(row.last_play_json, null),
    auto_resume: row.auto_resume === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function validateMembers(members) {
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error('A strip needs at least one member')
  }
  if (members.length > STRIP_MAX_MEMBERS) {
    throw new Error(`A strip holds at most ${STRIP_MAX_MEMBERS} members`)
  }
  const seen = new Set()
  let total = 0
  const clean = members.map((m, i) => {
    const device_id = m?.device_id
    const offset = m?.offset ?? 0
    const length = m?.length
    if (typeof device_id !== 'string' || !device_id) {
      throw new Error(`Member ${i}: device_id is required`)
    }
    if (seen.has(device_id)) {
      throw new Error(`Member ${i}: device listed twice; split ranges instead`)
    }
    seen.add(device_id)
    const device = getDevice(device_id)
    if (!device) {
      throw new Error(`Member ${i}: unknown device`)
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error(`Member ${i}: offset must be a non-negative integer`)
    }
    if (!Number.isInteger(length) || length < 1) {
      throw new Error(`Member ${i}: length must be a positive integer`)
    }
    const max = Number(device.led_count)
    if (!Number.isInteger(max) || max < 1) {
      throw new Error(`Member ${i} (${device.name}): LED count unknown; sync the device or set its LED count first`)
    }
    if (offset + length > max) {
      throw new Error(`Member ${i} (${device.name}): range ${offset} to ${offset + length - 1} exceeds the device max of ${max} LEDs`)
    }
    total += length
    return { device_id, offset, length, reverse: m?.reverse === true }
  })
  if (total > STRIP_MAX_LEDS) {
    throw new Error(`Strip holds ${total} LEDs, limit is ${STRIP_MAX_LEDS}`)
  }
  return { members: clean, total }
}

export function validatePattern(pattern) {
  if (!STRIP_PATTERN_IDS.includes(pattern)) {
    throw new Error(`Unknown pattern "${pattern}"`)
  }
  return pattern
}

export function listStrips() {
  const db = getDb()
  return db.prepare('SELECT * FROM virtual_strips ORDER BY name').all().map(toStrip)
}

export function getStrip(id) {
  const db = getDb()
  return toStrip(db.prepare('SELECT * FROM virtual_strips WHERE id = ?').get(id))
}

export function createStrip({ name, members, auto_resume = false }) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Strip name is required')
  }
  const { members: clean, total } = validateMembers(members)
  const db = getDb()
  const id = uuid()
  db.prepare(
    'INSERT INTO virtual_strips (id, name, members_json, total_leds, auto_resume) VALUES (?, ?, ?, ?, ?)',
  ).run(id, name.trim(), JSON.stringify(clean), total, auto_resume ? 1 : 0)
  return getStrip(id)
}

export function updateStrip(id, fields) {
  const db = getDb()
  const existing = getStrip(id)
  if (!existing) return null
  const sets = []
  const vals = []
  if (fields.name !== undefined) {
    if (typeof fields.name !== 'string' || !fields.name.trim()) {
      throw new Error('Strip name is required')
    }
    sets.push('name = ?')
    vals.push(fields.name.trim())
  }
  if (fields.members !== undefined) {
    const { members: clean, total } = validateMembers(fields.members)
    sets.push('members_json = ?', 'total_leds = ?')
    vals.push(JSON.stringify(clean), total)
  }
  if (fields.auto_resume !== undefined) {
    sets.push('auto_resume = ?')
    vals.push(fields.auto_resume ? 1 : 0)
  }
  if (fields.fallback !== undefined) {
    sets.push('fallback_json = ?')
    vals.push(JSON.stringify(fields.fallback ?? {}))
  }
  if (sets.length === 0) return existing
  sets.push("updated_at = datetime('now')")
  db.prepare(`UPDATE virtual_strips SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id)
  return getStrip(id)
}

export function deleteStrip(id) {
  const db = getDb()
  db.prepare('DELETE FROM virtual_strips WHERE id = ?').run(id)
}

export function saveLastPlay(id, play) {
  const db = getDb()
  db.prepare('UPDATE virtual_strips SET last_play_json = ? WHERE id = ?').run(JSON.stringify(play), id)
}
