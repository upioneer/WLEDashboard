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
    pixels: JSON.parse(r.pixels_json || '[]'),
  }))
}

export function saveDrawing({ name, width = 16, height = 16, pixels = [] }) {
  const db = getDb()
  const id = uuidv4()
  const pixelsJson = JSON.stringify(pixels)
  db.prepare(`
    INSERT INTO matrix_drawings (id, name, width, height, pixels_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, width, height, pixelsJson)
  const row = db.prepare('SELECT * FROM matrix_drawings WHERE id = ?').get(id)
  return { ...row, pixels }
}

export function deleteDrawing(id) {
  return getDb().prepare('DELETE FROM matrix_drawings WHERE id = ?').run(id).changes > 0
}
