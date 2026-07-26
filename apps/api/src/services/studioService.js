import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

// ─── WLED Built-in Effect Catalog ─────────────────────────────────────────────
export const WLED_EFFECTS = [
  { id: 0, name: 'Solid', category: 'Basic' },
  { id: 1, name: 'Blink', category: 'Basic' },
  { id: 2, name: 'Breathe', category: 'Basic' },
  { id: 3, name: 'Wipe', category: 'Basic' },
  { id: 4, name: 'Wipe Random', category: 'Basic' },
  { id: 5, name: 'Random Colors', category: 'Basic' },
  { id: 6, name: 'Sweep', category: 'Basic' },
  { id: 7, name: 'Dynamic', category: 'Dynamic' },
  { id: 8, name: 'Colorloop', category: 'Dynamic' },
  { id: 9, name: 'Rainbow', category: 'Dynamic' },
  { id: 10, name: 'Scan', category: 'Dynamic' },
  { id: 11, name: 'Dual Scan', category: 'Dynamic' },
  { id: 12, name: 'Fade', category: 'Basic' },
  { id: 13, name: 'Theater', category: 'Dynamic' },
  { id: 14, name: 'Theater Rainbow', category: 'Dynamic' },
  { id: 15, name: 'Running', category: 'Dynamic' },
  { id: 16, name: 'Saw', category: 'Dynamic' },
  { id: 17, name: 'Twinkle', category: 'Dynamic' },
  { id: 18, name: 'Dissolve', category: 'Dynamic' },
  { id: 19, name: 'Sparkle', category: 'Dynamic' },
  { id: 20, name: 'Sparkle Dark', category: 'Dynamic' },
  { id: 21, name: 'Sparkle+', category: 'Dynamic' },
  { id: 22, name: 'Strobe', category: 'Dynamic' },
  { id: 23, name: 'Strobe Rainbow', category: 'Dynamic' },
  { id: 24, name: 'Mega Strobe', category: 'Dynamic' },
  { id: 25, name: 'Blink Rainbow', category: 'Dynamic' },
  { id: 26, name: 'Android', category: 'Dynamic' },
  { id: 27, name: 'Chase', category: 'Dynamic' },
  { id: 28, name: 'Chase Random', category: 'Dynamic' },
  { id: 29, name: 'Chase Rainbow', category: 'Dynamic' },
  { id: 30, name: 'Chase Flash', category: 'Dynamic' },
  { id: 31, name: 'Chase Flash Random', category: 'Dynamic' },
  { id: 32, name: 'Chase Rainbow Flash', category: 'Dynamic' },
  { id: 33, name: 'Chase Blackout', category: 'Dynamic' },
  { id: 34, name: 'Chaser Flash', category: 'Dynamic' },
  { id: 35, name: 'Fireworks', category: 'Dynamic' },
  { id: 36, name: 'Fireworks Random', category: 'Dynamic' },
  { id: 37, name: 'Merry Christmas', category: 'Festive' },
  { id: 38, name: 'Fire 2012', category: 'Fire' },
  { id: 39, name: 'Flicker', category: 'Fire' },
  { id: 40, name: 'Pacifica', category: 'Dynamic' },
  { id: 41, name: 'Candle', category: 'Fire' },
  { id: 42, name: 'Lightning', category: 'Dynamic' },
  { id: 43, name: 'ICU', category: 'Dynamic' },
  { id: 44, name: 'Multi Comet', category: 'Dynamic' },
  { id: 45, name: 'Dual Scanner', category: 'Dynamic' },
  { id: 46, name: 'Stream', category: 'Dynamic' },
  { id: 47, name: 'Glitter', category: 'Dynamic' },
  { id: 48, name: 'Sunrise', category: 'Nature' },
  { id: 49, name: 'Colorwaves', category: 'Dynamic' },
]

// ─── WLED Built-in Palette Catalog ───────────────────────────────────────────
export const WLED_PALETTES = [
  { id: 0, name: 'Default / Current' },
  { id: 1, name: 'Random Cycle' },
  { id: 2, name: 'Primary Color' },
  { id: 3, name: 'Based on Primary' },
  { id: 4, name: 'Set Colors' },
  { id: 5, name: 'Based on Set' },
  { id: 6, name: 'Party' },
  { id: 7, name: 'Cloud' },
  { id: 8, name: 'Lava' },
  { id: 9, name: 'Ocean' },
  { id: 10, name: 'Forest' },
  { id: 11, name: 'Rainbow' },
  { id: 12, name: 'Rainbow Bands' },
  { id: 13, name: 'Sunset' },
  { id: 14, name: 'Rivendell' },
  { id: 15, name: 'Breeze' },
  { id: 16, name: 'Ocean Breeze' },
  { id: 17, name: 'Atlantic' },
  { id: 18, name: 'Cyberpunk' },
  { id: 19, name: 'Amber Glow' },
]

// ─── Custom Animations (Timeline Keyframes) ──────────────────────────────────

export function listAnimations() {
  const rows = getDb().prepare('SELECT * FROM animations ORDER BY created_at DESC').all()
  return rows.map(r => ({
    ...r,
    timeline: JSON.parse(r.timeline_json || '[]'),
  }))
}

export function createAnimation({ name, timeline = [], duration_ms = 5000 }) {
  const db = getDb()
  const id = uuidv4()
  const timelineJson = JSON.stringify(timeline)
  db.prepare(`
    INSERT INTO animations (id, name, timeline_json, duration_ms)
    VALUES (?, ?, ?, ?)
  `).run(id, name, timelineJson, duration_ms)
  const row = db.prepare('SELECT * FROM animations WHERE id = ?').get(id)
  return { ...row, timeline }
}

export function updateAnimation(id, { name, timeline, duration_ms }) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM animations WHERE id = ?').get(id)
  if (!existing) return null

  const newName = name ?? existing.name
  const newDuration = duration_ms ?? existing.duration_ms
  const newTimelineJson = timeline ? JSON.stringify(timeline) : existing.timeline_json

  db.prepare(`
    UPDATE animations
    SET name = ?, timeline_json = ?, duration_ms = ?
    WHERE id = ?
  `).run(newName, newTimelineJson, newDuration, id)

  const row = db.prepare('SELECT * FROM animations WHERE id = ?').get(id)
  return { ...row, timeline: JSON.parse(row.timeline_json) }
}

export function deleteAnimation(id) {
  return getDb().prepare('DELETE FROM animations WHERE id = ?').run(id).changes > 0
}

// ─── Custom Palettes ─────────────────────────────────────────────────────────

export function listPalettes() {
  const rows = getDb().prepare('SELECT * FROM palettes ORDER BY created_at DESC').all()
  return rows.map(r => ({
    ...r,
    colors: JSON.parse(r.colors_json || '[]'),
  }))
}

export function createPalette({ name, colors = ['#ff0055', '#ffaa00', '#00ffcc'] }) {
  const db = getDb()
  const id = uuidv4()
  const colorsJson = JSON.stringify(colors)
  db.prepare(`
    INSERT INTO palettes (id, name, colors_json)
    VALUES (?, ?, ?)
  `).run(id, name, colorsJson)
  const row = db.prepare('SELECT * FROM palettes WHERE id = ?').get(id)
  return { ...row, colors }
}

export function deletePalette(id) {
  return getDb().prepare('DELETE FROM palettes WHERE id = ?').run(id).changes > 0
}
