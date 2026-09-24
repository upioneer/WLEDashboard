import { z } from 'zod'
import {
  WLED_EFFECTS,
  WLED_PALETTES,
  listAnimations,
  createAnimation,
  updateAnimation,
  deleteAnimation,
  listPalettes,
  createPalette,
  deletePalette,
} from '../services/studioService.js'
import {
  SHAPES,
  STRATEGIES,
  CHIP_REFERENCE,
  POWER_DISCLAIMER,
  computeLayout,
  computePower,
  listObjects,
  createObject,
  updateObject,
  deleteObject,
} from '../services/studioObjects.js'

const KeyframeSchema = z.object({
  time_ms: z.number().nonnegative(),
  bri: z.number().min(0).max(255).optional(),
  col: z.string().optional(),
  fx: z.number().optional(),
  sx: z.number().min(0).max(255).optional(),
  ix: z.number().min(0).max(255).optional(),
  pal: z.number().optional(),
})

const CreateAnimationSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  duration_ms: z.number().positive().optional().default(5000),
  timeline: z.array(KeyframeSchema).optional().default([]),
})

const UpdateAnimationSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  duration_ms: z.number().positive().optional(),
  timeline: z.array(KeyframeSchema).optional(),
})

const CreatePaletteSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  colors: z.array(z.string()).min(1),
})

const StudioObjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(64),
  shape: z.enum(SHAPES),
  dims: z.record(z.number()).default({}),
  strategy: z.string().min(1),
  options: z.record(z.unknown()).default({}),
  chip: z.enum(Object.keys(CHIP_REFERENCE)).optional().default('ws2812b'),
  device_id: z.string().nullable().optional().default(null),
})

const UpdateStudioObjectSchema = StudioObjectSchema.partial()

const PreviewSchema = z.object({
  shape: z.enum(SHAPES),
  dims: z.record(z.number()).default({}),
  strategy: z.string().min(1),
  options: z.record(z.unknown()).default({}),
  chip: z.enum(Object.keys(CHIP_REFERENCE)).optional().default('ws2812b'),
})

export async function studioRoutes(fastify) {
  // GET /api/studio/effects - Catalog of WLED built-in effects
  fastify.get('/studio/effects', async () => {
    return WLED_EFFECTS
  })

  // GET /api/studio/palettes/catalog - Catalog of WLED built-in palettes
  fastify.get('/studio/palettes/catalog', async () => {
    return WLED_PALETTES
  })

  // GET /api/studio/animations
  fastify.get('/studio/animations', async () => {
    return listAnimations()
  })

  // POST /api/studio/animations
  fastify.post('/studio/animations', async (req, reply) => {
    const parsed = CreateAnimationSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const animation = createAnimation(parsed.data)
    return reply.code(201).send(animation)
  })

  // PATCH /api/studio/animations/:id
  fastify.patch('/studio/animations/:id', async (req, reply) => {
    const parsed = UpdateAnimationSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const animation = updateAnimation(req.params.id, parsed.data)
    if (!animation) return reply.code(404).send({ error: 'Animation not found' })
    return animation
  })

  // DELETE /api/studio/animations/:id
  fastify.delete('/studio/animations/:id', async (req, reply) => {
    const deleted = deleteAnimation(req.params.id)
    if (!deleted) return reply.code(404).send({ error: 'Animation not found' })
    return reply.code(204).send()
  })

  // GET /api/studio/palettes
  fastify.get('/studio/palettes', async () => {
    return listPalettes()
  })

  // POST /api/studio/palettes
  fastify.post('/studio/palettes', async (req, reply) => {
    const parsed = CreatePaletteSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const palette = createPalette(parsed.data)
    return reply.code(201).send(palette)
  })

  // DELETE /api/studio/palettes/:id
  fastify.delete('/studio/palettes/:id', async (req, reply) => {
    const deleted = deletePalette(req.params.id)
    if (!deleted) return reply.code(404).send({ error: 'Palette not found' })
    return reply.code(204).send()
  })

  // GET /api/studio/shapes - Parametric shapes, strategies, and chip reference
  fastify.get('/studio/shapes', async () => {
    return { shapes: SHAPES, strategies: STRATEGIES, chips: CHIP_REFERENCE, powerDisclaimer: POWER_DISCLAIMER }
  })

  // POST /api/studio/objects/preview - Compute layout + power without saving
  fastify.post('/studio/objects/preview', async (req, reply) => {
    const parsed = PreviewSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      const layout = computeLayout(parsed.data)
      const power = computePower({ count: layout.count, chip: parsed.data.chip })
      return { ...layout, power }
    } catch (err) {
      return reply.code(400).send({ error: err.message ?? 'Preview failed' })
    }
  })

  // GET /api/studio/objects
  fastify.get('/studio/objects', async () => {
    return listObjects()
  })

  // POST /api/studio/objects
  fastify.post('/studio/objects', async (req, reply) => {
    const parsed = StudioObjectSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      const object = createObject(parsed.data)
      return reply.code(201).send(object)
    } catch (err) {
      const code = err.statusCode ?? 400
      return reply.code(code).send({ error: err.message ?? 'Create failed' })
    }
  })

  // PATCH /api/studio/objects/:id
  fastify.patch('/studio/objects/:id', async (req, reply) => {
    const parsed = UpdateStudioObjectSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      const object = updateObject(req.params.id, parsed.data)
      if (!object) return reply.code(404).send({ error: 'Studio object not found' })
      return object
    } catch (err) {
      const code = err.statusCode ?? 400
      return reply.code(code).send({ error: err.message ?? 'Update failed' })
    }
  })

  // DELETE /api/studio/objects/:id
  fastify.delete('/studio/objects/:id', async (req, reply) => {
    const deleted = deleteObject(req.params.id)
    if (!deleted) return reply.code(404).send({ error: 'Studio object not found' })
    return reply.code(204).send()
  })
}
