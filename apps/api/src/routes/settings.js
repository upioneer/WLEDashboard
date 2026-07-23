import { z } from 'zod'
import { getDb } from '../db/database.js'

export async function settingsRoutes(fastify) {
  fastify.get('/settings', async () => {
    const rows = getDb().prepare('SELECT key, value FROM settings').all()
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  })

  const PatchSchema = z.record(z.string().min(1), z.string())

  fastify.patch('/settings', async (req, reply) => {
    const parsed = PatchSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const db = getDb()
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    db.transaction(() => {
      for (const [key, value] of Object.entries(parsed.data)) {
        stmt.run(key, value)
      }
    })()
    return { ok: true }
  })
}
