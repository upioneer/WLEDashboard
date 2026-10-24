import { z } from 'zod'
import {
  listStrips,
  getStrip,
  createStrip,
  updateStrip,
  deleteStrip,
} from '../services/stripService.js'
import {
  playStrip,
  stopStrip,
  getStripStatus,
  isStripPlaying,
} from '../services/stripPlayer.js'
import { STRIP_PATTERN_IDS } from '../services/stripPatterns.js'

const MemberSchema = z.object({
  device_id: z.string().min(1),
  offset: z.number().int().min(0).optional().default(0),
  length: z.number().int().positive(),
  reverse: z.boolean().optional().default(false),
})

const CreateStripSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  members: z.array(MemberSchema).min(1),
  auto_resume: z.boolean().optional().default(false),
})

const UpdateStripSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  members: z.array(MemberSchema).min(1).optional(),
  auto_resume: z.boolean().optional(),
  fallback: z.object({ fxName: z.string().min(1).optional() }).passthrough().optional(),
})

const PlaySchema = z.object({
  pattern: z.enum(STRIP_PATTERN_IDS),
  params: z.object({
    color1: z.array(z.number()).optional(),
    color2: z.array(z.number()).optional(),
    speed: z.number().optional(),
    direction: z.union([z.literal(1), z.literal(-1)]).optional(),
  }).passthrough().optional().default({}),
})

function toHttpError(err, reply) {
  if (err?.message === 'Strip not found') {
    return reply.code(404).send({ error: 'Strip not found' })
  }
  return reply.code(400).send({ error: err?.message ?? 'Invalid strip request' })
}

export async function stripRoutes(fastify) {
  fastify.get('/virtual-strips', async () => {
    return listStrips().map((s) => ({ ...s, playing: isStripPlaying(s.id) }))
  })

  fastify.post('/virtual-strips', async (req, reply) => {
    const parsed = CreateStripSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return reply.code(201).send(createStrip(parsed.data))
    } catch (err) {
      return toHttpError(err, reply)
    }
  })

  fastify.get('/virtual-strips/:id', async (req, reply) => {
    const strip = getStrip(req.params.id)
    if (!strip) return reply.code(404).send({ error: 'Strip not found' })
    return { ...strip, playing: isStripPlaying(strip.id) }
  })

  fastify.patch('/virtual-strips/:id', async (req, reply) => {
    const parsed = UpdateStripSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    if (!getStrip(req.params.id)) return reply.code(404).send({ error: 'Strip not found' })
    try {
      if (parsed.data.members !== undefined && isStripPlaying(req.params.id)) {
        await stopStrip(req.params.id)
      }
      return updateStrip(req.params.id, parsed.data)
    } catch (err) {
      return toHttpError(err, reply)
    }
  })

  fastify.delete('/virtual-strips/:id', async (req, reply) => {
    if (!getStrip(req.params.id)) return reply.code(404).send({ error: 'Strip not found' })
    if (isStripPlaying(req.params.id)) {
      await stopStrip(req.params.id)
    }
    deleteStrip(req.params.id)
    return { ok: true }
  })

  fastify.post('/virtual-strips/:id/play', async (req, reply) => {
    const parsed = PlaySchema.safeParse(req.body ?? {})
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await playStrip(req.params.id, parsed.data)
    } catch (err) {
      return toHttpError(err, reply)
    }
  })

  fastify.post('/virtual-strips/:id/stop', async (req, reply) => {
    if (!getStrip(req.params.id)) return reply.code(404).send({ error: 'Strip not found' })
    return await stopStrip(req.params.id)
  })

  fastify.get('/virtual-strips/:id/status', async (req, reply) => {
    const status = getStripStatus(req.params.id)
    if (!status) return reply.code(404).send({ error: 'Strip not found' })
    return status
  })
}
