import { z } from 'zod'
import { exportConfig, importConfig } from '../services/configService.js'

const ImportSchema = z.object({
  mode: z.enum(['merge', 'replace']).optional().default('merge'),
  data: z.object({
    devices: z.array(z.record(z.unknown())).optional(),
    groups: z.array(z.record(z.unknown())).optional(),
    group_members: z.array(z.record(z.unknown())).optional(),
    group_children: z.array(z.record(z.unknown())).optional(),
    settings: z.array(z.record(z.unknown())).optional(),
    presets: z.array(z.record(z.unknown())).optional(),
  }),
})

export async function configRoutes(fastify) {
  // GET /api/config/export - JSON export of full dashboard state
  fastify.get('/config/export', async (req, reply) => {
    const config = exportConfig()
    reply.header('Content-Type', 'application/json')
    reply.header('Content-Disposition', 'attachment; filename="wledashboard-backup.json"')
    return config
  })

  // POST /api/config/import - Import JSON backup
  fastify.post('/config/import', async (req, reply) => {
    const parsed = ImportSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    try {
      const result = importConfig(parsed.data, parsed.data.mode)
      return result
    } catch (err) {
      return reply.code(400).send({ error: err.message ?? 'Import failed' })
    }
  })
}
