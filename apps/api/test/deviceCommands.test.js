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
  await t.test('rapid sequential commands all reach the device in order', async () => {
    const { server, bodies, port } = await startMockWled()
    try {
      const device = { id: 'cmd-order-1', ip_address: `127.0.0.1:${port}` }
      await Promise.all([
        sendDeviceCommand(device, { bri: 10 }),
        sendDeviceCommand(device, { bri: 20 }),
        sendDeviceCommand(device, { bri: 30 }),
      ])
      assert.deepEqual(bodies.map((b) => b.bri), [10, 20, 30])
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
