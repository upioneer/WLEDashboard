import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

// ─── LED Chip Reference ─────────────────────────────────────────────────────
// Max-white current draw per addressable pixel. These are conservative
// datasheet maximums at 100% bright white: the minimum supply that guarantees
// full white. Lower brightness, colors, and patterns draw proportionally less.
// Chip and voltage are always human input: WLED firmware cannot report them.
export const CHIP_REFERENCE = {
  ws2812b: {
    label: 'WS2812B',
    voltage: 5,
    maPerLed: 60,
    notes: '5V addressable, one IC per LED. Most common strip.',
  },
  sk6812_rgbw: {
    label: 'SK6812 RGBW',
    voltage: 5,
    maPerLed: 80,
    notes: '5V addressable with dedicated white channel. Full white (RGB+W) draws more than WS2812B.',
  },
  ws2811_12v: {
    label: 'WS2811 (12V)',
    voltage: 12,
    maPerLed: 55,
    notes: '12V addressable in groups of 3 LEDs per IC. Count control resolution in groups of 3, current per group.',
  },
  tm1814_12v: {
    label: 'TM1814 (12V RGBW)',
    voltage: 12,
    maPerLed: 60,
    notes: '12V addressable RGBW, longer runs with less voltage drop than 5V. Current per addressable pixel at full white.',
  },
}

export const SHAPES = ['cone', 'cylinder', 'sphere', 'box', 'plane']

export const STRATEGIES = {
  cone: ['spiral', 'vertical_runs', 'rings'],
  cylinder: ['spiral', 'vertical_runs', 'rings'],
  sphere: ['latitude_rings', 'longitude_runs'],
  box: ['edge_frame', 'face_columns'],
  plane: ['serpentine_rows', 'columns'],
}

const MAX_POINTS = 100000

function march(spacing, stepFn, tMax = 1, dt = 0.005) {
  // Generic arc-length marcher: advances a parametric path and emits a point
  // every `spacing` meters, so density is exact regardless of shape.
  const points = []
  let prev = stepFn(0)
  let acc = 0
  for (let t = dt; t <= tMax + 1e-9; t += dt) {
    const cur = stepFn(Math.min(t, tMax))
    acc += Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2])
    prev = cur
    if (acc >= spacing) {
      acc = 0
      points.push(cur)
      if (points.length >= MAX_POINTS) break
    }
  }
  return points
}

function applyOrder(points, direction, startOffset) {
  let ordered = direction === 'bottom_up' ? [...points].reverse() : points
  const k = ((startOffset ?? 0) % Math.max(ordered.length, 1) + Math.max(ordered.length, 1)) % Math.max(ordered.length, 1)
  if (k > 0) ordered = [...ordered.slice(k), ...ordered.slice(0, k)]
  return ordered
}

function summarize(points, runs) {
  let pathLengthM = 0
  for (let i = 1; i < points.length; i++) {
    pathLengthM += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
      points[i][2] - points[i - 1][2],
    )
  }
  return { count: points.length, pathLengthM, runs }
}

// ─── Cone / Cylinder ────────────────────────────────────────────────────────

function coneSpiral({ height, radiusTop, radiusBottom, density, direction, startOffset, turns: requestedTurns }) {
  const turns = requestedTurns ?? Math.max(2, Math.round(height / 0.18))
  const thetaMax = turns * 2 * Math.PI
  const dr_dtheta = (radiusBottom - radiusTop) / thetaMax
  const dy_dtheta = -height / thetaMax
  const step = 1 / density

  let theta = 0
  const pts = []
  while (theta <= thetaMax + 1e-9) {
    const t = Math.min(1, theta / thetaMax)
    const r = radiusTop + (radiusBottom - radiusTop) * t
    const y = height * (1 - t)
    const x = r * Math.cos(theta)
    const z = r * Math.sin(theta)
    pts.push([x, y, z])
    if (pts.length >= MAX_POINTS) break

    const speed = Math.sqrt(r * r + dr_dtheta * dr_dtheta + dy_dtheta * dy_dtheta)
    const dtheta = step / Math.max(speed, 1e-6)
    theta += dtheta
  }

  return {
    points: applyOrder(pts, direction, startOffset),
    runs: [{ start: 0, end: pts.length, lengthM: 0, count: pts.length }],
  }
}

function coneRuns({ height, radiusTop, radiusBottom, density, direction, startOffset, runs = 8 }) {
  const step = 1 / density
  const points = []
  const meta = []
  for (let i = 0; i < runs; i++) {
    const theta = (i / runs) * 2 * Math.PI
    const run = march(step, (t) => {
      const r = radiusTop + (radiusBottom - radiusTop) * t
      return [r * Math.cos(theta), height * (1 - t), r * Math.sin(theta)]
    })
    meta.push({ start: points.length, end: points.length + run.length, lengthM: 0, count: run.length })
    points.push(...run)
  }
  return { points: applyOrder(points, direction, startOffset), runs: meta }
}

function coneRings({ height, radiusTop, radiusBottom, density, direction, startOffset, ringSpacing = 0.1 }) {
  const points = []
  const meta = []
  const levels = Math.max(1, Math.floor(height / ringSpacing))
  for (let i = 0; i < levels; i++) {
    const t = (i + 0.5) / levels
    const r = radiusTop + (radiusBottom - radiusTop) * t
    const y = height * (1 - t)
    const n = Math.max(3, Math.round(2 * Math.PI * r * density))
    for (let k = 0; k < n; k++) {
      const theta = (k / n) * 2 * Math.PI
      points.push([r * Math.cos(theta), y, r * Math.sin(theta)])
    }
    meta.push({ start: points.length - n, end: points.length, lengthM: 2 * Math.PI * r, count: n })
  }
  return { points: applyOrder(points, direction, startOffset), runs: meta }
}

// ─── Sphere ─────────────────────────────────────────────────────────────────

function sphereRings({ radius, density, direction, startOffset, ringSpacing = 0.1 }) {
  const points = []
  const meta = []
  const levels = Math.max(1, Math.floor((2 * radius) / ringSpacing))
  for (let i = 0; i < levels; i++) {
    const y = radius - ((i + 0.5) / levels) * 2 * radius
    const r = Math.sqrt(Math.max(0, radius * radius - y * y))
    if (r < 1e-6) continue
    const n = Math.max(3, Math.round(2 * Math.PI * r * density))
    for (let k = 0; k < n; k++) {
      const theta = (k / n) * 2 * Math.PI
      points.push([r * Math.cos(theta), y, r * Math.sin(theta)])
    }
    meta.push({ start: points.length - n, end: points.length, lengthM: 2 * Math.PI * r, count: n })
  }
  return { points: applyOrder(points, direction, startOffset), runs: meta }
}

function sphereRuns({ radius, density, direction, startOffset, runs = 12 }) {
  const step = 1 / density
  const points = []
  const meta = []
  for (let i = 0; i < runs; i++) {
    const theta = (i / runs) * 2 * Math.PI
    const run = march(step, (t) => {
      const phi = Math.PI * t
      return [radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)]
    })
    meta.push({ start: points.length, end: points.length + run.length, lengthM: 0, count: run.length })
    points.push(...run)
  }
  return { points: applyOrder(points, direction, startOffset), runs: meta }
}

// ─── Box ────────────────────────────────────────────────────────────────────

function boxFrame({ width, height, depth, density, direction, startOffset }) {
  const w = width / 2
  const h = height / 2
  const d = depth / 2
  const corners = [
    [-w, -h, -d], [w, -h, -d], [w, -h, d], [-w, -h, d],
    [-w, h, -d], [w, h, -d], [w, h, d], [-w, h, d],
  ]
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
  const points = []
  const meta = []
  for (const [a, b] of edges) {
    const p0 = corners[a]
    const p1 = corners[b]
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
    const n = Math.max(1, Math.round(len * density))
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0 : k / (n - 1)
      points.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t])
    }
    meta.push({ start: points.length - n, end: points.length, lengthM: len, count: n })
  }
  return { points: applyOrder(points, direction, startOffset), runs: meta }
}

function boxColumns({ width, height, depth, density, direction, startOffset, columns = 4 }) {
  const step = 1 / density
  const points = []
  const meta = []
  for (let f = 0; f < 2; f++) {
    const z = f === 0 ? -depth / 2 : depth / 2
    for (let i = 0; i < columns; i++) {
      const x = columns === 1 ? 0 : -width / 2 + (i / (columns - 1)) * width
      const run = march(step, (t) => [x, height / 2 - t * height, z])
      meta.push({ start: points.length, end: points.length + run.length, lengthM: 0, count: run.length })
      points.push(...run)
    }
  }
  return { points: applyOrder(points, direction, startOffset), runs: meta }
}

// ─── Plane ──────────────────────────────────────────────────────────────────

function planeSerpentine({ width, height, density, direction, startOffset, rowSpacing = 0.05 }) {
  const points = []
  const meta = []
  const rows = Math.max(1, Math.floor(height / rowSpacing))
  for (let i = 0; i < rows; i++) {
    const y = height / 2 - ((i + 0.5) / rows) * height
    const n = Math.max(1, Math.round(width * density))
    const leftToRight = i % 2 === 0
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0 : k / (n - 1)
      const x = (leftToRight ? -width / 2 + t * width : width / 2 - t * width)
      points.push([x, y, 0])
    }
    meta.push({ start: points.length - n, end: points.length, lengthM: width, count: n })
  }
  return { points: applyOrder(points, direction, startOffset), runs: meta }
}

function planeColumns({ width, height, density, direction, startOffset, columns = 8 }) {
  const step = 1 / density
  const points = []
  const meta = []
  for (let i = 0; i < columns; i++) {
    const x = columns === 1 ? 0 : -width / 2 + (i / (columns - 1)) * width
    const run = march(step, (t) => [x, height / 2 - t * height, 0])
    meta.push({ start: points.length, end: points.length + run.length, lengthM: 0, count: run.length })
    points.push(...run)
  }
  return { points: applyOrder(points, direction, startOffset), runs: meta }
}

// ─── Layout Dispatcher ──────────────────────────────────────────────────────

function coneDims(dims) {
  return {
    height: dims.height,
    radiusTop: dims.radiusTop ?? 0,
    radiusBottom: dims.radius ?? dims.radiusBottom,
  }
}

export function computeLayout({ shape, dims = {}, strategy, options = {} }) {
  if (!SHAPES.includes(shape)) throw new Error(`Unknown shape "${shape}".`)
  if (!STRATEGIES[shape].includes(strategy)) {
    throw new Error(`Strategy "${strategy}" is not available for shape "${shape}".`)
  }
  const density = options.density ?? 60
  if (!(density > 0) || density > 500) throw new Error('Density must be between 1 and 500 LEDs per meter.')
  const direction = options.direction === 'bottom_up' ? 'bottom_up' : 'top_down'
  const startOffset = options.startOffset ?? 0
  const base = { density, direction, startOffset }

  let layout
  if (shape === 'cone' || shape === 'cylinder') {
    const d = coneDims(dims)
    if (!(d.height > 0) || !(d.radiusBottom > 0)) throw new Error('Cone/cylinder needs a positive height and radius.')
    if (strategy === 'spiral') layout = coneSpiral({ ...d, ...base, turns: options.turns })
    else if (strategy === 'vertical_runs') layout = coneRuns({ ...d, ...base, runs: options.runs ?? 8 })
    else layout = coneRings({ ...d, ...base, ringSpacing: options.ringSpacing ?? 0.1 })
  } else if (shape === 'sphere') {
    if (!(dims.radius > 0)) throw new Error('Sphere needs a positive radius.')
    if (strategy === 'latitude_rings') layout = sphereRings({ radius: dims.radius, ...base, ringSpacing: options.ringSpacing ?? 0.1 })
    else layout = sphereRuns({ radius: dims.radius, ...base, runs: options.runs ?? 12 })
  } else if (shape === 'box') {
    if (!(dims.width > 0) || !(dims.height > 0) || !(dims.depth > 0)) {
      throw new Error('Box needs positive width, height, and depth.')
    }
    if (strategy === 'edge_frame') layout = boxFrame({ ...dims, ...base })
    else layout = boxColumns({ ...dims, ...base, columns: options.columns ?? 4 })
  } else {
    if (!(dims.width > 0) || !(dims.height > 0)) throw new Error('Plane needs a positive width and height.')
    if (strategy === 'serpentine_rows') layout = planeSerpentine({ ...dims, ...base, rowSpacing: options.rowSpacing ?? 0.05 })
    else layout = planeColumns({ ...dims, ...base, columns: options.columns ?? 8 })
  }

  const summary = summarize(layout.points, layout.runs)
  const stripLengthM = summary.pathLengthM * 1.05
  return { ...summary, points: layout.points, stripLengthM }
}

// ─── Power Math ─────────────────────────────────────────────────────────────

export const POWER_DISCLAIMER =
  'Sized for 100% bright white: the minimum supply that guarantees full white. ' +
  'Lower brightness, colors, and patterns draw proportionally less.'

export function computePower({ count, chip = 'ws2812b', brightnessPct = 100, headroomPct = 20 }) {
  const ref = CHIP_REFERENCE[chip]
  if (!ref) throw new Error(`Unknown LED chip "${chip}".`)
  const amps = (count * ref.maPerLed * (brightnessPct / 100)) / 1000
  const psuAmps = amps * (1 + headroomPct / 100)
  const psuWatts = psuAmps * ref.voltage
  const injectionEvery = 300
  return {
    chip: ref.label,
    voltage: ref.voltage,
    count,
    amps: round2(amps),
    psuAmps: round2(psuAmps),
    psuWatts: Math.ceil(psuWatts),
    injectionEveryN: injectionEvery,
    injectionPoints: Math.max(0, Math.ceil(count / injectionEvery) - 1),
    disclaimer: POWER_DISCLAIMER,
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

// ─── Persistence ────────────────────────────────────────────────────────────

export function listObjects() {
  return getDb().prepare('SELECT * FROM studio_objects ORDER BY created_at DESC').all()
    .map(fromRow)
}

export function getObject(id) {
  const row = getDb().prepare('SELECT * FROM studio_objects WHERE id = ?').get(id)
  return row ? fromRow(row) : null
}

export function createObject({ name, shape, dims = {}, strategy, options = {}, chip = 'ws2812b', device_id = null }) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) throw new Error('Object name is required.')
  if (!shape || !strategy) throw new Error('Studio object needs a shape and strategy.')
  computeLayout({ shape, dims, strategy, options })
  if (!CHIP_REFERENCE[chip]) throw new Error(`Unknown LED chip "${chip}".`)
  const db = getDb()
  const existingName = db.prepare('SELECT id FROM studio_objects WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(trimmedName)
  if (existingName) {
    const err = new Error(`An object named "${trimmedName}" already exists.`)
    err.statusCode = 409
    throw err
  }
  const id = uuidv4()
  db.prepare(`
    INSERT INTO studio_objects (id, name, shape, dims_json, strategy, options_json, chip, device_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, trimmedName, shape, JSON.stringify(dims), strategy, JSON.stringify(options), chip, device_id)
  return getObject(id)
}

export function updateObject(id, fields) {
  const existing = getObject(id)
  if (!existing) return null
  const trimmedName = fields.name !== undefined ? fields.name.trim() : existing.name
  if (!trimmedName) throw new Error('Object name is required.')

  const next = {
    name: trimmedName,
    shape: fields.shape ?? existing.shape,
    dims: fields.dims ?? existing.dims,
    strategy: fields.strategy ?? existing.strategy,
    options: fields.options ?? existing.options,
    chip: fields.chip ?? existing.chip,
    device_id: fields.device_id !== undefined ? fields.device_id : existing.device_id,
  }
  computeLayout({ shape: next.shape, dims: next.dims, strategy: next.strategy, options: next.options })
  if (!CHIP_REFERENCE[next.chip]) throw new Error(`Unknown LED chip "${next.chip}".`)

  if (fields.name !== undefined) {
    const conflict = getDb().prepare(
      'SELECT id FROM studio_objects WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != ?'
    ).get(trimmedName, id)
    if (conflict) {
      const err = new Error(`An object named "${trimmedName}" already exists.`)
      err.statusCode = 409
      throw err
    }
  }

  getDb().prepare(`
    UPDATE studio_objects
    SET name = ?, shape = ?, dims_json = ?, strategy = ?, options_json = ?,
        chip = ?, device_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(next.name, next.shape, JSON.stringify(next.dims), next.strategy,
    JSON.stringify(next.options), next.chip, next.device_id, id)
  return getObject(id)
}

export function deleteObject(id) {
  return getDb().prepare('DELETE FROM studio_objects WHERE id = ?').run(id).changes > 0
}

function fromRow(row) {
  return {
    ...row,
    dims: JSON.parse(row.dims_json || '{}'),
    options: JSON.parse(row.options_json || '{}'),
  }
}
