import { z } from 'zod'
import {
  getSystemHealth,
  runSystemDiagnostics,
  executeClearCache,
  executeRestartPoller,
  executeResetSpatial,
  executeFactoryReset,
} from '../services/systemService.js'
import { getSystemLogs, clearSystemLogs } from '../services/loggerService.js'

const FactoryResetSchema = z.object({
  confirm: z.string(),
})

export async function systemRoutes(fastify) {
  // GET /api/system/health - Process, memory, database, and poller telemetry
  fastify.get('/system/health', async () => {
    return getSystemHealth()
  })

  // GET /api/system/time - Server clock for the sidebar chip and automation reference
  fastify.get('/system/time', async () => {
    const now = new Date()
    return {
      serverTime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      utcOffsetMinutes: -now.getTimezoneOffset(),
    }
  })

  // GET /api/system/logs - Activity stream and error logs
  fastify.get('/system/logs', async (req) => {
    const limit = parseInt(req.query?.limit ?? '150', 10)
    const level = req.query?.level || null
    const logs = getSystemLogs(limit, level)
    return { logs, total: logs.length }
  })

  // POST /api/system/logs/clear - Clear activity stream
  fastify.post('/system/logs/clear', async () => {
    clearSystemLogs()
    return { ok: true }
  })

  // POST /api/system/diagnostics/run - Execute live health & connectivity diagnostics
  fastify.post('/system/diagnostics/run', async () => {
    return await runSystemDiagnostics()
  })

  // POST /api/system/actions/restart-poller - Restart all polling timers & clear cache
  fastify.post('/system/actions/restart-poller', async () => {
    return executeRestartPoller()
  })

  // POST /api/system/actions/clear-cache - Clear in-memory device state cache
  fastify.post('/system/actions/clear-cache', async () => {
    return executeClearCache()
  })

  // POST /api/system/actions/reset-spatial - Delete 3D spatial layout
  fastify.post('/system/actions/reset-spatial', async () => {
    return executeResetSpatial()
  })

  // POST /api/system/actions/factory-reset - Full factory reset of SQLite database
  fastify.post('/system/actions/factory-reset', async (req, reply) => {
    const parsed = FactoryResetSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Missing confirmation payload' })
    }

    try {
      const result = executeFactoryReset(parsed.data.confirm)
      return result
    } catch (err) {
      return reply.code(400).send({ error: err.message })
    }
  })
}
