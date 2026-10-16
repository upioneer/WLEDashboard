import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {
  nextCommandSeq,
  isStaleResponse,
  resetCommandSeq,
  fetchWithTimeout,
  snapshotToCommand,
  buildPreviewPayload,
} from './commands.js'

test('command sequences detect stale responses per device', () => {
  resetCommandSeq()
  const first = nextCommandSeq('dev-a')
  const second = nextCommandSeq('dev-a')
  assert.equal(second, first + 1)
  assert.equal(isStaleResponse('dev-a', first), true)
  assert.equal(isStaleResponse('dev-a', second), false)
  // Other devices track independently
  assert.equal(isStaleResponse('dev-b', first), false)
  resetCommandSeq('dev-a')
  assert.equal(isStaleResponse('dev-a', first), false)
})

test('fetchWithTimeout resolves fast responses normally', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('{"ok":true}')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const res = await fetchWithTimeout(`http://127.0.0.1:${server.address().port}/`, {}, 2000)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })
  } finally {
    server.close()
  }
})

test('fetchWithTimeout aborts hung responses', async () => {
  const server = http.createServer(() => {
    // Never responds
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    await assert.rejects(
      fetchWithTimeout(`http://127.0.0.1:${server.address().port}/`, {}, 30),
      (err) => err?.name === 'AbortError',
    )
  } finally {
    server.close()
  }
})

test('snapshotToCommand keeps restorable keys and strips metadata', () => {
  const cmd = snapshotToCommand({
    on: true,
    bri: 128,
    seg: [{ id: 0, fx: 42, col: [[255, 0, 0]] }],
    info: { ver: '0.14.0' },
    _ts: 123,
    _misses: 0,
  })
  assert.deepEqual(cmd, {
    on: true,
    bri: 128,
    seg: [{ id: 0, fx: 42, col: [[255, 0, 0]] }],
  })
})

test('snapshotToCommand clones segments and rejects empty snapshots', () => {
  const seg = [{ id: 0, fx: 1 }]
  const cmd = snapshotToCommand({ seg })
  assert.notEqual(cmd.seg, seg)
  assert.deepEqual(cmd.seg, seg)

  assert.equal(snapshotToCommand(null), null)
  assert.equal(snapshotToCommand({}), null)
  assert.equal(snapshotToCommand({ info: {}, _ts: 1 }), null)
  assert.equal(snapshotToCommand([]), null)
})

test('buildPreviewPayload maps effect, params, palette, and color', () => {
  assert.deepEqual(
    buildPreviewPayload({ effectId: 42, speed: 200, intensity: 100, paletteId: 6, color: '#ff0000' }),
    { on: true, seg: [{ fx: 42, sx: 200, ix: 100, pal: 6, col: [[255, 0, 0]] }] }
  )
})

test('buildPreviewPayload falls back to safe defaults', () => {
  assert.deepEqual(
    buildPreviewPayload(),
    { on: true, seg: [{ fx: 0, sx: 128, ix: 128, pal: 0, col: [[255, 255, 255]] }] }
  )
})
