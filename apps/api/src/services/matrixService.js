import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

export function listMatrices() {
  return getDb().prepare('SELECT * FROM matrices ORDER BY created_at DESC').all()
}

export function createMatrix({ name, device_id = null, width = 16, height = 16 }) {
  const db = getDb()
  const id = uuidv4()
  db.prepare(`
    INSERT INTO matrices (id, name, device_id, width, height)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, device_id, width, height)
  return db.prepare('SELECT * FROM matrices WHERE id = ?').get(id)
}

export function deleteMatrix(id) {
  return getDb().prepare('DELETE FROM matrices WHERE id = ?').run(id).changes > 0
}

export function listDrawings() {
  const rows = getDb().prepare('SELECT * FROM matrix_drawings ORDER BY created_at DESC').all()
  return rows.map(r => ({
    ...r,
    kind: r.kind || 'drawing',
    pixels: JSON.parse(r.pixels_json || '[]'),
    params: r.params_json ? JSON.parse(r.params_json) : null,
  }))
}

export function saveDrawing({ id, name, width = 16, height = 16, pixels = [], kind = 'drawing', params = null }) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) {
    const err = new Error('Drawing name is required.')
    err.statusCode = 400
    throw err
  }

  const db = getDb()
  const existingName = id
    ? db.prepare('SELECT id FROM matrix_drawings WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != ?').get(trimmedName, id)
    : db.prepare('SELECT id FROM matrix_drawings WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(trimmedName)

  if (existingName) {
    const err = new Error(`A drawing named "${trimmedName}" already exists.`)
    err.statusCode = 409
    throw err
  }

  const pixelsJson = JSON.stringify(pixels)
  const safeKind = kind === 'marquee' ? 'marquee' : 'drawing'
  const paramsJson = params == null ? null : JSON.stringify(params)

  if (id) {
    const existing = db.prepare('SELECT id FROM matrix_drawings WHERE id = ?').get(id)
    if (existing) {
      db.prepare(`
        UPDATE matrix_drawings
        SET name = ?, width = ?, height = ?, pixels_json = ?, kind = ?, params_json = ?
        WHERE id = ?
      `).run(trimmedName, width, height, pixelsJson, safeKind, paramsJson, id)
      const row = db.prepare('SELECT * FROM matrix_drawings WHERE id = ?').get(id)
      return { ...row, kind: row.kind || 'drawing', pixels, params }
    }
  }

  const targetId = id || uuidv4()
  db.prepare(`
    INSERT INTO matrix_drawings (id, name, width, height, pixels_json, kind, params_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(targetId, trimmedName, width, height, pixelsJson, safeKind, paramsJson)
  const row = db.prepare('SELECT * FROM matrix_drawings WHERE id = ?').get(targetId)
  return { ...row, kind: row.kind || 'drawing', pixels, params }
}

export function deleteDrawing(id) {
  return getDb().prepare('DELETE FROM matrix_drawings WHERE id = ?').run(id).changes > 0
}
