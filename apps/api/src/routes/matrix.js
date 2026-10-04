import { z } from 'zod'
import {
  listMatrices,
  createMatrix,
  deleteMatrix,
  listDrawings,
  saveDrawing,
  deleteDrawing,
} from '../services/matrixService.js'
import { sendDdpRgbFrame } from '../services/ddpService.js'

const CreateMatrixSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  device_id: z.string().nullable().optional(),
  width: z.number().int().positive().optional().default(16),
  height: z.number().int().positive().optional().default(16),
})

const MarqueeRowSchema = z.object({
  text: z.string().max(120),
  color: z.string().max(16),
})

const MarqueeParamsSchema = z.object({
  rows: z.array(MarqueeRowSchema).max(10).optional().default([]),
  bg: z.string().max(16).optional().default('#000000'),
  speed: z.number().min(1).max(120).optional().default(12),
  direction: z.enum(['left', 'right']).optional().default('left'),
  serpentine: z.boolean().optional().default(false),
})

const SaveDrawingSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(64).trim(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  pixels: z.array(z.string()),
  kind: z.enum(['drawing', 'marquee']).optional().default('drawing'),
  params: MarqueeParamsSchema.nullable().optional(),
})

const StreamDdpSchema = z.object({
  target_ip: z.string().min(1),
  pixels: z.array(z.array(z.number().min(0).max(255)).length(3)),
})

export async function matrixRoutes(fastify) {
  // GET /api/matrix/configs
  fastify.get('/matrix/configs', async () => {
    return listMatrices()
  })

  // POST /api/matrix/configs
  fastify.post('/matrix/configs', async (req, reply) => {
    const parsed = CreateMatrixSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const matrix = createMatrix(parsed.data)
    return reply.code(201).send(matrix)
  })

  // DELETE /api/matrix/configs/:id
  fastify.delete('/matrix/configs/:id', async (req, reply) => {
    const deleted = deleteMatrix(req.params.id)
    if (!deleted) return reply.code(404).send({ error: 'Matrix not found' })
    return reply.code(204).send()
  })

  // GET /api/matrix/drawings
  fastify.get('/matrix/drawings', async () => {
    return listDrawings()
  })

  // POST /api/matrix/drawings
  fastify.post('/matrix/drawings', async (req, reply) => {
    const parsed = SaveDrawingSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      const drawing = saveDrawing(parsed.data)
      return reply.code(201).send(drawing)
    } catch (err) {
      const code = err.statusCode ?? 400
      return reply.code(code).send({ error: err.message ?? 'Failed to save drawing' })
    }
  })

  // DELETE /api/matrix/drawings/:id
  fastify.delete('/matrix/drawings/:id', async (req, reply) => {
    const deleted = deleteDrawing(req.params.id)
    if (!deleted) return reply.code(404).send({ error: 'Drawing not found' })
    return reply.code(204).send()
  })

  // POST /api/matrix/stream-ddp
  fastify.post('/matrix/stream-ddp', async (req, reply) => {
    const parsed = StreamDdpSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    sendDdpRgbFrame(parsed.data.target_ip, parsed.data.pixels)
    return reply.code(200).send({ status: 'sent' })
  })
}
