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

process.env.DATA_DIR = makeTempDir('wled-syncnames-test-')

const { syncDeviceNames, getDevice } = await import('../src/services/deviceService.js')
const { getDb } = await import('../src/db/database.js')
const { deviceRoutes } = await import('../src/routes/devices.js')
const Fastify = (await import('fastify')).default

function startMockWled({ name = 'Porch Strip', status = 200 } = {}) {
  const server = http.createServer((req, res) => {
    if (req.url === '/json/info') {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ name }))
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

function seed(id, name, ip) {
  getDb().prepare('INSERT INTO devices (id, name, ip_address) VALUES (?, ?, ?)').run(id, name, ip)
}

function unseed(id) {
  getDb().prepare('DELETE FROM devices WHERE id = ?').run(id)
}

test('syncDeviceNames pulls and persists controller names', async (t) => {
  await t.test('changed name is written, identical name is unchanged', async () => {
    const { server, port } = await startMockWled({ name: 'Porch Strip' })
    try {
      seed('sync-1', 'Old Name', `127.0.0.1:${port}`)
      seed('sync-2', 'Porch Strip', `127.0.0.1:${port}`)
      const out = await syncDeviceNames(['sync-1', 'sync-2'])
      assert.equal(out.updated, 1)
      assert.equal(out.unchanged, 1)
      assert.equal(out.failed, 0)
      assert.equal(getDevice('sync-1').name, 'Porch Strip')
      assert.equal(getDevice('sync-2').name, 'Porch Strip')
      unseed('sync-1')
      unseed('sync-2')
    } finally {
      server.close()
    }
  })

  await t.test('unreachable device fails honestly without touching the DB', async () => {
    seed('sync-dead', 'Keep Me', '127.0.0.1:1')
    try {
      const out = await syncDeviceNames(['sync-dead'])
      assert.equal(out.failed, 1)
      assert.equal(out.results[0].ok, false)
      assert.ok(out.results[0].error.length > 0)
      assert.equal(getDevice('sync-dead').name, 'Keep Me')
    } finally {
      unseed('sync-dead')
    }
  })

  await t.test('empty reported name fails and unknown ids are reported', async () => {
    const { server, port } = await startMockWled({ name: '   ' })
    try {
      seed('sync-empty', 'Keep Me', `127.0.0.1:${port}`)
      const out = await syncDeviceNames(['sync-empty', 'no-such-device'])
      assert.equal(out.failed, 2)
      assert.match(out.results.find((r) => r.id === 'sync-empty').error, /empty/i)
      assert.equal(out.results.find((r) => r.id === 'no-such-device').error, 'Unknown device')
      assert.equal(getDevice('sync-empty').name, 'Keep Me')
      unseed('sync-empty')
    } finally {
      server.close()
    }
  })

  await t.test('aborted requests report a timeout message', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => {
      const err = new Error('This operation was aborted')
      err.name = 'AbortError'
      throw err
    })
    seed('sync-abort', 'Keep Me', '127.0.0.1:9')
    try {
      const out = await syncDeviceNames(['sync-abort'])
      assert.equal(out.failed, 1)
      assert.equal(out.results[0].error, 'Request timed out')
      assert.equal(getDevice('sync-abort').name, 'Keep Me')
    } finally {
      unseed('sync-abort')
    }
  })

  await t.test('omitted ids syncs every device', async () => {
    const { server, port } = await startMockWled({ name: 'Everywhere' })
    try {
      seed('sync-all-a', 'A', `127.0.0.1:${port}`)
      seed('sync-all-b', 'B', `127.0.0.1:${port}`)
      const out = await syncDeviceNames()
      assert.equal(out.updated, 2)
      assert.equal(getDevice('sync-all-a').name, 'Everywhere')
      unseed('sync-all-a')
      unseed('sync-all-b')
    } finally {
      server.close()
    }
  })
})

test('POST /api/devices/sync-names endpoint', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(deviceRoutes, { prefix: '/api' })
  await fastify.ready()

  t.after(async () => {
    await fastify.close()
  })

  await t.test('syncs selected ids and rejects a non-array body', async () => {
    const { server, port } = await startMockWled({ name: 'Route Strip' })
    try {
      seed('sync-route-1', 'Before', `127.0.0.1:${port}`)
      seed('sync-route-2', 'Untouched', `127.0.0.1:${port}`)
      const res = await fastify.inject({ method: 'POST', url: '/api/devices/sync-names', payload: { ids: ['sync-route-1'] } })
      assert.equal(res.statusCode, 200)
      const data = JSON.parse(res.body)
      assert.equal(data.updated, 1)
      assert.equal(data.results.length, 1)
      assert.equal(getDevice('sync-route-1').name, 'Route Strip')
      assert.equal(getDevice('sync-route-2').name, 'Untouched')

      const bad = await fastify.inject({ method: 'POST', url: '/api/devices/sync-names', payload: { ids: 'nope' } })
      assert.equal(bad.statusCode, 400)
      unseed('sync-route-1')
      unseed('sync-route-2')
    } finally {
      server.close()
    }
  })
})
