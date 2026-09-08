import crypto from 'crypto'
import { z } from 'zod'
import { getDb } from '../db/database.js'

export async function settingsRoutes(fastify) {
  fastify.get('/settings', async () => {
    const rows = getDb().prepare('SELECT key, value FROM settings').all()
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
    
    // Auto-generate an API token if one does not exist yet
    if (!settings.api_token) {
      const generated = 'wled_' + crypto.randomBytes(24).toString('hex')
      getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('api_token', generated)
      settings.api_token = generated
    }
    
    return settings
  })

  // Regenerate long-lived API token
  fastify.post('/settings/api-token/regenerate', async () => {
    const newToken = 'wled_' + crypto.randomBytes(24).toString('hex')
    getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('api_token', newToken)
    return { api_token: newToken }
  })

  const PatchSchema = z.record(z.string().min(1), z.union([z.string(), z.number()]))

  fastify.patch('/settings', async (req, reply) => {
    const parsed = PatchSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    const db = getDb()
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    db.transaction(() => {
      for (const [key, value] of Object.entries(parsed.data)) {
        stmt.run(key, String(value))
      }
    })()
    return { ok: true }
  })
}

