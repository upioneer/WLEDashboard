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

process.env.DATA_DIR = makeTempDir('wled-fxresolve-test-')

const { sendDeviceCommand, resolvePayloadFxNames, getDeviceEffects } = await import('../src/services/deviceService.js')
const { createGroup, deleteGroup, sendGroupCommand } = await import('../src/services/groupService.js')
const { getDb } = await import('../src/db/database.js')
const { deviceRoutes } = await import('../src/routes/devices.js')
const Fastify = (await import('fastify')).default

// Old firmware ordering (static catalog era): Candle at 41.
const EFF_OLD = ['Solid', 'Blink', 'Breathe', 'Wipe', 'Wipe Random', 'Random Colors', 'Sweep', 'Dynamic', 'Colorloop', 'Rainbow', 'Scan', 'Dual Scan']
while (EFF_OLD.length < 41) EFF_OLD.push(`Filler ${EFF_OLD.length}`)
EFF_OLD.push('Candle')

// 0.16.x ordering (issue #6): Dissolve Rnd inserted early, Candle at 88, renames applied.
const EFF_NEW = ['Solid', 'Blink', 'Breathe', 'Wipe', 'Wipe Random', 'Random Colors', 'Sweep', 'Dynamic', 'Colorloop', 'Rainbow', 'Scan', 'Scan Dual', 'Fade', 'Theater', 'Theater Rainbow', 'Running', 'Saw', 'Twinkle', 'Dissolve', 'Dissolve Rnd']
while (EFF_NEW.length < 88) EFF_NEW.push(`Filler ${EFF_NEW.length}`)
EFF_NEW.push('Candle')

function startMockWled(effects) {
  const bodies = []
  let effHits = 0
  const server = http.createServer((req, res) => {
    if (req.url === '/json/eff') {
      effHits += 1
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(effects))
      return
    }
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      bodies.push(JSON.parse(raw || '{}'))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ on: true }))
    })
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, bodies, port: server.address().port, effHits: () => effHits })
    })
  })
}

function seed(id, ip) {
  getDb().prepare('INSERT INTO devices (id, name, ip_address) VALUES (?, ?, ?)').run(id, id, ip)
}

function unseed(id) {
  getDb().prepare('DELETE FROM devices WHERE id = ?').run(id)
}

test('fxName resolution against live effect lists', async (t) => {
  await t.test('drifted name resolves to the live index (Candle 41 -> 88)', async () => {
    const { server, bodies, port } = await startMockWled(EFF_NEW)
    try {
      seed('fx-new-1', `127.0.0.1:${port}`)
      const out = await sendDeviceCommand(
        { id: 'fx-new-1', ip_address: `127.0.0.1:${port}` },
        { seg: [{ fx: 41, fxName: 'Candle' }] },
      )
      assert.equal(out.ok, true)
      assert.equal(bodies.length, 1)
      assert.equal(bodies[0].seg[0].fx, 88)
      assert.equal('fxName' in bodies[0].seg[0], false)
      unseed('fx-new-1')
    } finally {
      server.close()
    }
  })

  await t.test('old firmware keeps its own index for the same name', async () => {
    const { server, bodies, port } = await startMockWled(EFF_OLD)
    try {
      const out = await sendDeviceCommand(
        { id: 'fx-old-1', ip_address: `127.0.0.1:${port}` },
        { seg: [{ fx: 41, fxName: 'Candle' }] },
      )
      assert.equal(out.ok, true)
      assert.equal(bodies[0].seg[0].fx, 41)
    } finally {
      server.close()
    }
  })

  await t.test('renamed effects resolve through the alias table', async () => {
    const { server, bodies, port } = await startMockWled(EFF_NEW)
    try {
      await sendDeviceCommand(
        { id: 'fx-alias-1', ip_address: `127.0.0.1:${port}` },
        { seg: [{ fx: 11, fxName: 'Dual Scan' }] },
      )
      assert.equal(bodies[0].seg[0].fx, 11) // Scan Dual lives at 11 on new firmware
    } finally {
      server.close()
    }
  })

  await t.test('unknown names keep the numeric fallback and strip the tag', async () => {
    const { server, bodies, port } = await startMockWled(EFF_NEW)
    try {
      await sendDeviceCommand(
        { id: 'fx-gone-1', ip_address: `127.0.0.1:${port}` },
        { seg: [{ fx: 37, fxName: 'Merry Christmas' }] },
      )
      assert.equal(bodies[0].seg[0].fx, 37)
      assert.equal('fxName' in bodies[0].seg[0], false)
    } finally {
      server.close()
    }
  })

  await t.test('payloads without fxName skip resolution untouched', async () => {
    const { server, port, effHits } = await startMockWled(EFF_NEW)
    try {
      const payload = { seg: [{ fx: 41 }] }
      const out = await resolvePayloadFxNames({ id: 'fx-skip-1', ip_address: `127.0.0.1:${port}` }, payload)
      assert.equal(out, payload)
      assert.equal(effHits(), 0)
    } finally {
      server.close()
    }
  })

  await t.test('effect lists are cached across sends', async () => {
    const { server, port, effHits } = await startMockWled(EFF_NEW)
    const device = { id: 'fx-cache-1', ip_address: `127.0.0.1:${port}` }
    try {
      await sendDeviceCommand(device, { seg: [{ fx: 0, fxName: 'Solid' }] })
      await sendDeviceCommand(device, { seg: [{ fx: 0, fxName: 'Solid' }] })
      assert.equal(effHits(), 1)
    } finally {
      server.close()
    }
  })

  await t.test('group members resolve against their own firmware', async () => {
    const mockA = await startMockWled(EFF_OLD)
    const mockB = await startMockWled(EFF_NEW)
    try {
      seed('fx-grp-a', `127.0.0.1:${mockA.port}`)
      seed('fx-grp-b', `127.0.0.1:${mockB.port}`)
      const group = createGroup({ name: 'fx group' })
      const db = getDb()
      db.prepare('INSERT INTO group_members (group_id, device_id) VALUES (?, ?)').run(group.id, 'fx-grp-a')
      db.prepare('INSERT INTO group_members (group_id, device_id) VALUES (?, ?)').run(group.id, 'fx-grp-b')
      await sendGroupCommand(group.id, { seg: [{ fx: 41, fxName: 'Candle' }] })
      assert.equal(mockA.bodies[0].seg[0].fx, 41)
      assert.equal(mockB.bodies[0].seg[0].fx, 88)
      db.prepare('DELETE FROM group_members WHERE group_id = ?').run(group.id)
      deleteGroup(group.id)
      unseed('fx-grp-a')
      unseed('fx-grp-b')
    } finally {
      mockA.server.close()
      mockB.server.close()
    }
  })

  await t.test('unreachable devices keep the fallback and fail honestly downstream', async () => {
    const out = await sendDeviceCommand(
      { id: 'fx-dead-1', ip_address: '127.0.0.1:1' },
      { seg: [{ fx: 41, fxName: 'Candle' }] },
    )
    assert.equal(out.ok, false)
  })
})

test('GET /api/devices/:id/effects endpoint', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(deviceRoutes, { prefix: '/api' })
  await fastify.ready()

  t.after(async () => {
    await fastify.close()
  })

  await t.test('returns the live list and honest 404/502', async () => {
    const { server, port } = await startMockWled(EFF_NEW)
    try {
      seed('fx-ep-1', `127.0.0.1:${port}`)
      seed('fx-ep-dead', '127.0.0.1:1')
      const res = await fastify.inject({ method: 'GET', url: '/api/devices/fx-ep-1/effects' })
      assert.equal(res.statusCode, 200)
      assert.deepEqual(JSON.parse(res.body).effects, EFF_NEW)

      const missing = await fastify.inject({ method: 'GET', url: '/api/devices/nope/effects' })
      assert.equal(missing.statusCode, 404)

      const dead = await fastify.inject({ method: 'GET', url: '/api/devices/fx-ep-dead/effects' })
      assert.equal(dead.statusCode, 502)
      unseed('fx-ep-1')
      unseed('fx-ep-dead')
    } finally {
      server.close()
    }
  })

  await t.test('getDeviceEffects validates the payload shape', async () => {
    const { server, port } = await startMockWled({ not: 'a list' })
    try {
      const out = await getDeviceEffects({ id: 'fx-shape-1', ip_address: `127.0.0.1:${port}` })
      assert.equal(out, null)
    } finally {
      server.close()
    }
  })
})
