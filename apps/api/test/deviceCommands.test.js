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

process.env.DATA_DIR = makeTempDir('wled-commands-test-')

const { sendDeviceCommand } = await import('../src/services/deviceService.js')
const { getDb } = await import('../src/db/database.js')
const { deviceRoutes } = await import('../src/routes/devices.js')
const Fastify = (await import('fastify')).default

function startMockWled({ failAfter = Infinity, status = 200 } = {}) {
  const bodies = []
  let count = 0
  const server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      count += 1
      bodies.push(JSON.parse(raw || '{}'))
      if (count > failAfter) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end('{}')
        return
      }
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ on: true }))
    })
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, bodies, port: server.address().port })
    })
  })
}

test('Device command delivery', async (t) => {
  await t.test('rapid commands coalesce: first and latest deliver, middle is skipped', async () => {
    const { server, bodies, port } = await startMockWled()
    try {
      const device = { id: 'cmd-order-1', ip_address: `127.0.0.1:${port}` }
      const results = await Promise.all([
        sendDeviceCommand(device, { bri: 10 }),
        sendDeviceCommand(device, { bri: 20 }),
        sendDeviceCommand(device, { bri: 30 }),
      ])
      assert.deepEqual(bodies.map((b) => b.bri), [10, 30])
      // Every caller still resolves: the superseded middle shares the latest result
      assert.ok(results.every((r) => r.ok))
    } finally {
      server.close()
    }
  })

  await t.test('commands to different devices do not block each other', async () => {
    const { server, bodies, port } = await startMockWled()
    try {
      const a = { id: 'cmd-iso-a', ip_address: `127.0.0.1:${port}` }
      const b = { id: 'cmd-iso-b', ip_address: `127.0.0.1:${port}` }
      await Promise.all([
        sendDeviceCommand(a, { bri: 11 }),
        sendDeviceCommand(b, { bri: 22 }),
      ])
      assert.deepEqual(bodies.map((x) => x.bri).sort(), [11, 22])
    } finally {
      server.close()
    }
  })

  await t.test('failed device POST reports ok:false instead of silent success', async () => {
    const { server, port } = await startMockWled({ failAfter: 0 })
    try {
      const device = { id: 'cmd-fail-1', ip_address: `127.0.0.1:${port}` }
      const result = await sendDeviceCommand(device, { bri: 99 })
      assert.equal(result.ok, false)
    } finally {
      server.close()
    }
  })

  await t.test('unreachable device reports ok:false', async () => {
    const device = { id: 'cmd-dead-1', ip_address: '127.0.0.1:1' }
    const result = await sendDeviceCommand(device, { bri: 99 })
    assert.equal(result.ok, false)
  })
})

test('Device refresh endpoint', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(deviceRoutes, { prefix: '/api' })
  await fastify.ready()

  t.after(async () => {
    await fastify.close()
  })

  await t.test('POST /api/devices/:id/refresh returns live state and updates cache', async () => {
    const { server, port } = await startMockWled()
    try {
      const db = getDb()
      db.prepare('INSERT INTO devices (id, name, ip_address) VALUES (?, ?, ?)')
        .run('cmd-refresh-1', 'Refresh Test', `127.0.0.1:${port}`)
      const res = await fastify.inject({ method: 'POST', url: '/api/devices/cmd-refresh-1/refresh' })
      assert.equal(res.statusCode, 200)
      const data = JSON.parse(res.body)
      assert.equal(data.on, true)
      assert.ok(typeof data._ts === 'number')
      db.prepare('DELETE FROM devices WHERE id = ?').run('cmd-refresh-1')
    } finally {
      server.close()
    }
  })

  await t.test('POST /api/devices/:id/refresh reports 404 and 502 honestly', async () => {
    const missing = await fastify.inject({ method: 'POST', url: '/api/devices/no-such-device/refresh' })
    assert.equal(missing.statusCode, 404)

    const db = getDb()
    db.prepare('INSERT INTO devices (id, name, ip_address) VALUES (?, ?, ?)')
      .run('cmd-refresh-dead', 'Dead Test', '127.0.0.1:1')
    const dead = await fastify.inject({ method: 'POST', url: '/api/devices/cmd-refresh-dead/refresh' })
    assert.equal(dead.statusCode, 502)
    db.prepare('DELETE FROM devices WHERE id = ?').run('cmd-refresh-dead')
  })
})
