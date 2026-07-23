import { z } from 'zod'
import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  sendGroupCommand,
} from '../services/groupService.js'

// ─── Validation Schemas ───────────────────────────────────────────────────────

const GroupTypeSchema = z.enum(['zone', 'scene', 'sync', 'custom'])

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  type: GroupTypeSchema.optional().default('custom'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#8b5cf6'),
  device_ids: z.array(z.string().uuid()).optional().default([]),
  child_group_ids: z.array(z.string().uuid()).optional().default([]),
})

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  type: GroupTypeSchema.optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sort_order: z.number().int().min(0).optional(),
  device_ids: z.array(z.string().uuid()).optional(),
  child_group_ids: z.array(z.string().uuid()).optional(),
})

const ReorderGroupsSchema = z.object({
  ids: z.array(z.string().uuid()),
})

const CommandSchema = z.record(z.unknown())

// ─── Route Registration ───────────────────────────────────────────────────────

export async function groupRoutes(fastify) {
  // GET /api/groups - list all groups
  fastify.get('/groups', async () => {
    return listGroups()
  })

  // GET /api/groups/:id - single group
  fastify.get('/groups/:id', async (req, reply) => {
    const group = getGroup(req.params.id)
    if (!group) return reply.code(404).send({ error: 'Group not found' })
    return group
  })

  // POST /api/groups - create group
  fastify.post('/groups', async (req, reply) => {
    const parsed = CreateGroupSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const group = createGroup(parsed.data)
    return reply.code(201).send(group)
  })

  // PATCH /api/groups/:id - update group
  fastify.patch('/groups/:id', async (req, reply) => {
    const group = getGroup(req.params.id)
    if (!group) return reply.code(404).send({ error: 'Group not found' })
    const parsed = UpdateGroupSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    return updateGroup(req.params.id, parsed.data)
  })

  // DELETE /api/groups/:id - delete group
  fastify.delete('/groups/:id', async (req, reply) => {
    const group = getGroup(req.params.id)
    if (!group) return reply.code(404).send({ error: 'Group not found' })
    deleteGroup(req.params.id)
    return reply.code(204).send()
  })

  // POST /api/groups/reorder - update sort order of groups
  fastify.post('/groups/reorder', async (req, reply) => {
    const parsed = ReorderGroupsSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    reorderGroups(parsed.data.ids)
    return { ok: true }
  })

  // POST /api/groups/:id/command - dispatch command to all devices in group
  fastify.post('/groups/:id/command', async (req, reply) => {
    const group = getGroup(req.params.id)
    if (!group) return reply.code(404).send({ error: 'Group not found' })
    const parsed = CommandSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const result = await sendGroupCommand(group.id, parsed.data)
    return result
  })
}
