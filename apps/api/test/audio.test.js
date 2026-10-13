import test from 'node:test'
import assert from 'node:assert/strict'

const { audioRoutes } = await import('../src/routes/audio.js')
const Fastify = (await import('fastify')).default

test('Audio DDP relay: stream validation and dispatch', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(audioRoutes, { prefix: '/api' })
  await fastify.ready()

  t.after(async () => {
    await fastify.close()
  })

  await t.test('POST /api/audio/stream-ddp rejects missing target and bad triplets with 400', async () => {
    const noTarget = await fastify.inject({
      method: 'POST',
      url: '/api/audio/stream-ddp',
      payload: { pixels: [[[255, 0, 0]]] },
    })
    assert.equal(noTarget.statusCode, 400)

    const badTriplets = await fastify.inject({
      method: 'POST',
      url: '/api/audio/stream-ddp',
      payload: { target_ip: '127.0.0.1', pixels: [[[300, 0, 0]], [[0, 0]]] },
    })
    assert.equal(badTriplets.statusCode, 400)
  })

  await t.test('POST /api/audio/stream-ddp relays a valid frame with 200', async () => {
    const good = await fastify.inject({
      method: 'POST',
      url: '/api/audio/stream-ddp',
      payload: {
        target_ip: '127.0.0.1',
        pixels: Array(64).fill([0, 255, 128]),
      },
    })
    assert.equal(good.statusCode, 200)
    assert.deepEqual(JSON.parse(good.body), { status: 'sent' })
  })
})
