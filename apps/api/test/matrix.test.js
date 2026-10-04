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

const tmpDir = makeTempDir('wled-matrix-test-')
process.env.DATA_DIR = tmpDir

const { matrixRoutes } = await import('../src/routes/matrix.js')
const Fastify = (await import('fastify')).default

test('2D Matrix API: Drawing name requirements and validation', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(matrixRoutes, { prefix: '/api' })
  await fastify.ready()

  t.after(async () => {
    await fastify.close()
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  await t.test('POST /api/matrix/drawings rejects missing or blank name with 400', async () => {
    const noName = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        width: 8,
        height: 8,
        pixels: Array(64).fill('#000000'),
      },
    })
    assert.equal(noName.statusCode, 400)

    const blankName = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        name: '   ',
        width: 8,
        height: 8,
        pixels: Array(64).fill('#000000'),
      },
    })
    assert.equal(blankName.statusCode, 400)
  })

  await t.test('POST /api/matrix/drawings rejects duplicate name with 409', async () => {
    const first = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        name: 'Heart Icon',
        width: 8,
        height: 8,
        pixels: Array(64).fill('#ff0000'),
      },
    })
    assert.equal(first.statusCode, 201)

    // Attempt to save another drawing with same name in different case
    const duplicate = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        name: 'heart icon',
        width: 8,
        height: 8,
        pixels: Array(64).fill('#00ff00'),
      },
    })
    assert.equal(duplicate.statusCode, 409)

    // Cleanup
    const firstId = JSON.parse(first.body).id
    await fastify.inject({ method: 'DELETE', url: `/api/matrix/drawings/${firstId}` })
  })

  await t.test('POST /api/matrix/drawings with id allows updating same drawing without 409', async () => {
    const initial = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        name: 'Space Invader',
        width: 8,
        height: 8,
        pixels: Array(64).fill('#00ffcc'),
      },
    })
    assert.equal(initial.statusCode, 201)
    const initialData = JSON.parse(initial.body)

    // Update the same drawing keeping the name
    const updateSame = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        id: initialData.id,
        name: 'Space Invader',
        width: 8,
        height: 8,
        pixels: Array(64).fill('#ffffff'),
      },
    })
    assert.equal(updateSame.statusCode, 201)
    const updatedData = JSON.parse(updateSame.body)
    assert.equal(updatedData.pixels[0], '#ffffff')

    // Create a second drawing
    const second = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        name: 'Pacman',
        width: 8,
        height: 8,
        pixels: Array(64).fill('#ffff00'),
      },
    })
    assert.equal(second.statusCode, 201)
    const secondId = JSON.parse(second.body).id

    // Attempt to update second drawing to use the first drawing's name
    const updateConflict = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        id: secondId,
        name: 'space invader',
        width: 8,
        height: 8,
        pixels: Array(64).fill('#ffff00'),
      },
    })
    assert.equal(updateConflict.statusCode, 409)

    // Cleanup
    await fastify.inject({ method: 'DELETE', url: `/api/matrix/drawings/${initialData.id}` })
    await fastify.inject({ method: 'DELETE', url: `/api/matrix/drawings/${secondId}` })
  })

  await t.test('legacy drawings default to kind drawing with null params', async () => {
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        name: 'Legacy Star',
        width: 8,
        height: 8,
        pixels: Array(64).fill('#000000'),
      },
    })
    assert.equal(created.statusCode, 201)
    const data = JSON.parse(created.body)
    assert.equal(data.kind, 'drawing')
    assert.equal(data.params, null)

    const listed = await fastify.inject({ method: 'GET', url: '/api/matrix/drawings' })
    const found = JSON.parse(listed.body).find((d) => d.id === data.id)
    assert.equal(found.kind, 'drawing')
    assert.equal(found.params, null)

    await fastify.inject({ method: 'DELETE', url: `/api/matrix/drawings/${data.id}` })
  })

  await t.test('marquee presets roundtrip kind and params', async () => {
    const params = {
      rows: [{ text: 'HELLO', color: '#ff0000' }],
      bg: '#000000',
      speed: 12,
      direction: 'left',
      serpentine: true,
    }
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/drawings',
      payload: {
        name: 'Hello Marquee',
        width: 32,
        height: 8,
        pixels: Array(32 * 8).fill('#000000'),
        kind: 'marquee',
        params,
      },
    })
    assert.equal(created.statusCode, 201)
    const data = JSON.parse(created.body)
    assert.equal(data.kind, 'marquee')
    assert.deepEqual(data.params, params)

    const listed = await fastify.inject({ method: 'GET', url: '/api/matrix/drawings' })
    const found = JSON.parse(listed.body).find((d) => d.id === data.id)
    assert.equal(found.kind, 'marquee')
    assert.deepEqual(found.params, params)

    await fastify.inject({ method: 'DELETE', url: `/api/matrix/drawings/${data.id}` })
  })

  await t.test('POST /api/matrix/stream-ddp validates payload and relays frames', async () => {
    const bad = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/stream-ddp',
      payload: { target_ip: '', pixels: [[[300, 0, 0]]] },
    })
    assert.equal(bad.statusCode, 400)

    const good = await fastify.inject({
      method: 'POST',
      url: '/api/matrix/stream-ddp',
      payload: {
        target_ip: '127.0.0.1',
        pixels: Array(64).fill([255, 0, 0]),
      },
    })
    assert.equal(good.statusCode, 200)
    assert.deepEqual(JSON.parse(good.body), { status: 'sent' })
  })
})
