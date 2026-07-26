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
}
