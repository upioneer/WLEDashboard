import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import dgram from 'dgram'
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

process.env.DATA_DIR = makeTempDir('wled-strip-test-')

const { createStrip, deleteStrip } = await import('../src/services/stripService.js')
const { renderStripFrame } = await import('../src/services/stripPatterns.js')
const { playStrip, stopStrip, getStripStatus } = await import('../src/services/stripPlayer.js')
const { getDb } = await import('../src/db/database.js')

function startMockDevice(ip) {
  const posts = []
  const server = http.createServer((req, res) => {
    if (req.url === '/json/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ name: 'Mock', arch: 'esp32' }))
      return
    }
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ on: false, bri: 100, seg: [{ fx: 0 }] }))
      return
    }
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      try { posts.push(JSON.parse(raw || '{}')) } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ on: true }))
    })
  })
  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(80, ip, () => resolve({ server, posts }))
  })
}

function startDdpCapture(ip) {
  const packets = []
  const sock = dgram.createSocket('udp4')
  return new Promise((resolve, reject) => {
    sock.on('error', reject)
    sock.on('message', (msg) => packets.push(Buffer.from(msg)))
    sock.bind(4048, ip, () => resolve({ sock, packets }))
  })
}

function parseDdp(buf) {
  const offset = buf.readUInt32BE(4)
  const length = buf.readUInt16BE(8)
  const push = (buf[0] & 0x40) !== 0
  const pixels = []
  for (let i = 0; i < length; i += 3) {
    pixels.push([buf[10 + i], buf[10 + i + 1], buf[10 + i + 2]])
  }
  return { offset, length, push, pixels }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function seed(id, ip, leds = 1500) {
  getDb().prepare('INSERT INTO devices (id, name, ip_address, led_count) VALUES (?, ?, ?, ?)').run(id, id, ip, leds)
}

test('virtual strip player', async (t) => {
  await t.test('play slices one frame across members with DDP offsets', async () => {
    const devA = await startMockDevice('127.0.0.11')
    const devB = await startMockDevice('127.0.0.12')
    const ddpA = await startDdpCapture('127.0.0.11')
    const ddpB = await startDdpCapture('127.0.0.12')
    try {
      seed('strip-a', '127.0.0.11')
      seed('strip-b', '127.0.0.12')
      const strip = createStrip({
        name: ' halves',
        members: [
          { device_id: 'strip-a', offset: 0, length: 10 },
          { device_id: 'strip-b', offset: 5, length: 10 },
        ],
      })
      await playStrip(strip.id, {
        pattern: 'gradient',
        params: { color1: [0, 0, 0], color2: [190, 0, 0] },
      }, { tickMs: 30, pingMs: 60000 })
      await sleep(200)
      await stopStrip(strip.id, { restore: false })

      const forA = ddpA.packets.map(parseDdp)
      const forB = ddpB.packets.map(parseDdp)
      assert.ok(forA.length > 0 && forB.length > 0)
      // A renders virtual LEDs 0..9 of a 20 LED black to red gradient.
      assert.deepEqual(forA[0].pixels[0], [0, 0, 0])
      assert.deepEqual(forA[0].pixels[9], [90, 0, 0])
      assert.equal(forA[0].offset, 0)
      // B renders virtual LEDs 10..19 starting at its own LED offset 5.
      assert.deepEqual(forB[0].pixels[0], [100, 0, 0])
      assert.deepEqual(forB[0].pixels[9], [190, 0, 0])
      assert.equal(forB[0].offset, 15)
      assert.equal(forA[0].push, true)

      deleteStrip(strip.id)
      getDb().prepare('DELETE FROM devices WHERE id IN (?, ?)').run('strip-a', 'strip-b')
    } finally {
      devA.server.close()
      devB.server.close()
      ddpA.sock.close()
      ddpB.sock.close()
    }
  })

  await t.test('reversed member receives its slice in flipped order', async () => {
    const devA = await startMockDevice('127.0.0.51')
    const ddpA = await startDdpCapture('127.0.0.51')
    try {
      seed('strip-rev', '127.0.0.51')
      const strip = createStrip({
        name: 'rev',
        members: [{ device_id: 'strip-rev', offset: 0, length: 10, reverse: true }],
      })
      assert.equal(strip.members[0].reverse, true)
      await playStrip(strip.id, {
        pattern: 'gradient',
        params: { color1: [0, 0, 0], color2: [190, 0, 0] },
      }, { tickMs: 60000, pingMs: 60000 })
      await sleep(150)
      await stopStrip(strip.id, { restore: false })

      const packets = ddpA.packets.map(parseDdp)
      assert.ok(packets.length > 0)
      const expected = renderStripFrame('gradient', 10, { color1: [0, 0, 0], color2: [190, 0, 0] }, 0)
      assert.deepEqual(packets[0].pixels, expected.slice().reverse())
      assert.equal(packets[0].offset, 0)

      deleteStrip(strip.id)
      getDb().prepare('DELETE FROM devices WHERE id = ?').run('strip-rev')
    } finally {
      devA.server.close()
      ddpA.sock.close()
    }
  })

  await t.test('fallback is written on play and snapshots restore on stop', async () => {
    const devA = await startMockDevice('127.0.0.21')
    try {
      seed('strip-fb', '127.0.0.21')
      const strip = createStrip({ name: 'fb', members: [{ device_id: 'strip-fb', offset: 0, length: 4 }] })
      await playStrip(strip.id, { pattern: 'chase', params: { color1: [9, 9, 9] } }, { tickMs: 60000, pingMs: 60000 })
      // First POST is the fallback write. The mock reports no /json/eff list,
      // so resolution keeps the safe Solid fallback and strips the name tag.
      assert.equal(devA.posts[0].seg[0].fx, 0)
      assert.deepEqual(devA.posts[0].seg[0].col, [[9, 9, 9]])
      await stopStrip(strip.id)
      // Restore POST carries the captured snapshot (mock reported on:false).
      const last = devA.posts[devA.posts.length - 1]
      assert.equal(last.on, false)
      assert.equal(last.bri, 100)
      deleteStrip(strip.id)
      getDb().prepare('DELETE FROM devices WHERE id = ?').run('strip-fb')
    } finally {
      devA.server.close()
    }
  })

  await t.test('unhealthy members are skipped while the rest play on', async () => {
    const devA = await startMockDevice('127.0.0.31')
    const devB = await startMockDevice('127.0.0.32')
    const ddpA = await startDdpCapture('127.0.0.31')
    const ddpB = await startDdpCapture('127.0.0.32')
    try {
      seed('strip-sa', '127.0.0.31')
      seed('strip-sb', '127.0.0.32')
      const strip = createStrip({
        name: 'skip',
        members: [
          { device_id: 'strip-sa', offset: 0, length: 4 },
          { device_id: 'strip-sb', offset: 0, length: 4 },
        ],
      })
      await playStrip(strip.id, { pattern: 'solid', params: { color1: [1, 2, 3] } }, { tickMs: 30, pingMs: 50 })
      await sleep(150)
      assert.ok(ddpB.packets.length > 0)
      devB.server.close()
      await sleep(250)
      ddpA.packets.length = 0
      ddpB.packets.length = 0
      await sleep(200)
      assert.ok(ddpA.packets.length > 0)
      assert.equal(ddpB.packets.length, 0)
      const status = getStripStatus(strip.id)
      assert.equal(status.playing, true)
      assert.equal(status.members.find((m) => m.device_id === 'strip-sb').ok, false)
      await stopStrip(strip.id, { restore: false })
      deleteStrip(strip.id)
      getDb().prepare('DELETE FROM devices WHERE id IN (?, ?)').run('strip-sa', 'strip-sb')
    } finally {
      devA.server.close()
      try { devB.server.close() } catch {}
      ddpA.sock.close()
      ddpB.sock.close()
    }
  })

  await t.test('unknown patterns and strips throw honestly', async () => {
    await assert.rejects(() => playStrip('nope', { pattern: 'solid' }), /Strip not found/)
    seed('strip-v', '127.0.0.1')
    try {
      const strip = createStrip({ name: 'v', members: [{ device_id: 'strip-v', offset: 0, length: 2 }] })
      await assert.rejects(() => playStrip(strip.id, { pattern: 'nope' }), /Unknown pattern/)
      deleteStrip(strip.id)
    } finally {
      getDb().prepare('DELETE FROM devices WHERE id = ?').run('strip-v')
    }
  })

  await t.test('strip validation enforces members and limits', async () => {
    seed('strip-lim', '127.0.0.1', 2000)
    try {
      assert.throws(() => createStrip({ name: 'x', members: [] }), /at least one member/)
      assert.throws(
        () => createStrip({ name: 'x', members: [{ device_id: 'strip-lim', offset: 0, length: 1501 }] }),
        /limit is 1500/,
      )
      assert.throws(
        () => createStrip({ name: 'x', members: [{ device_id: 'ghost', offset: 0, length: 2 }] }),
        /unknown device/,
      )
      assert.throws(
        () => createStrip({ name: 'x', members: [
          { device_id: 'strip-lim', offset: 0, length: 2 },
          { device_id: 'strip-lim', offset: 2, length: 2 },
        ] }),
        /listed twice/,
      )
    } finally {
      getDb().prepare('DELETE FROM devices WHERE id = ?').run('strip-lim')
    }
  })

  await t.test('strip validation enforces per-device LED bookends', async () => {
    seed('strip-max', '127.0.0.1', 100)
    getDb().prepare('INSERT INTO devices (id, name, ip_address) VALUES (?, ?, ?)').run('strip-nocount', 'strip-nocount', '127.0.0.2')
    try {
      assert.throws(
        () => createStrip({ name: 'x', members: [{ device_id: 'strip-max', offset: 90, length: 11 }] }),
        /range 90 to 100 exceeds the device max of 100 LEDs/,
      )
      assert.throws(
        () => createStrip({ name: 'x', members: [{ device_id: 'strip-max', offset: 100, length: 1 }] }),
        /exceeds the device max of 100 LEDs/,
      )
      assert.throws(
        () => createStrip({ name: 'x', members: [{ device_id: 'strip-nocount', offset: 0, length: 1 }] }),
        /LED count unknown/,
      )
      const edge = createStrip({ name: 'edge', members: [{ device_id: 'strip-max', offset: 90, length: 10 }] })
      assert.equal(edge.total_leds, 10)
      assert.equal(edge.members[0].reverse, false)
      deleteStrip(edge.id)
    } finally {
      getDb().prepare('DELETE FROM devices WHERE id IN (?, ?)').run('strip-max', 'strip-nocount')
    }
  })
})
