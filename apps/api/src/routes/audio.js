import { z } from 'zod'
import { sendDdpRgbFrame } from '../services/audioService.js'

const StreamDdpSchema = z.object({
  target_ip: z.string().min(1),
  pixels: z.array(z.array(z.number().min(0).max(255)).length(3)),
})

export async function audioRoutes(fastify) {
  // POST /api/audio/stream-ddp
  fastify.post('/audio/stream-ddp', async (req, reply) => {
    const parsed = StreamDdpSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    sendDdpRgbFrame(parsed.data.target_ip, parsed.data.pixels)
    return reply.code(200).send({ status: 'sent' })
  })
}
