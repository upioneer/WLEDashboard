import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { systemRoutes } from '../src/routes/system.js'
import { getDb } from '../src/db/database.js'

test('System routes: health, logs, diagnostics, and actions', async (t) => {
  // Ensure DB initialized
  getDb()

  const fastify = Fastify()
  await fastify.register(systemRoutes, { prefix: '/api' })
  await fastify.ready()

  t.after(async () => {
    await fastify.close()
  })

  await t.test('GET /api/system/health returns complete telemetry payload', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/api/system/health',
    })

    assert.equal(res.statusCode, 200)
    const data = JSON.parse(res.body)
    assert.ok(data.version)
    assert.ok(data.node_version)
    assert.ok(data.platform)
    assert.ok(data.memory.heap_used_formatted)
    assert.ok(data.database.size_formatted)
    assert.ok(data.poller)
    assert.ok(Array.isArray(data.network_interfaces))
  })

  await t.test('GET /api/system/time returns server clock reference', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/api/system/time',
    })

    assert.equal(res.statusCode, 200)
    const data = JSON.parse(res.body)
    assert.ok(!Number.isNaN(Date.parse(data.serverTime)))
    assert.ok(typeof data.timezone === 'string' && data.timezone.length > 0)
    assert.equal(typeof data.utcOffsetMinutes, 'number')
  })

  await t.test('GET /api/system/logs and POST /api/system/logs/clear', async () => {
    const res1 = await fastify.inject({
      method: 'GET',
      url: '/api/system/logs',
    })
    assert.equal(res1.statusCode, 200)
    const data1 = JSON.parse(res1.body)
    assert.ok(Array.isArray(data1.logs))

    const clearRes = await fastify.inject({
      method: 'POST',
      url: '/api/system/logs/clear',
    })
    assert.equal(clearRes.statusCode, 200)

    const res2 = await fastify.inject({
      method: 'GET',
      url: '/api/system/logs',
    })
    assert.equal(res2.statusCode, 200)
    const data2 = JSON.parse(res2.body)
    assert.equal(data2.logs.length, 0)
  })

  await t.test('POST /api/system/diagnostics/run executes internal checks', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/system/diagnostics/run',
    })
    assert.equal(res.statusCode, 200)
    const data = JSON.parse(res.body)
    assert.ok(data.checks)
    assert.ok(data.checks.database_rw.ok)
    assert.ok(data.checks.database_integrity.ok)
    assert.ok(data.checks.poller_health.ok)
  })

  await t.test('POST /api/system/actions/factory-reset rejects invalid confirmation', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/system/actions/factory-reset',
      payload: { confirm: 'wrong' },
    })
    assert.equal(res.statusCode, 400)
  })
})
