import { z } from 'zod'
import { getDb } from '../db/database.js'
import { getMqttStatus, initMqttService, publishHaDiscovery } from '../services/mqttService.js'

const ConfigureMqttSchema = z.object({
  enabled: z.boolean(),
  broker_url: z.string().min(1).trim(),
})

export async function mqttRoutes(fastify) {
  // GET /api/mqtt/status
  fastify.get('/mqtt/status', async () => {
    return getMqttStatus()
  })

  // POST /api/mqtt/configure
  fastify.post('/mqtt/configure', async (req, reply) => {
    const parsed = ConfigureMqttSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const db = getDb()
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('mqtt_enabled', ?)").run(parsed.data.enabled ? '1' : '0')
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('mqtt_broker_url', ?)").run(parsed.data.broker_url)

    initMqttService()
    return getMqttStatus()
  })

  // POST /api/mqtt/discover
  fastify.post('/mqtt/discover', async (req, reply) => {
    publishHaDiscovery()
    return { status: 'published' }
  })
}
