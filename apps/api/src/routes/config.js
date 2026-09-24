import { z } from 'zod'
import { exportConfig, importConfig, BACKUP_CATEGORIES } from '../services/configService.js'

const CATEGORY_KEYS = Object.keys(BACKUP_CATEGORIES)

const ImportSchema = z.object({
  mode: z.enum(['merge', 'replace']).optional().default('merge'),
  categories: z.array(z.enum(CATEGORY_KEYS)).optional(),
  data: z.object({
    devices:         z.array(z.record(z.unknown())).optional(),
    groups:          z.array(z.record(z.unknown())).optional(),
    group_members:   z.array(z.record(z.unknown())).optional(),
    group_children:  z.array(z.record(z.unknown())).optional(),
    settings:        z.array(z.record(z.unknown())).optional(),
    presets:         z.array(z.record(z.unknown())).optional(),
    schedules:       z.array(z.record(z.unknown())).optional(),
    routines:        z.array(z.record(z.unknown())).optional(),
    routine_steps:   z.array(z.record(z.unknown())).optional(),
    dwellings:       z.array(z.record(z.unknown())).optional(),
    floors:          z.array(z.record(z.unknown())).optional(),
    rooms:           z.array(z.record(z.unknown())).optional(),
    anchors:         z.array(z.record(z.unknown())).optional(),
    animations:      z.array(z.record(z.unknown())).optional(),
    palettes:        z.array(z.record(z.unknown())).optional(),
    matrices:        z.array(z.record(z.unknown())).optional(),
    matrix_drawings: z.array(z.record(z.unknown())).optional(),
    studio_objects: z.array(z.record(z.unknown())).optional(),
  }),
})

export async function configRoutes(fastify) {
  // GET /api/config/export - JSON export of full dashboard state (all tables)
  fastify.get('/config/export', async (req, reply) => {
    const config = exportConfig()
    reply.header('Content-Type', 'application/json')
    reply.header('Content-Disposition', 'attachment; filename="wledashboard-backup.json"')
    return config
  })

  // GET /api/config/categories - Selective restore categories and their tables
  fastify.get('/config/categories', async () => {
    return { categories: BACKUP_CATEGORIES }
  })

  // POST /api/config/import - Import JSON backup (merge or replace mode,
  // optionally scoped to a subset of categories)
  fastify.post('/config/import', async (req, reply) => {
    const parsed = ImportSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    try {
      const result = importConfig(parsed.data, parsed.data.mode, { categories: parsed.data.categories })
      return result
    } catch (err) {
      return reply.code(400).send({ error: err.message ?? 'Import failed' })
    }
  })
}
