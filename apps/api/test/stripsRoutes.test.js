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

process.env.DATA_DIR = makeTempDir('wled-strips-test-')

const { getDb } = await import('../src/db/database.js')
const { stripRoutes } = await import('../src/routes/strips.js')
const { executeRoutineNow, createRoutine, deleteRoutine, executeStripAction } = await import('../src/services/automationService.js')
const Fastify = (await import('fastify')).default

function seed(id, ip, leds = 1500) {
  getDb().prepare('INSERT INTO devices (id, name, ip_address, led_count) VALUES (?, ?, ?, ?)').run(id, id, ip, leds)
}

// HTTP is mocked at the fetch layer: real WLED URLs carry no port, so a socket
// mock would need privileged port 80, which CI runners cannot bind.
function installFetchMock(t) {
  const state = { on: true, bri: 128, seg: [{ fx: 0 }] }
  t.mock.method(globalThis, 'fetch', async (url, opts = {}) => {
    const method = String(opts?.method ?? 'GET').toUpperCase()
    if (method === 'POST' || method === 'PUT') {
      return { ok: true, status: 200, json: async () => ({ on: true }) }
    }
    return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) }
  })
}

test('virtual strip routes and automation actions', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(stripRoutes, { prefix: '/api' })
  await fastify.ready()
  t.after(async () => {
    await fastify.close()
  })

  seed('strip-r-dev', '127.0.0.41')
  t.after(() => {
    getDb().prepare('DELETE FROM devices WHERE id = ?').run('strip-r-dev')
  })

  await t.test('CRUD validates members and devices', async () => {
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/virtual-strips',
      payload: { name: 'Hall Run', members: [{ device_id: 'strip-r-dev', offset: 0, length: 30 }] },
    })
    assert.equal(created.statusCode, 201)
    const strip = JSON.parse(created.body)
    assert.equal(strip.total_leds, 30)
    assert.equal(strip.playing, undefined)

    const list = await fastify.inject({ method: 'GET', url: '/api/virtual-strips' })
    assert.equal(list.statusCode, 200)
    assert.equal(JSON.parse(list.body).some((s) => s.id === strip.id && s.playing === false), true)

    const renamed = await fastify.inject({
      method: 'PATCH',
      url: `/api/virtual-strips/${strip.id}`,
      payload: { name: 'Hall Run XL' },
    })
    assert.equal(renamed.statusCode, 200)
    assert.equal(JSON.parse(renamed.body).name, 'Hall Run XL')

    const badDevice = await fastify.inject({
      method: 'POST',
      url: '/api/virtual-strips',
      payload: { name: 'bad', members: [{ device_id: 'ghost', offset: 0, length: 4 }] },
    })
    assert.equal(badDevice.statusCode, 400)

    const overMax = await fastify.inject({
      method: 'POST',
      url: '/api/virtual-strips',
      payload: { name: 'over', members: [{ device_id: 'strip-r-dev', offset: 1400, length: 200 }] },
    })
    assert.equal(overMax.statusCode, 400)
    assert.match(JSON.parse(overMax.body).error, /exceeds the device max of 1500 LEDs/)

    const missing = await fastify.inject({ method: 'GET', url: '/api/virtual-strips/nope/status' })
    assert.equal(missing.statusCode, 404)

    const gone = await fastify.inject({ method: 'DELETE', url: `/api/virtual-strips/${strip.id}` })
    assert.equal(gone.statusCode, 200)
  })

  await t.test('play stop status cycle', async (t) => {
    installFetchMock(t)
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/virtual-strips',
      payload: { name: 'Cycle', members: [{ device_id: 'strip-r-dev', offset: 0, length: 8 }] },
    })
    const strip = JSON.parse(created.body)

    const badPattern = await fastify.inject({
      method: 'POST',
      url: `/api/virtual-strips/${strip.id}/play`,
      payload: { pattern: 'nope' },
    })
    assert.equal(badPattern.statusCode, 400)

    const play = await fastify.inject({
      method: 'POST',
      url: `/api/virtual-strips/${strip.id}/play`,
      payload: { pattern: 'chase', params: { color1: [255, 0, 0], speed: 200, direction: 1 } },
    })
    assert.equal(play.statusCode, 200)
    assert.equal(JSON.parse(play.body).playing, true)

    const status = await fastify.inject({ method: 'GET', url: `/api/virtual-strips/${strip.id}/status` })
    const body = JSON.parse(status.body)
    assert.equal(body.playing, true)
    assert.equal(body.pattern, 'chase')
    assert.equal(body.members.length, 1)

    const stop = await fastify.inject({ method: 'POST', url: `/api/virtual-strips/${strip.id}/stop` })
    assert.equal(JSON.parse(stop.body).playing, false)

    await fastify.inject({ method: 'DELETE', url: `/api/virtual-strips/${strip.id}` })
  })

  await t.test('routines and schedules drive strips', async (t) => {
    installFetchMock(t)
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/virtual-strips',
      payload: { name: 'Auto', members: [{ device_id: 'strip-r-dev', offset: 0, length: 8 }] },
    })
    const strip = JSON.parse(created.body)
    const routine = createRoutine({
      name: 'strip routine',
      steps: [{ target_type: 'strip', target_id: strip.id, payload: { pattern: 'solid', params: { color1: [1, 2, 3] } } }],
    })
    await executeRoutineNow(routine.id)
    const status = await fastify.inject({ method: 'GET', url: `/api/virtual-strips/${strip.id}/status` })
    assert.equal(JSON.parse(status.body).playing, true)
    await executeStripAction(strip.id, { action: 'stop' })
    const stopped = await fastify.inject({ method: 'GET', url: `/api/virtual-strips/${strip.id}/status` })
    assert.equal(JSON.parse(stopped.body).playing, false)
    deleteRoutine(routine.id)
    await fastify.inject({ method: 'DELETE', url: `/api/virtual-strips/${strip.id}` })
  })
})
