import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

function makeTempDir(prefix) {
  try {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  } catch {
    const fallbackBase = path.join(process.cwd(), '.test-tmp')
    fs.mkdirSync(fallbackBase, { recursive: true })
    return fs.mkdtempSync(path.join(fallbackBase, `${prefix}-`))
  }
}

const tmpDir = makeTempDir('wled-settings-test-')
process.env.DATA_DIR = tmpDir

// Import after DATA_DIR is set
const { getDb } = await import('../src/db/database.js')
const { settingsRoutes } = await import('../src/routes/settings.js')
const Fastify = (await import('fastify')).default

test('Settings API PATCH and GET functionality', async () => {
  const fastify = Fastify({ logger: false })
  await fastify.register(settingsRoutes)

  // 1. PATCH with boolean false (the spatial_intro_enabled bug)
  const res1 = await fastify.inject({
    method: 'PATCH',
    url: '/settings',
    payload: { spatial_intro_enabled: false }
  })
  assert.equal(res1.statusCode, 200)
  assert.deepEqual(JSON.parse(res1.body), { ok: true })

  // 2. GET verify it persisted as string 'false'
  const get1 = await fastify.inject({ method: 'GET', url: '/settings' })
  assert.equal(get1.statusCode, 200)
  const settings1 = JSON.parse(get1.body)
  assert.equal(settings1.spatial_intro_enabled, 'false')

  // 3. PATCH with boolean true
  const res2 = await fastify.inject({
    method: 'PATCH',
    url: '/settings',
    payload: { spatial_intro_enabled: true }
  })
  assert.equal(res2.statusCode, 200)
  const get2 = await fastify.inject({ method: 'GET', url: '/settings' })
  assert.equal(JSON.parse(get2.body).spatial_intro_enabled, 'true')

  // 4. PATCH with string and number
  const res3 = await fastify.inject({
    method: 'PATCH',
    url: '/settings',
    payload: { unit_system: 'metric', poll_interval_ms: 2500 }
  })
  assert.equal(res3.statusCode, 200)
  const get3 = await fastify.inject({ method: 'GET', url: '/settings' })
  const settings3 = JSON.parse(get3.body)
  assert.equal(settings3.unit_system, 'metric')
  assert.equal(settings3.poll_interval_ms, '2500')

  // 5. PATCH with invalid object payload -> should reject with 400
  const res4 = await fastify.inject({
    method: 'PATCH',
    url: '/settings',
    payload: { invalid_key: { nested: 'object' } }
  })
  assert.equal(res4.statusCode, 400)

  // 6. PATCH with array payload -> should reject with 400
  const res5 = await fastify.inject({
    method: 'PATCH',
    url: '/settings',
    payload: { invalid_key: [1, 2, 3] }
  })
  assert.equal(res5.statusCode, 400)

  await fastify.close()
  getDb().close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})
