import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'

function makeTempDir(prefix) {
  try {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  } catch {
    const fallbackBase = path.join(process.cwd(), '.test-tmp')
    fs.mkdirSync(fallbackBase, { recursive: true })
    return fs.mkdtempSync(path.join(fallbackBase, `${prefix}-`))
  }
}

const tmpDir = makeTempDir('wled-firmware-test-')
process.env.DATA_DIR = tmpDir

const { getDb } = await import('../src/db/database.js')
const { deviceRoutes } = await import('../src/routes/devices.js')
const Fastify = (await import('fastify')).default
const multipart = (await import('@fastify/multipart')).default

test('Firmware update route validation and proxying', async () => {
  const fastify = Fastify({ logger: false })
  await fastify.register(multipart, { limits: { fileSize: 16 * 1024 * 1024 } })
  await fastify.register(deviceRoutes)

  try {
    // 1. Returns 404 for unknown device
    const res404 = await fastify.inject({
      method: 'POST',
      url: '/devices/nonexistent-id/firmware',
    })
    assert.equal(res404.statusCode, 404)

    // 2. Insert test device directly without starting polling
    const devId = 'test-firmware-dev-1'
    getDb().prepare('INSERT INTO devices (id, name, ip_address) VALUES (?, ?, ?)').run(
      devId,
      'Test Controller',
      '127.0.0.1'
    )

    const res400 = await fastify.inject({
      method: 'POST',
      url: `/devices/${devId}/firmware`,
    })
    assert.ok([400, 406].includes(res400.statusCode), 'Returns 400 or 406 when no file is uploaded')
  } finally {
    await fastify.close()
  }
})

test('Firmware update proxy handles mock WLED server responses', async () => {
  let mockStatusCode = 200
  let mockResponseBody = 'Update successful! Rebooting...'
  let receivedFieldName = null

  const mockServer = http.createServer((req, res) => {
    let body = []
    req.on('data', chunk => body.push(chunk))
    req.on('end', () => {
      const full = Buffer.concat(body).toString('latin1')
      if (full.includes('name="update"')) {
        receivedFieldName = 'update'
      } else if (full.includes('name="file"')) {
        receivedFieldName = 'file'
      }
      res.writeHead(mockStatusCode, { 'Content-Type': 'text/plain' })
      res.end(mockResponseBody)
    })
  })

  await new Promise(resolve => mockServer.listen(0, resolve))
  const port = mockServer.address().port

  const fastify = Fastify({ logger: false })
  await fastify.register(multipart, { limits: { fileSize: 16 * 1024 * 1024 } })
  await fastify.register(deviceRoutes)

  const devId = 'mock-firmware-dev-2'
  getDb().prepare('INSERT INTO devices (id, name, ip_address) VALUES (?, ?, ?)').run(
    devId,
    'Mock Device',
    `127.0.0.1:${port}`
  )

  try {
    // Test 1: Successful upload sends field name 'update'
    mockStatusCode = 200
    mockResponseBody = 'Update successful! Rebooting...'

    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="wled.bin"',
      'Content-Type: application/octet-stream',
      '',
      'DUMMY_BINARY_DATA_12345',
      `--${boundary}--`,
    ].join('\r\n')

    const resSuccess = await fastify.inject({
      method: 'POST',
      url: `/devices/${devId}/firmware`,
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    })

    assert.equal(resSuccess.statusCode, 200)
    assert.deepEqual(JSON.parse(resSuccess.body), { ok: true, message: 'Firmware update successful. Device is rebooting.' })
    assert.equal(receivedFieldName, 'update', 'Proxy correctly forwarded file under field name "update"')

    // Test 2: In-body failure on HTTP 200
    mockStatusCode = 200
    mockResponseBody = 'Update failed! Please try again.'

    const resInBodyFail = await fastify.inject({
      method: 'POST',
      url: `/devices/${devId}/firmware`,
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    })
    assert.equal(resInBodyFail.statusCode, 502)
    assert.match(JSON.parse(resInBodyFail.body).error, /Update failed!/i)

    // Test 3: Subnet block on HTTP 401
    mockStatusCode = 401
    mockResponseBody = 'Client is not on local subnet.'

    const resSubnetFail = await fastify.inject({
      method: 'POST',
      url: `/devices/${devId}/firmware`,
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    })
    assert.equal(resSubnetFail.statusCode, 401)
    assert.match(JSON.parse(resSubnetFail.body).error, /local subnet/i)
  } finally {
    mockServer.close()
    await fastify.close()
    getDb().close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})
