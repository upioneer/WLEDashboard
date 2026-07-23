import { z } from 'zod'
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  executeScheduleAction,
  listRoutines,
  getRoutine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  executeRoutineNow,
  getSunTimes,
} from '../services/automationService.js'

// ─── Validation Schemas ───────────────────────────────────────────────────────

const TriggerTypeSchema = z.enum(['time', 'sunrise', 'sunset'])
const TargetTypeSchema  = z.enum(['device', 'group', 'routine'])

const CreateScheduleSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  trigger_type: TriggerTypeSchema.optional().default('time'),
  trigger_value: z.string().optional().default('12:00'),
  target_type: TargetTypeSchema.optional().default('device'),
  target_id: z.string(),
  payload: z.record(z.unknown()).optional().default({}),
  enabled: z.boolean().optional().default(true),
})

const UpdateScheduleSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  trigger_type: TriggerTypeSchema.optional(),
  trigger_value: z.string().optional(),
  target_type: TargetTypeSchema.optional(),
  target_id: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
})

const RoutineStepSchema = z.object({
  target_type: z.enum(['device', 'group']),
  target_id: z.string(),
  payload: z.record(z.unknown()).optional().default({}),
  delay_ms: z.number().int().min(0).optional().default(0),
})

const CreateRoutineSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  description: z.string().optional().default(''),
  steps: z.array(RoutineStepSchema).optional().default([]),
  enabled: z.boolean().optional().default(true),
})

const UpdateRoutineSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  description: z.string().optional(),
  steps: z.array(RoutineStepSchema).optional(),
  enabled: z.boolean().optional(),
})

// ─── Route Registration ───────────────────────────────────────────────────────

export async function automationRoutes(fastify) {
  // GET /api/automation/schedules
  fastify.get('/automation/schedules', async () => {
    return listSchedules()
  })

  // POST /api/automation/schedules
  fastify.post('/automation/schedules', async (req, reply) => {
    const parsed = CreateScheduleSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const schedule = createSchedule(parsed.data)
    return reply.code(201).send(schedule)
  })

  // PATCH /api/automation/schedules/:id
  fastify.patch('/automation/schedules/:id', async (req, reply) => {
    const existing = getSchedule(req.params.id)
    if (!existing) return reply.code(404).send({ error: 'Schedule not found' })
    const parsed = UpdateScheduleSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    return updateSchedule(req.params.id, parsed.data)
  })

  // DELETE /api/automation/schedules/:id
  fastify.delete('/automation/schedules/:id', async (req, reply) => {
    const existing = getSchedule(req.params.id)
    if (!existing) return reply.code(404).send({ error: 'Schedule not found' })
    deleteSchedule(req.params.id)
    return reply.code(204).send()
  })

  // POST /api/automation/schedules/:id/trigger - Trigger action now
  fastify.post('/automation/schedules/:id/trigger', async (req, reply) => {
    const schedule = getSchedule(req.params.id)
    if (!schedule) return reply.code(404).send({ error: 'Schedule not found' })
    await executeScheduleAction(schedule)
    return { ok: true }
  })

  // GET /api/automation/routines
  fastify.get('/automation/routines', async () => {
    return listRoutines()
  })

  // POST /api/automation/routines
  fastify.post('/automation/routines', async (req, reply) => {
    const parsed = CreateRoutineSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const routine = createRoutine(parsed.data)
    return reply.code(201).send(routine)
  })

  // PATCH /api/automation/routines/:id
  fastify.patch('/automation/routines/:id', async (req, reply) => {
    const existing = getRoutine(req.params.id)
    if (!existing) return reply.code(404).send({ error: 'Routine not found' })
    const parsed = UpdateRoutineSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    return updateRoutine(req.params.id, parsed.data)
  })

  // DELETE /api/automation/routines/:id
  fastify.delete('/automation/routines/:id', async (req, reply) => {
    const existing = getRoutine(req.params.id)
    if (!existing) return reply.code(404).send({ error: 'Routine not found' })
    deleteRoutine(req.params.id)
    return reply.code(204).send()
  })

  // POST /api/automation/routines/:id/execute - Run routine timeline now
  fastify.post('/automation/routines/:id/execute', async (req, reply) => {
    const routine = getRoutine(req.params.id)
    if (!routine) return reply.code(404).send({ error: 'Routine not found' })
    executeRoutineNow(req.params.id).catch(() => {})
    return { ok: true, message: 'Routine execution started' }
  })

  // GET /api/automation/suntimes - Astronomical sunrise/sunset times
  fastify.get('/automation/suntimes', async () => {
    return getSunTimes()
  })
}
