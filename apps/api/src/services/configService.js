import { getDb } from '../db/database.js'

// Current schema version identifier -- update this when new tables or columns are added.
const BACKUP_SCHEMA_VERSION = '0.24.0'

/**
 * Selective restore categories. Each category maps to the SQLite tables it owns.
 * Together they cover all 17 backup tables exactly once.
 */
export const BACKUP_CATEGORIES = {
  devices:     { label: 'Devices', tables: ['devices'] },
  groups:      { label: 'Groups', tables: ['groups', 'group_members', 'group_children'] },
  presets:     { label: 'Presets', tables: ['presets'] },
  settings:    { label: 'Settings', tables: ['settings'] },
  automations: { label: 'Routines and automations', tables: ['schedules', 'routines', 'routine_steps'] },
  spatial:     { label: 'Spatial layouts', tables: ['dwellings', 'floors', 'rooms', 'anchors'] },
  studio:      { label: 'Studio palettes and timelines', tables: ['animations', 'palettes', 'matrices', 'matrix_drawings', 'studio_objects'] },
}

const CATEGORY_KEYS = Object.keys(BACKUP_CATEGORIES)

/** FK-safe table deletion order (children before parents). */
const DELETE_ORDER = [
  'matrix_drawings', 'matrices', 'animations', 'palettes', 'studio_objects',
  'routine_steps', 'routines', 'schedules',
  'anchors', 'rooms', 'floors', 'dwellings',
  'presets', 'group_children', 'group_members', 'groups', 'devices',
]

function normalizeCategories(categories) {
  if (categories === undefined || categories === null) return null
  if (!Array.isArray(categories)) throw new Error('Invalid backup categories: expected an array.')
  const unknown = categories.filter((c) => !CATEGORY_KEYS.includes(c))
  if (unknown.length) throw new Error(`Unknown backup categories: ${unknown.join(', ')}.`)
  return new Set(categories)
}

function activeTablesFor(selected) {
  const tables = new Set()
  const keys = selected ?? CATEGORY_KEYS
  for (const key of keys) {
    for (const table of BACKUP_CATEGORIES[key].tables) tables.add(table)
  }
  return tables
}

function idUnion(backupRows, db, table) {
  const ids = new Set()
  for (const row of backupRows) {
    if (row && row.id) ids.add(row.id)
  }
  try {
    for (const row of db.prepare(`SELECT id FROM ${table}`).all()) ids.add(row.id)
  } catch (_) {}
  return ids
}

/**
 * Dependency graph validator for partial restores.
 * Drops child rows whose parents are absent from both the backup selection
 * and the surviving database state, and nulls optional foreign keys instead
 * of dropping the row. Returns filtered arrays plus skip counts and warnings.
 */
export function validateBackupReferences(data, db, clearedTables) {
  const skipped = {}
  const warnings = []
  const drop = (table, rows, keep) => {
    const kept = rows.filter(keep)
    const n = rows.length - kept.length
    if (n > 0) {
      skipped[table] = (skipped[table] ?? 0) + n
      warnings.push(`${n} ${table} row(s) skipped: parent reference missing from backup and database.`)
    }
    return kept
  }

  const survivingIds = (backupRows, table) => {
    const ids = new Set()
    for (const row of backupRows) {
      if (row && row.id) ids.add(row.id)
    }
    if (!clearedTables.has(table)) {
      for (const id of idUnion([], db, table)) ids.add(id)
    }
    return ids
  }

  const deviceIds = survivingIds(data.devices, 'devices')
  const groupIds = survivingIds(data.groups, 'groups')
  const routineIds = survivingIds(data.routines, 'routines')
  const dwellingIds = survivingIds(data.dwellings, 'dwellings')
  const floorIds = survivingIds(data.floors, 'floors')
  const roomIds = survivingIds(data.rooms, 'rooms')

  data.group_members = drop('group_members', data.group_members,
    (m) => m && groupIds.has(m.group_id) && deviceIds.has(m.device_id))
  data.group_children = drop('group_children', data.group_children,
    (c) => c && groupIds.has(c.parent_group_id) && groupIds.has(c.child_group_id))
  data.floors = drop('floors', data.floors, (f) => f && dwellingIds.has(f.dwelling_id))
  data.rooms = drop('rooms', data.rooms, (r) => r && floorIds.has(r.floor_id))
  data.anchors = drop('anchors', data.anchors, (a) => a && roomIds.has(a.room_id))
  data.routine_steps = drop('routine_steps', data.routine_steps,
    (s) => s && routineIds.has(s.routine_id))

  for (const a of data.anchors) {
    if (a && a.device_id && !deviceIds.has(a.device_id)) {
      a.device_id = null
      warnings.push(`Anchor "${a.name ?? a.id}" kept with device unlinked: device missing from backup and database.`)
    }
  }
  for (const p of data.presets) {
    if (p && p.group_id && !groupIds.has(p.group_id)) {
      p.group_id = null
      warnings.push(`Preset "${p.name ?? p.id}" kept with group unlinked: group missing from backup and database.`)
    }
  }
  for (const m of data.matrices) {
    if (m && m.device_id && !deviceIds.has(m.device_id)) {
      m.device_id = null
      warnings.push(`Matrix "${m.name ?? m.id}" kept with device unlinked: device missing from backup and database.`)
    }
  }

  return { skipped, warnings }
}

/**
 * Export full system configuration as JSON object.
 * Covers all user-editable SQLite tables introduced up to the current schema version.
 */
export function exportConfig() {
  const db = getDb()

  const devices        = db.prepare('SELECT * FROM devices').all()
  const groups         = db.prepare('SELECT * FROM groups').all()
  const group_members  = db.prepare('SELECT * FROM group_members').all()
  const group_children = db.prepare('SELECT * FROM group_children').all()
  const settings       = db.prepare('SELECT * FROM settings').all()
  const presets        = db.prepare('SELECT * FROM presets').all()
  const schedules      = db.prepare('SELECT * FROM schedules').all()
  const routines       = db.prepare('SELECT * FROM routines').all()
  const routine_steps  = db.prepare('SELECT * FROM routine_steps').all()
  const dwellings      = db.prepare('SELECT * FROM dwellings').all()
  const floors         = db.prepare('SELECT * FROM floors').all()
  const rooms          = db.prepare('SELECT * FROM rooms').all()
  const anchors        = db.prepare('SELECT * FROM anchors').all()
  const animations     = db.prepare('SELECT * FROM animations').all()
  const palettes       = db.prepare('SELECT * FROM palettes').all()
  const matrices       = db.prepare('SELECT * FROM matrices').all()
  const matrix_drawings = db.prepare('SELECT * FROM matrix_drawings').all()
  const studio_objects = db.prepare('SELECT * FROM studio_objects').all()

  return {
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    row_counts: {
      devices: devices.length,
      groups: groups.length,
      group_members: group_members.length,
      group_children: group_children.length,
      settings: settings.length,
      presets: presets.length,
      schedules: schedules.length,
      routines: routines.length,
      routine_steps: routine_steps.length,
      dwellings: dwellings.length,
      floors: floors.length,
      rooms: rooms.length,
      anchors: anchors.length,
      animations: animations.length,
      palettes: palettes.length,
      matrices: matrices.length,
      matrix_drawings: matrix_drawings.length,
      studio_objects: studio_objects.length,
    },
    data: {
      devices,
      groups,
      group_members,
      group_children,
      settings,
      presets,
      schedules,
      routines,
      routine_steps,
      dwellings,
      floors,
      rooms,
      anchors,
      animations,
      palettes,
      matrices,
      matrix_drawings,
      studio_objects,
    },
  }
}

/**
 * Import configuration into database.
 * Mode: 'replace' (clears user tables first) or 'merge' (upserts into existing).
 *
 * Tables that are read-only system tables (schema_version) are never modified.
 * Settings are always merged key-by-key to prevent wiping system-injected defaults.
 */
export function importConfig(configObj, mode = 'merge', options = {}) {
  if (!configObj || typeof configObj !== 'object' || !configObj.data) {
    throw new Error('Invalid backup format: missing data envelope.')
  }

  const selected = normalizeCategories(options?.categories)
  const active = activeTablesFor(selected)
  const clearedTables = mode === 'replace' ? new Set(active) : new Set()

  const db = getDb()

  let {
    devices        = [],
    groups         = [],
    group_members  = [],
    group_children = [],
    settings       = [],
    presets        = [],
    schedules      = [],
    routines       = [],
    routine_steps  = [],
    dwellings      = [],
    floors         = [],
    rooms          = [],
    anchors        = [],
    animations     = [],
    palettes       = [],
    matrices       = [],
    matrix_drawings = [],
    studio_objects = [],
  } = configObj.data

  // Selective restore: ignore tables outside the chosen categories.
  // groups, group_members, and group_children share one category.
  if (!active.has('devices')) devices = []
  if (!active.has('groups')) { groups = []; group_members = []; group_children = [] }
  if (!active.has('settings')) settings = []
  if (!active.has('presets')) presets = []
  if (!active.has('schedules')) schedules = []
  if (!active.has('routines')) routines = []
  if (!active.has('routine_steps')) routine_steps = []
  if (!active.has('dwellings')) dwellings = []
  if (!active.has('floors')) floors = []
  if (!active.has('rooms')) rooms = []
  if (!active.has('anchors')) anchors = []
  if (!active.has('animations')) animations = []
  if (!active.has('palettes')) palettes = []
  if (!active.has('matrices')) matrices = []
  if (!active.has('matrix_drawings')) matrix_drawings = []
  if (!active.has('studio_objects')) studio_objects = []

  const refData = {
    devices, groups, group_members, group_children, settings, presets,
    schedules, routines, routine_steps, dwellings, floors, rooms, anchors,
    animations, palettes, matrices, matrix_drawings, studio_objects,
  }
  const { skipped, warnings } = validateBackupReferences(refData, db, clearedTables)
  devices = refData.devices; groups = refData.groups
  group_members = refData.group_members; group_children = refData.group_children
  settings = refData.settings; presets = refData.presets
  schedules = refData.schedules; routines = refData.routines; routine_steps = refData.routine_steps
  dwellings = refData.dwellings; floors = refData.floors; rooms = refData.rooms; anchors = refData.anchors
  animations = refData.animations; palettes = refData.palettes
  matrices = refData.matrices; matrix_drawings = refData.matrix_drawings
  studio_objects = refData.studio_objects

  db.transaction(() => {
    if (mode === 'replace') {
      // Delete in FK-safe order (children before parents), scoped to selected tables.
      // Settings are never cleared: they always merge key-by-key below.
      for (const table of DELETE_ORDER) {
        if (active.has(table)) db.prepare(`DELETE FROM ${table}`).run()
      }
    }

    // ── Devices ───────────────────────────────────────────────────────────────
    const devStmt = db.prepare(`
      INSERT OR REPLACE INTO devices
        (id, name, ip_address, mac_address, firmware_ver, led_count, led_density,
         is_online, sort_order, spotify_sync_enabled, weather_sync_enabled,
         last_seen_at, created_at, updated_at)
      VALUES
        (@id, @name, @ip_address, @mac_address, @firmware_ver, @led_count, @led_density,
         @is_online, @sort_order, @spotify_sync_enabled, @weather_sync_enabled,
         @last_seen_at,
         COALESCE(@created_at, datetime('now')), COALESCE(@updated_at, datetime('now')))
    `)
    for (const d of devices) {
      if (!d || !d.id || !d.name || !d.ip_address) continue
      devStmt.run({
        id: d.id,
        name: d.name,
        ip_address: d.ip_address,
        mac_address: d.mac_address ?? null,
        firmware_ver: d.firmware_ver ?? null,
        led_count: d.led_count ?? null,
        led_density: d.led_density ?? 60,
        is_online: d.is_online ?? 1,
        sort_order: d.sort_order ?? 0,
        spotify_sync_enabled: d.spotify_sync_enabled ?? 0,
        weather_sync_enabled: d.weather_sync_enabled ?? 0,
        last_seen_at: d.last_seen_at ?? null,
        created_at: d.created_at ?? null,
        updated_at: d.updated_at ?? null,
      })
    }

    // ── Groups ────────────────────────────────────────────────────────────────
    const groupStmt = db.prepare(`
      INSERT OR REPLACE INTO groups
        (id, name, type, color, sort_order, spotify_sync_enabled, weather_sync_enabled, created_at)
      VALUES
        (@id, @name, @type, @color, @sort_order,
         @spotify_sync_enabled, @weather_sync_enabled,
         COALESCE(@created_at, datetime('now')))
    `)
    for (const g of groups) {
      if (!g || !g.id || !g.name) continue
      groupStmt.run({
        id: g.id,
        name: g.name,
        type: g.type ?? 'custom',
        color: g.color ?? null,
        sort_order: g.sort_order ?? 0,
        spotify_sync_enabled: g.spotify_sync_enabled ?? 0,
        weather_sync_enabled: g.weather_sync_enabled ?? 0,
        created_at: g.created_at ?? null,
      })
    }

    // ── Group Memberships ────────────────────────────────────────────────────
    const memberStmt = db.prepare(`
      INSERT OR IGNORE INTO group_members (group_id, device_id) VALUES (@group_id, @device_id)
    `)
    for (const m of group_members) {
      if (!m || !m.group_id || !m.device_id) continue
      memberStmt.run({ group_id: m.group_id, device_id: m.device_id })
    }

    const childStmt = db.prepare(`
      INSERT OR IGNORE INTO group_children (parent_group_id, child_group_id)
      VALUES (@parent_group_id, @child_group_id)
    `)
    for (const c of group_children) {
      if (!c || !c.parent_group_id || !c.child_group_id) continue
      childStmt.run({ parent_group_id: c.parent_group_id, child_group_id: c.child_group_id })
    }

    // ── Presets ───────────────────────────────────────────────────────────────
    const presetStmt = db.prepare(`
      INSERT OR REPLACE INTO presets (id, name, group_id, state_json, created_at)
      VALUES (@id, @name, @group_id, @state_json, COALESCE(@created_at, datetime('now')))
    `)
    for (const p of presets) {
      if (!p || !p.id || !p.name) continue
      presetStmt.run({
        id: p.id,
        name: p.name,
        group_id: p.group_id ?? null,
        state_json: typeof p.state_json === 'string' ? p.state_json : JSON.stringify(p.state_json ?? {}),
        created_at: p.created_at ?? null,
      })
    }

    // ── Settings (always merge key-by-key) ───────────────────────────────────
    const settingStmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)
    `)
    for (const s of settings) {
      if (!s || !s.key) continue
      settingStmt.run({ key: s.key, value: String(s.value ?? '') })
    }

    // ── Schedules ─────────────────────────────────────────────────────────────
    const schedStmt = db.prepare(`
      INSERT OR REPLACE INTO schedules
        (id, name, is_enabled, trigger_type, trigger_config, trigger_value,
         action_type, action_config, target_type, target_id, payload_json,
         enabled, last_run_at, created_at)
      VALUES
        (@id, @name, @is_enabled, @trigger_type, @trigger_config,
         @trigger_value, @action_type, @action_config, @target_type, @target_id,
         @payload_json, @enabled, @last_run_at,
         COALESCE(@created_at, datetime('now')))
    `)
    for (const s of schedules) {
      if (!s || !s.id || !s.name) continue
      schedStmt.run({
        id: s.id,
        name: s.name,
        is_enabled: s.is_enabled ?? s.enabled ?? 1,
        trigger_type: s.trigger_type ?? 'fixed_time',
        trigger_config: typeof s.trigger_config === 'string' ? s.trigger_config : JSON.stringify(s.trigger_config ?? {}),
        trigger_value: s.trigger_value ?? '12:00',
        action_type: s.action_type ?? 'preset',
        action_config: typeof s.action_config === 'string' ? s.action_config : JSON.stringify(s.action_config ?? {}),
        target_type: s.target_type ?? 'device',
        target_id: s.target_id ?? '',
        payload_json: typeof s.payload_json === 'string' ? s.payload_json : JSON.stringify(s.payload_json ?? {}),
        enabled: s.enabled ?? s.is_enabled ?? 1,
        last_run_at: s.last_run_at ?? null,
        created_at: s.created_at ?? null,
      })
    }

    // ── Routines ──────────────────────────────────────────────────────────────
    const routineStmt = db.prepare(`
      INSERT OR REPLACE INTO routines
        (id, name, is_enabled, description, steps_json, enabled, created_at)
      VALUES
        (@id, @name, @is_enabled, @description,
         @steps_json, @enabled,
         COALESCE(@created_at, datetime('now')))
    `)
    for (const r of routines) {
      if (!r || !r.id || !r.name) continue
      routineStmt.run({
        id: r.id,
        name: r.name,
        is_enabled: r.is_enabled ?? r.enabled ?? 1,
        description: r.description ?? '',
        steps_json: typeof r.steps_json === 'string' ? r.steps_json : JSON.stringify(r.steps_json ?? []),
        enabled: r.enabled ?? r.is_enabled ?? 1,
        created_at: r.created_at ?? null,
      })
    }

    const stepStmt = db.prepare(`
      INSERT OR REPLACE INTO routine_steps
        (id, routine_id, step_order, action_type, action_config, delay_ms, target_type, target_id)
      VALUES
        (@id, @routine_id, @step_order, @action_type, @action_config,
         @delay_ms, @target_type, @target_id)
    `)
    for (const s of routine_steps) {
      if (!s || !s.id || !s.routine_id) continue
      stepStmt.run({
        id: s.id,
        routine_id: s.routine_id,
        step_order: s.step_order ?? 0,
        action_type: s.action_type ?? 'command',
        action_config: typeof s.action_config === 'string' ? s.action_config : JSON.stringify(s.action_config ?? {}),
        delay_ms: s.delay_ms ?? 0,
        target_type: s.target_type ?? null,
        target_id: s.target_id ?? null,
      })
    }

    // ── Spatial Hierarchy ─────────────────────────────────────────────────────
    const dwellingStmt = db.prepare(`
      INSERT OR REPLACE INTO dwellings (id, name, sort_order)
      VALUES (@id, @name, @sort_order)
    `)
    for (const d of dwellings) {
      if (!d || !d.id || !d.name) continue
      dwellingStmt.run({
        id: d.id,
        name: d.name,
        sort_order: d.sort_order ?? 0,
      })
    }

    const floorStmt = db.prepare(`
      INSERT OR REPLACE INTO floors (id, dwelling_id, name, elevation, sort_order)
      VALUES (@id, @dwelling_id, @name, @elevation, @sort_order)
    `)
    for (const f of floors) {
      if (!f || !f.id || !f.dwelling_id || !f.name) continue
      floorStmt.run({
        id: f.id,
        dwelling_id: f.dwelling_id,
        name: f.name,
        elevation: f.elevation ?? 0,
        sort_order: f.sort_order ?? 0,
      })
    }

    const roomStmt = db.prepare(`
      INSERT OR REPLACE INTO rooms
        (id, floor_id, name, width, depth, position_x, position_y, rotation_y, sort_order)
      VALUES
        (@id, @floor_id, @name, @width, @depth,
         @position_x, @position_y,
         @rotation_y, @sort_order)
    `)
    for (const r of rooms) {
      if (!r || !r.id || !r.floor_id || !r.name) continue
      roomStmt.run({
        id: r.id,
        floor_id: r.floor_id,
        name: r.name,
        width: r.width ?? 4.0,
        depth: r.depth ?? 4.0,
        position_x: r.position_x ?? 0,
        position_y: r.position_y ?? 0,
        rotation_y: r.rotation_y ?? 0,
        sort_order: r.sort_order ?? 0,
      })
    }

    const anchorStmt = db.prepare(`
      INSERT OR REPLACE INTO anchors
        (id, room_id, device_id, name, type, offset_x, offset_y, offset_z,
         rotation_y, length, led_density)
      VALUES
        (@id, @room_id, @device_id, @name, @type,
         @offset_x, @offset_y, @offset_z,
         @rotation_y, @length, @led_density)
    `)
    for (const a of anchors) {
      if (!a || !a.id || !a.room_id || !a.name) continue
      anchorStmt.run({
        id: a.id,
        room_id: a.room_id,
        device_id: a.device_id ?? null,
        name: a.name,
        type: a.type ?? 'light_bar',
        offset_x: a.offset_x ?? 0,
        offset_y: a.offset_y ?? 0,
        offset_z: a.offset_z ?? 0,
        rotation_y: a.rotation_y ?? 0,
        length: a.length ?? 3.5,
        led_density: a.led_density ?? 60,
      })
    }

    // ── Studio ────────────────────────────────────────────────────────────────
    const animStmt = db.prepare(`
      INSERT OR REPLACE INTO animations (id, name, timeline_json, duration_ms, created_at)
      VALUES (@id, @name, @timeline_json, @duration_ms, COALESCE(@created_at, datetime('now')))
    `)
    for (const a of animations) {
      if (!a || !a.id || !a.name) continue
      animStmt.run({
        id: a.id,
        name: a.name,
        timeline_json: typeof a.timeline_json === 'string' ? a.timeline_json : JSON.stringify(a.timeline_json ?? {}),
        duration_ms: a.duration_ms ?? 10000,
        created_at: a.created_at ?? null,
      })
    }

    const palStmt = db.prepare(`
      INSERT OR REPLACE INTO palettes (id, name, colors_json, created_at)
      VALUES (@id, @name, @colors_json, COALESCE(@created_at, datetime('now')))
    `)
    for (const p of palettes) {
      if (!p || !p.id || !p.name) continue
      palStmt.run({
        id: p.id,
        name: p.name,
        colors_json: typeof p.colors_json === 'string' ? p.colors_json : JSON.stringify(p.colors_json ?? []),
        created_at: p.created_at ?? null,
      })
    }

    // ── Matrix ────────────────────────────────────────────────────────────────
    const matStmt = db.prepare(`
      INSERT OR REPLACE INTO matrices (id, device_id, name, width, height, created_at)
      VALUES (@id, @device_id, @name, @width, @height,
              COALESCE(@created_at, datetime('now')))
    `)
    for (const m of matrices) {
      if (!m || !m.id || !m.name) continue
      matStmt.run({
        id: m.id,
        device_id: m.device_id ?? null,
        name: m.name,
        width: m.width ?? 16,
        height: m.height ?? 16,
        created_at: m.created_at ?? null,
      })
    }

    const drawStmt = db.prepare(`
      INSERT OR REPLACE INTO matrix_drawings (id, name, width, height, pixels_json, created_at)
      VALUES (@id, @name, @width, @height, @pixels_json, COALESCE(@created_at, datetime('now')))
    `)
    for (const d of matrix_drawings) {
      if (!d || !d.id || !d.name) continue
      drawStmt.run({
        id: d.id,
        name: d.name,
        width: d.width ?? 16,
        height: d.height ?? 16,
        pixels_json: typeof d.pixels_json === 'string' ? d.pixels_json : JSON.stringify(d.pixels_json ?? []),
        created_at: d.created_at ?? null,
      })
    }

    // ── Studio Objects ──────────────────────────────────────────────────────
    const objStmt = db.prepare(`
      INSERT OR REPLACE INTO studio_objects
        (id, name, shape, dims_json, strategy, options_json, chip, device_id,
         created_at, updated_at)
      VALUES
        (@id, @name, @shape, @dims_json, @strategy, @options_json, @chip, @device_id,
         COALESCE(@created_at, datetime('now')), COALESCE(@updated_at, datetime('now')))
    `)
    for (const o of studio_objects) {
      if (!o || !o.id || !o.name || !o.shape || !o.strategy) continue
      objStmt.run({
        id: o.id,
        name: o.name,
        shape: o.shape,
        dims_json: typeof o.dims_json === 'string' ? o.dims_json : JSON.stringify(o.dims ?? o.dims_json ?? {}),
        strategy: o.strategy,
        options_json: typeof o.options_json === 'string' ? o.options_json : JSON.stringify(o.options ?? o.options_json ?? {}),
        chip: o.chip ?? 'ws2812b',
        device_id: o.device_id ?? null,
        created_at: o.created_at ?? null,
        updated_at: o.updated_at ?? null,
      })
    }
  })()

  return {
    ok: true,
    stats: {
      devices: devices.length,
      groups: groups.length,
      presets: presets.length,
      schedules: schedules.length,
      routines: routines.length,
      routine_steps: routine_steps.length,
      dwellings: dwellings.length,
      floors: floors.length,
      rooms: rooms.length,
      anchors: anchors.length,
      animations: animations.length,
      palettes: palettes.length,
      matrices: matrices.length,
      matrix_drawings: matrix_drawings.length,
      studio_objects: studio_objects.length,
    },
    skipped,
    warnings,
  }
}
