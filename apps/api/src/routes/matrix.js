import { z } from 'zod'
import {
  listMatrices,
  createMatrix,
  deleteMatrix,
  listDrawings,
  saveDrawing,
  deleteDrawing,
} from '../services/matrixService.js'

const CreateMatrixSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  device_id: z.string().nullable().optional(),
  width: z.number().int().positive().optional().default(16),
  height: z.number().int().positive().optional().default(16),
})

const SaveDrawingSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  pixels: z.array(z.string()),
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
    const drawing = saveDrawing(parsed.data)
    return reply.code(201).send(drawing)
  })

  // DELETE /api/matrix/drawings/:id
  fastify.delete('/matrix/drawings/:id', async (req, reply) => {
    const deleted = deleteDrawing(req.params.id)
    if (!deleted) return reply.code(404).send({ error: 'Drawing not found' })
    return reply.code(204).send()
  })
}
