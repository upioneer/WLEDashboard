import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
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

process.env.DATA_DIR = makeTempDir('wled-syncleds-test-')

const { syncDeviceLedCounts, getDevice } = await import('../src/services/deviceService.js')
const { getDb } = await import('../src/db/database.js')
const { deviceRoutes } = await import('../src/routes/devices.js')
const Fastify = (await import('fastify')).default

function startMockWled({ info = {}, state = null, status = 200 } = {}) {
  const server = http.createServer((req, res) => {
    if (req.url === '/json/info') {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(info))
      return
    }
    if (req.url === '/json/state' && state) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(state))
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end('{}')
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port })
    })
  })
}

function seed(id, name, ip, leds = null) {
  getDb().prepare('INSERT INTO devices (id, name, ip_address, led_count) VALUES (?, ?, ?, ?)').run(id, name, ip, leds)
}

function unseed(id) {
  getDb().prepare('DELETE FROM devices WHERE id = ?').run(id)
}

test('syncDeviceLedCounts pulls and persists controller LED counts', async (t) => {
  await t.test('changed count is written, identical count is unchanged', async () => {
    const { server, port } = await startMockWled({ info: { name: 'Porch', leds: { count: 300 } } })
    try {
      seed('led-1', 'Old', `127.0.0.1:${port}`, 150)
      seed('led-2', 'Same', `127.0.0.1:${port}`, 300)
      const out = await syncDeviceLedCounts(['led-1', 'led-2'])
      assert.equal(out.updated, 1)
      assert.equal(out.unchanged, 1)
      assert.equal(out.failed, 0)
      assert.equal(getDevice('led-1').led_count, 300)
      assert.equal(getDevice('led-2').led_count, 300)
      unseed('led-1')
      unseed('led-2')
    } finally {
      server.close()
    }
  })

  await t.test('missing leds.count falls back to the highest segment stop', async () => {
    const { server, port } = await startMockWled({
      info: { name: 'Seggy' },
      state: { seg: [{ start: 0, stop: 120 }, { start: 120, stop: 250 }] },
    })
    try {
      seed('led-seg', 'Seggy', `127.0.0.1:${port}`)
      const out = await syncDeviceLedCounts(['led-seg'])
      assert.equal(out.updated, 1)
      assert.equal(getDevice('led-seg').led_count, 250)
      unseed('led-seg')
    } finally {
      server.close()
    }
  })

  await t.test('no count anywhere fails honestly without touching the DB', async () => {
    const { server, port } = await startMockWled({ info: { name: 'Bare' }, state: { seg: [] } })
    try {
      seed('led-bare', 'Bare', `127.0.0.1:${port}`, 42)
      const out = await syncDeviceLedCounts(['led-bare', 'no-such-device'])
      assert.equal(out.failed, 2)
      assert.match(out.results.find((r) => r.id === 'led-bare').error, /no LED count/i)
      assert.equal(out.results.find((r) => r.id === 'no-such-device').error, 'Unknown device')
      assert.equal(getDevice('led-bare').led_count, 42)
      unseed('led-bare')
    } finally {
      server.close()
    }
  })

  await t.test('unreachable device fails honestly without touching the DB', async () => {
    seed('led-dead', 'Keep Me', '127.0.0.1:1', 42)
    try {
      const out = await syncDeviceLedCounts(['led-dead'])
      assert.equal(out.failed, 1)
      assert.equal(out.results[0].ok, false)
      assert.ok(out.results[0].error.length > 0)
      assert.equal(getDevice('led-dead').led_count, 42)
    } finally {
      unseed('led-dead')
    }
  })

  await t.test('aborted requests report a timeout message', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => {
      const err = new Error('This operation was aborted')
      err.name = 'AbortError'
      throw err
    })
    seed('led-abort', 'Keep Me', '127.0.0.1:9', 42)
    try {
      const out = await syncDeviceLedCounts(['led-abort'])
      assert.equal(out.failed, 1)
      assert.equal(out.results[0].error, 'Request timed out')
      assert.equal(getDevice('led-abort').led_count, 42)
    } finally {
      unseed('led-abort')
    }
  })

  await t.test('omitted ids syncs every device', async () => {
    const { server, port } = await startMockWled({ info: { name: 'Everywhere', leds: { count: 64 } } })
    try {
      seed('led-all-a', 'A', `127.0.0.1:${port}`)
      seed('led-all-b', 'B', `127.0.0.1:${port}`)
      const out = await syncDeviceLedCounts()
      assert.equal(out.updated, 2)
      assert.equal(getDevice('led-all-a').led_count, 64)
      unseed('led-all-a')
      unseed('led-all-b')
    } finally {
      server.close()
    }
  })
})

test('POST /api/devices/sync-led-counts endpoint', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(deviceRoutes, { prefix: '/api' })
  await fastify.ready()

  t.after(async () => {
    await fastify.close()
  })

  await t.test('syncs selected ids and rejects a non-array body', async () => {
    const { server, port } = await startMockWled({ info: { name: 'Route Strip', leds: { count: 90 } } })
    try {
      seed('led-route-1', 'Before', `127.0.0.1:${port}`)
      seed('led-route-2', 'Untouched', `127.0.0.1:${port}`, 7)
      const res = await fastify.inject({ method: 'POST', url: '/api/devices/sync-led-counts', payload: { ids: ['led-route-1'] } })
      assert.equal(res.statusCode, 200)
      const data = JSON.parse(res.body)
      assert.equal(data.updated, 1)
      assert.equal(data.results.length, 1)
      assert.equal(getDevice('led-route-1').led_count, 90)
      assert.equal(getDevice('led-route-2').led_count, 7)

      const bad = await fastify.inject({ method: 'POST', url: '/api/devices/sync-led-counts', payload: { ids: 'nope' } })
      assert.equal(bad.statusCode, 400)
      unseed('led-route-1')
      unseed('led-route-2')
    } finally {
      server.close()
    }
  })
})
