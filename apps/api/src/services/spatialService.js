import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

// ─── Spatial Hierarchy CRUD ───────────────────────────────────────────────────

export function getSpatialHierarchy() {
  const db = getDb()

  const dwellings = db.prepare('SELECT * FROM dwellings ORDER BY sort_order ASC').all()
  const floors    = db.prepare('SELECT * FROM floors ORDER BY sort_order ASC').all()
  const rooms     = db.prepare('SELECT * FROM rooms ORDER BY sort_order ASC').all()
  const anchors   = db.prepare('SELECT * FROM anchors').all()

  // If hierarchy is empty, seed a sensible default structure
  if (dwellings.length === 0) {
    return seedDefaultSpatialHierarchy()
  }

  const floorsByDwelling = {}
  for (const f of floors) {
    if (!floorsByDwelling[f.dwelling_id]) floorsByDwelling[f.dwelling_id] = []
    floorsByDwelling[f.dwelling_id].push(f)
  }

  const roomsByFloor = {}
  for (const r of rooms) {
    if (!roomsByFloor[r.floor_id]) roomsByFloor[r.floor_id] = []
    roomsByFloor[r.floor_id].push(r)
  }

  const anchorsByRoom = {}
  for (const a of anchors) {
    if (!anchorsByRoom[a.room_id]) anchorsByRoom[a.room_id] = []
    anchorsByRoom[a.room_id].push(a)
  }

  return dwellings.map(d => ({
    ...d,
    floors: (floorsByDwelling[d.id] || []).map(f => ({
      ...f,
      rooms: (roomsByFloor[f.id] || []).map(r => ({
        ...r,
        anchors: anchorsByRoom[r.id] || [],
      })),
    })),
  }))
}

export function seedDefaultSpatialHierarchy() {
  const db = getDb()
  const dId = uuidv4()
  const fId = uuidv4()
  const r1Id = uuidv4()
  const r2Id = uuidv4()

  db.transaction(() => {
    db.prepare('INSERT INTO dwellings (id, name, sort_order) VALUES (?, ?, ?)').run(dId, 'Main Residence', 0)
    db.prepare('INSERT INTO floors (id, dwelling_id, name, elevation, sort_order) VALUES (?, ?, ?, ?, ?)').run(fId, dId, 'Ground Floor', 0, 0)

    db.prepare(`
      INSERT INTO rooms (id, floor_id, name, width, depth, position_x, position_y, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(r1Id, fId, 'Living Room', 6.0, 5.0, -3.2, 0, 0)

    db.prepare(`
      INSERT INTO rooms (id, floor_id, name, width, depth, position_x, position_y, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(r2Id, fId, 'Entertainment Den', 4.5, 4.0, 3.2, 0, 1)

    // Assign existing devices to anchors if available
    const devices = db.prepare('SELECT id, name FROM devices').all()
    if (devices[0]) {
      db.prepare(`
        INSERT INTO anchors (id, room_id, device_id, name, type, offset_x, offset_y, offset_z)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), r1Id, devices[0].id, `${devices[0].name} Strip`, 'strip_perimeter', 0, 2.4, -2.4)
    }

    if (devices[1]) {
      db.prepare(`
        INSERT INTO anchors (id, room_id, device_id, name, type, offset_x, offset_y, offset_z)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), r2Id, devices[1].id, `${devices[1].name} Backlight`, 'strip_linear', 0, 1.2, 0)
    }
  })()

  return getSpatialHierarchy()
}

// ─── Dwellings ────────────────────────────────────────────────────────────────

export function createDwelling({ name }) {
  const db = getDb()
  const id = uuidv4()
  const maxOrder = db.prepare('SELECT MAX(sort_order) AS m FROM dwellings').get()?.m ?? -1
  db.prepare('INSERT INTO dwellings (id, name, sort_order) VALUES (?, ?, ?)').run(id, name, maxOrder + 1)
  return db.prepare('SELECT * FROM dwellings WHERE id = ?').get(id)
}

// ─── Floors ────────────────────────────────────────────────-------------------

export function createFloor({ dwelling_id, name, elevation = 0 }) {
  const db = getDb()
  const id = uuidv4()
  const maxOrder = db.prepare('SELECT MAX(sort_order) AS m FROM floors WHERE dwelling_id = ?').get(dwelling_id)?.m ?? -1
  db.prepare('INSERT INTO floors (id, dwelling_id, name, elevation, sort_order) VALUES (?, ?, ?, ?, ?)').run(id, dwelling_id, name, elevation, maxOrder + 1)
  return db.prepare('SELECT * FROM floors WHERE id = ?').get(id)
}

// ─── Rooms ────────────────────────────────────────────────--------------------

export function createRoom({ floor_id, name, width = 4.0, depth = 4.0, position_x = 0, position_y = 0 }) {
  const db = getDb()
  const id = uuidv4()
  const maxOrder = db.prepare('SELECT MAX(sort_order) AS m FROM rooms WHERE floor_id = ?').get(floor_id)?.m ?? -1
  db.prepare(`
    INSERT INTO rooms (id, floor_id, name, width, depth, position_x, position_y, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, floor_id, name, width, depth, position_x, position_y, maxOrder + 1)
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id)
}

export function updateRoom(id, data) {
  const db = getDb()
  db.prepare(`
    UPDATE rooms SET
      name       = COALESCE(?, name),
      width      = COALESCE(?, width),
      depth      = COALESCE(?, depth),
      position_x = COALESCE(?, position_x),
      position_y = COALESCE(?, position_y),
      rotation_y = COALESCE(?, rotation_y)
    WHERE id = ?
  `).run(data.name ?? null, data.width ?? null, data.depth ?? null, data.position_x ?? null, data.position_y ?? null, data.rotation_y ?? null, id)
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id)
}

export function deleteRoom(id) {
  return getDb().prepare('DELETE FROM rooms WHERE id = ?').run(id).changes > 0
}

// ─── Anchors (Spatial Light Bindings) ─────────────────────────────────────────

export function createAnchor({ room_id, device_id = null, name, type = 'strip_linear', offset_x = 0, offset_y = 1.0, offset_z = 0, rotation_y = 0, length = 3.5, led_density = 30 }) {
  const db = getDb()
  const id = uuidv4()
  db.prepare(`
    INSERT INTO anchors (id, room_id, device_id, name, type, offset_x, offset_y, offset_z, rotation_y, length, led_density)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, room_id, device_id, name, type, offset_x, offset_y, offset_z, rotation_y, length, led_density)
  return db.prepare('SELECT * FROM anchors WHERE id = ?').get(id)
}

export function updateAnchor(id, data) {
  const db = getDb()
  db.prepare(`
    UPDATE anchors SET
      room_id    = COALESCE(?, room_id),
      device_id  = COALESCE(?, device_id),
      name       = COALESCE(?, name),
      type       = COALESCE(?, type),
      offset_x   = COALESCE(?, offset_x),
      offset_y   = COALESCE(?, offset_y),
      offset_z   = COALESCE(?, offset_z),
      rotation_y = COALESCE(?, rotation_y),
      length     = COALESCE(?, length),
      led_density= COALESCE(?, led_density)
    WHERE id = ?
  `).run(
    data.room_id ?? null,
    data.device_id ?? null,
    data.name ?? null,
    data.type ?? null,
    data.offset_x ?? null,
    data.offset_y ?? null,
    data.offset_z ?? null,
    data.rotation_y ?? null,
    data.length ?? null,
    data.led_density ?? null,
    id
  )
  return db.prepare('SELECT * FROM anchors WHERE id = ?').get(id)
}

export function deleteAnchor(id) {
  return getDb().prepare('DELETE FROM anchors WHERE id = ?').run(id).changes > 0
}
