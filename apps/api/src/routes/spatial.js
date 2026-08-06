import { z } from 'zod'
import {
  getSpatialHierarchy,
  createDwelling,
  createFloor,
  createRoom,
  updateRoom,
  deleteRoom,
  createAnchor,
  updateAnchor,
  deleteAnchor,
} from '../services/spatialService.js'

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateRoomSchema = z.object({
  floor_id: z.string(),
  name: z.string().min(1).max(64).trim(),
  width: z.number().positive().optional().default(4.0),
  depth: z.number().positive().optional().default(4.0),
  position_x: z.number().optional().default(0),
  position_y: z.number().optional().default(0),
})

const UpdateRoomSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  width: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
})

const CreateAnchorSchema = z.object({
  room_id: z.string(),
  device_id: z.string().nullable().optional(),
  name: z.string().min(1).max(64).trim(),
  type: z.string().optional().default('line_horizontal'),
  offset_x: z.number().optional().default(0),
  offset_y: z.number().optional().default(1.0),
  offset_z: z.number().optional().default(0),
  rotation_y: z.number().optional().default(0),
  length: z.number().positive().optional().default(3.5),
  led_density: z.number().positive().optional().default(30),
})

const UpdateAnchorSchema = z.object({
  room_id: z.string().optional(),
  device_id: z.string().nullable().optional(),
  name: z.string().min(1).max(64).trim().optional(),
  type: z.string().optional(),
  offset_x: z.number().optional(),
  offset_y: z.number().optional(),
  offset_z: z.number().optional(),
  rotation_y: z.number().optional(),
  length: z.number().positive().optional(),
  led_density: z.number().positive().optional(),
})

// ─── Route Registration ───────────────────────────────────────────────────────

export async function spatialRoutes(fastify) {
  // GET /api/spatial/hierarchy - full 3D spatial tree
  fastify.get('/spatial/hierarchy', async () => {
    return getSpatialHierarchy()
  })

  // POST /api/spatial/dwellings
  fastify.post('/spatial/dwellings', async (req, reply) => {
    const { name } = req.body || {}
    if (!name) return reply.code(400).send({ error: 'Name required' })
    const dwelling = createDwelling({ name })
    return reply.code(201).send(dwelling)
  })

  // POST /api/spatial/floors
  fastify.post('/spatial/floors', async (req, reply) => {
    const { dwelling_id, name, elevation } = req.body || {}
    if (!dwelling_id || !name) return reply.code(400).send({ error: 'dwelling_id and name required' })
    const floor = createFloor({ dwelling_id, name, elevation })
    return reply.code(201).send(floor)
  })

  // POST /api/spatial/rooms
  fastify.post('/spatial/rooms', async (req, reply) => {
    const parsed = CreateRoomSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const room = createRoom(parsed.data)
    return reply.code(201).send(room)
  })

  // PATCH /api/spatial/rooms/:id
  fastify.patch('/spatial/rooms/:id', async (req, reply) => {
    const parsed = UpdateRoomSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const room = updateRoom(req.params.id, parsed.data)
    return room
  })

  // DELETE /api/spatial/rooms/:id
  fastify.delete('/spatial/rooms/:id', async (req, reply) => {
    deleteRoom(req.params.id)
    return reply.code(204).send()
  })

  // POST /api/spatial/anchors
  fastify.post('/spatial/anchors', async (req, reply) => {
    const parsed = CreateAnchorSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const anchor = createAnchor(parsed.data)
    return reply.code(201).send(anchor)
  })

  // PATCH /api/spatial/anchors/:id
  fastify.patch('/spatial/anchors/:id', async (req, reply) => {
    const parsed = UpdateAnchorSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const anchor = updateAnchor(req.params.id, parsed.data)
    return anchor
  })

  // DELETE /api/spatial/anchors/:id
  fastify.delete('/spatial/anchors/:id', async (req, reply) => {
    deleteAnchor(req.params.id)
    return reply.code(204).send()
  })
}
