import { getDb } from '../db/database.js'

/**
 * Export full system configuration as JSON object.
 */
export function exportConfig() {
  const db = getDb()

  const devices       = db.prepare('SELECT * FROM devices').all()
  const groups        = db.prepare('SELECT * FROM groups').all()
  const group_members = db.prepare('SELECT * FROM group_members').all()
  const group_children= db.prepare('SELECT * FROM group_children').all()
  const settings      = db.prepare('SELECT * FROM settings').all()
  const presets       = db.prepare('SELECT * FROM presets').all()

  return {
    version: '0.2.0',
    exported_at: new Date().toISOString(),
    data: {
      devices,
      groups,
      group_members,
      group_children,
      settings,
      presets,
    },
  }
}

/**
 * Import configuration into database.
 * Mode: 'replace' (clears tables first) or 'merge' (upserts into existing).
 */
export function importConfig(configObj, mode = 'merge') {
  if (!configObj || typeof configObj !== 'object' || !configObj.data) {
    throw new Error('Invalid backup format')
  }

  const db = getDb()
  const { devices = [], groups = [], group_members = [], group_children = [], settings = [], presets = [] } = configObj.data

  db.transaction(() => {
    if (mode === 'replace') {
      db.prepare('DELETE FROM group_children').run()
      db.prepare('DELETE FROM group_members').run()
      db.prepare('DELETE FROM presets').run()
      db.prepare('DELETE FROM groups').run()
      db.prepare('DELETE FROM devices').run()
      db.prepare('DELETE FROM settings').run()
    }

    // Devices
    const devStmt = db.prepare(`
      INSERT OR REPLACE INTO devices (id, name, ip_address, mac_address, firmware_ver, led_count, is_online, sort_order)
      VALUES (@id, @name, @ip_address, @mac_address, @firmware_ver, @led_count, COALESCE(@is_online, 1), COALESCE(@sort_order, 0))
    `)
    for (const d of devices) {
      devStmt.run(d)
    }

    // Groups
    const groupStmt = db.prepare(`
      INSERT OR REPLACE INTO groups (id, name, type, color, sort_order)
      VALUES (@id, @name, @type, @color, COALESCE(@sort_order, 0))
    `)
    for (const g of groups) {
      groupStmt.run(g)
    }

    // Group Members
    const memberStmt = db.prepare(`
      INSERT OR IGNORE INTO group_members (group_id, device_id)
      VALUES (@group_id, @device_id)
    `)
    for (const m of group_members) {
      memberStmt.run(m)
    }

    // Group Children
    const childStmt = db.prepare(`
      INSERT OR IGNORE INTO group_children (parent_group_id, child_group_id)
      VALUES (@parent_group_id, @child_group_id)
    `)
    for (const c of group_children) {
      childStmt.run(c)
    }

    // Settings
    const settingStmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value)
      VALUES (@key, @value)
    `)
    for (const s of settings) {
      settingStmt.run(s)
    }

    // Presets
    const presetStmt = db.prepare(`
      INSERT OR REPLACE INTO presets (id, name, group_id, state_json)
      VALUES (@id, @name, @group_id, @state_json)
    `)
    for (const p of presets) {
      presetStmt.run(p)
    }
  })()

  return {
    ok: true,
    stats: {
      devices: devices.length,
      groups: groups.length,
      settings: settings.length,
      presets: presets.length,
    },
  }
}
