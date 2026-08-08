import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'
import { sendDeviceCommand, listDevices } from './deviceService.js'

// ─── Group CRUD ──────────────────────────────────────────────────────────────

export function listGroups() {
  const db = getDb()
  const groups = db.prepare(`
    SELECT id, name, type, color, sort_order, spotify_sync_enabled, weather_sync_enabled, created_at
    FROM groups
    ORDER BY sort_order ASC, created_at DESC
  `).all()

  const memberStmt = db.prepare('SELECT device_id FROM group_members WHERE group_id = ?')
  const childStmt  = db.prepare('SELECT child_group_id FROM group_children WHERE parent_group_id = ?')

  return groups.map(g => ({
    ...g,
    device_ids: memberStmt.all(g.id).map(m => m.device_id),
    child_group_ids: childStmt.all(g.id).map(c => c.child_group_id),
  }))
}

export function getGroup(id) {
  const db = getDb()
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id)
  if (!group) return null

  const device_ids = db.prepare('SELECT device_id FROM group_members WHERE group_id = ?')
    .all(id).map(m => m.device_id)
  const child_group_ids = db.prepare('SELECT child_group_id FROM group_children WHERE parent_group_id = ?')
    .all(id).map(c => c.child_group_id)

  return { ...group, device_ids, child_group_ids }
}

export function createGroup({ name, type = 'custom', color = '#8b5cf6', device_ids = [], child_group_ids = [] }) {
  const db = getDb()
  const id = uuidv4()

  const maxOrder = db.prepare('SELECT MAX(sort_order) AS max FROM groups').get()?.max ?? -1
  const sort_order = maxOrder + 1

  db.transaction(() => {
    db.prepare(`
      INSERT INTO groups (id, name, type, color, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, type, color, sort_order)

    const addMember = db.prepare('INSERT INTO group_members (group_id, device_id) VALUES (?, ?)')
    for (const devId of device_ids) {
      addMember.run(id, devId)
    }

    const addChild = db.prepare('INSERT INTO group_children (parent_group_id, child_group_id) VALUES (?, ?)')
    for (const childId of child_group_ids) {
      if (childId !== id) {
        addChild.run(id, childId)
      }
    }
  })()

  return getGroup(id)
}

export function updateGroup(id, { name, type, color, sort_order, spotify_sync_enabled, weather_sync_enabled, device_ids, child_group_ids }) {
  const db = getDb()
  const existing = getGroup(id)
  if (!existing) return null

  db.transaction(() => {
    if (name !== undefined || type !== undefined || color !== undefined || sort_order !== undefined || spotify_sync_enabled !== undefined || weather_sync_enabled !== undefined) {
      db.prepare(`
        UPDATE groups SET
          name       = COALESCE(?, name),
          type       = COALESCE(?, type),
          color      = COALESCE(?, color),
          sort_order = COALESCE(?, sort_order),
          spotify_sync_enabled = COALESCE(?, spotify_sync_enabled),
          weather_sync_enabled = COALESCE(?, weather_sync_enabled)
        WHERE id = ?
      `).run(
        name ?? null,
        type ?? null,
        color ?? null,
        sort_order ?? null,
        spotify_sync_enabled ?? null,
        weather_sync_enabled ?? null,
        id
      )
    }

    if (Array.isArray(device_ids)) {
      db.prepare('DELETE FROM group_members WHERE group_id = ?').run(id)
      const addMember = db.prepare('INSERT INTO group_members (group_id, device_id) VALUES (?, ?)')
      for (const devId of device_ids) {
        addMember.run(id, devId)
      }
    }

    if (Array.isArray(child_group_ids)) {
      db.prepare('DELETE FROM group_children WHERE parent_group_id = ?').run(id)
      const addChild = db.prepare('INSERT INTO group_children (parent_group_id, child_group_id) VALUES (?, ?)')
      for (const childId of child_group_ids) {
        if (childId !== id) {
          addChild.run(id, childId)
        }
      }
    }
  })()

  return getGroup(id)
}

export function deleteGroup(id) {
  const db = getDb()
  return db.prepare('DELETE FROM groups WHERE id = ?').run(id).changes > 0
}

export function reorderGroups(orderedIds) {
  const db = getDb()
  const stmt = db.prepare('UPDATE groups SET sort_order = ? WHERE id = ?')
  db.transaction(() => {
    orderedIds.forEach((id, index) => {
      stmt.run(index, id)
    })
  })()
}

// ─── Group Command Execution ──────────────────────────────────────────────────

/**
 * Resolves all device IDs belonging to a group recursively (including child groups).
 */
export function resolveGroupDeviceIds(groupId, visited = new Set()) {
  if (visited.has(groupId)) return []
  visited.add(groupId)

  const db = getDb()
  const directDevices = db.prepare('SELECT device_id FROM group_members WHERE group_id = ?')
    .all(groupId).map(m => m.device_id)

  const childGroups = db.prepare('SELECT child_group_id FROM group_children WHERE parent_group_id = ?')
    .all(groupId).map(c => c.child_group_id)

  const childDeviceIds = childGroups.flatMap(cgId => resolveGroupDeviceIds(cgId, visited))

  return [...new Set([...directDevices, ...childDeviceIds])]
}

/**
 * Sends a command payload to all devices in the target group concurrently.
 */
export async function sendGroupCommand(groupId, payload) {
  const deviceIds = resolveGroupDeviceIds(groupId)
  const allDevices = listDevices()
  const targetDevices = allDevices.filter(d => deviceIds.includes(d.id) && d.is_online === 1)

  if (targetDevices.length === 0) {
    return { ok: true, count: 0, results: [] }
  }

  const results = await Promise.all(
    targetDevices.map(device => sendDeviceCommand(device, payload))
  )

  return {
    ok: results.every(r => r.ok),
    count: targetDevices.length,
    results,
  }
}
