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

const tmpDir = makeTempDir('wled-studio-objects-test-')
process.env.DATA_DIR = tmpDir

const { computeLayout, computePower, CHIP_REFERENCE } = await import('../src/services/studioObjects.js')
const { studioRoutes } = await import('../src/routes/studio.js')
const Fastify = (await import('fastify')).default

test('Phase 1 studio objects: samplers', async (t) => {
  await t.test('cone spiral emits top-down points with density driven count', async () => {
    const layout = computeLayout({
      shape: 'cone',
      dims: { height: 2, radius: 0.5 },
      strategy: 'spiral',
      options: { density: 60, direction: 'top_down' },
    })
    assert.ok(layout.count > 100, `expected a real tree count, got ${layout.count}`)
    assert.ok(layout.points[0][1] > layout.points[layout.points.length - 1][1], 'top-down ordering')
    assert.ok(layout.stripLengthM > layout.pathLengthM, 'strip includes slack')
    assert.equal(layout.runs.length, 1)
  })

  await t.test('cone vertical runs produce one run per requested drop', async () => {
    const layout = computeLayout({
      shape: 'cone',
      dims: { height: 2, radius: 0.5 },
      strategy: 'vertical_runs',
      options: { density: 60, runs: 8 },
    })
    assert.equal(layout.runs.length, 8)
    assert.equal(layout.runs.reduce((n, r) => n + r.count, 0), layout.count)
  })

  await t.test('direction and start offset reorder the strip', async () => {
    const down = computeLayout({
      shape: 'cylinder',
      dims: { height: 1, radius: 0.2 },
      strategy: 'spiral',
      options: { density: 30, direction: 'top_down' },
    })
    const up = computeLayout({
      shape: 'cylinder',
      dims: { height: 1, radius: 0.2 },
      strategy: 'spiral',
      options: { density: 30, direction: 'bottom_up' },
    })
    assert.equal(down.count, up.count)
    assert.deepEqual(up.points[0], down.points[down.points.length - 1])
  })

  await t.test('plane serpentine alternates row direction', async () => {
    const layout = computeLayout({
      shape: 'plane',
      dims: { width: 1, height: 0.5 },
      strategy: 'serpentine_rows',
      options: { density: 60, rowSpacing: 0.1 },
    })
    assert.equal(layout.runs.length, 5)
    const [x0] = layout.points[0]
    const secondRowStart = layout.points[layout.runs[0].count]
    assert.ok(Math.abs(x0 - secondRowStart[0]) > 0.5, 'second row starts on the opposite side')
  })

  await t.test('invalid shape, strategy, and dims throw', async () => {
    assert.throws(() => computeLayout({ shape: 'torus', dims: {}, strategy: 'spiral', options: {} }))
    assert.throws(() => computeLayout({ shape: 'cone', dims: { height: 2, radius: 0.5 }, strategy: 'columns', options: {} }))
    assert.throws(() => computeLayout({ shape: 'cone', dims: { height: -1, radius: 0.5 }, strategy: 'spiral', options: {} }))
  })
})

test('Phase 1 studio objects: power math', async (t) => {
  await t.test('WS2812B tree math matches the 60mA rule with headroom', async () => {
    const power = computePower({ count: 500, chip: 'ws2812b' })
    assert.equal(power.amps, 30)
    assert.equal(power.psuAmps, 36)
    assert.equal(power.psuWatts, 180)
    assert.ok(power.disclaimer.length > 0)
    assert.ok(power.injectionPoints >= 1)
  })

  await t.test('chip table covers the big three voltages', async () => {
    assert.equal(CHIP_REFERENCE.ws2812b.voltage, 5)
    assert.equal(CHIP_REFERENCE.ws2811_12v.voltage, 12)
    assert.throws(() => computePower({ count: 10, chip: 'nope' }))
  })
})

test('Phase 1 studio objects: API', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(studioRoutes)

  await t.test('GET /api/studio/shapes lists shapes, strategies, and chips', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/studio/shapes' })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.ok(body.shapes.includes('cone'))
    assert.ok(body.strategies.cone.includes('spiral'))
    assert.ok(body.chips.ws2812b)
  })

  await t.test('POST /api/studio/objects/preview computes layout plus power', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/studio/objects/preview',
      payload: {
        shape: 'cone',
        dims: { height: 2, radius: 0.5 },
        strategy: 'spiral',
        options: { density: 60 },
        chip: 'ws2812b',
      },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.ok(body.count > 100)
    assert.ok(Array.isArray(body.points))
    assert.ok(body.power.psuWatts > 0)
  })

  await t.test('POST /api/studio/objects/preview rejects bad layouts', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/studio/objects/preview',
      payload: { shape: 'cone', dims: {}, strategy: 'spiral', options: {} },
    })
    assert.equal(res.statusCode, 400)
  })

  await t.test('CRUD roundtrip persists validated objects', async () => {
    const created = await fastify.inject({
      method: 'POST',
      url: '/studio/objects',
      payload: {
        name: 'Test Tree',
        shape: 'cone',
        dims: { height: 2, radius: 0.5 },
        strategy: 'spiral',
        options: { density: 60 },
        chip: 'ws2812b',
      },
    })
    assert.equal(created.statusCode, 201)
    const obj = JSON.parse(created.body)
    assert.equal(obj.name, 'Test Tree')
    assert.deepEqual(obj.dims, { height: 2, radius: 0.5 })

    const listed = await fastify.inject({ method: 'GET', url: '/studio/objects' })
    assert.equal(listed.statusCode, 200)
    assert.ok(JSON.parse(listed.body).some((o) => o.id === obj.id))

    const patched = await fastify.inject({
      method: 'PATCH',
      url: `/studio/objects/${obj.id}`,
      payload: { strategy: 'vertical_runs', options: { density: 60, runs: 6 } },
    })
    assert.equal(patched.statusCode, 200)
    assert.equal(JSON.parse(patched.body).strategy, 'vertical_runs')

    const deleted = await fastify.inject({ method: 'DELETE', url: `/studio/objects/${obj.id}` })
    assert.equal(deleted.statusCode, 204)
  })

  await t.test('POST /api/studio/objects rejects missing or blank name', async () => {
    const noName = await fastify.inject({
      method: 'POST',
      url: '/studio/objects',
      payload: { shape: 'cone', dims: { height: 1, radius: 0.5 }, strategy: 'spiral' },
    })
    assert.equal(noName.statusCode, 400)

    const blankName = await fastify.inject({
      method: 'POST',
      url: '/studio/objects',
      payload: { name: '   ', shape: 'cone', dims: { height: 1, radius: 0.5 }, strategy: 'spiral' },
    })
    assert.equal(blankName.statusCode, 400)
  })

  await t.test('POST /api/studio/objects rejects duplicate name with 409', async () => {
    const first = await fastify.inject({
      method: 'POST',
      url: '/studio/objects',
      payload: {
        name: 'Unique Object',
        shape: 'cylinder',
        dims: { height: 1, radius: 0.2 },
        strategy: 'spiral',
      },
    })
    assert.equal(first.statusCode, 201)

    const duplicate = await fastify.inject({
      method: 'POST',
      url: '/studio/objects',
      payload: {
        name: 'unique object',
        shape: 'cylinder',
        dims: { height: 1, radius: 0.2 },
        strategy: 'spiral',
      },
    })
    assert.equal(duplicate.statusCode, 409)

    // Cleanup
    const id = JSON.parse(first.body).id
    await fastify.inject({ method: 'DELETE', url: `/studio/objects/${id}` })
  })

  await t.test('PATCH /api/studio/objects/:id enforces unique name against other objects', async () => {
    const objA = await fastify.inject({
      method: 'POST',
      url: '/studio/objects',
      payload: { name: 'Object Alpha', shape: 'sphere', dims: { radius: 0.5 }, strategy: 'latitude_rings' },
    })
    const objB = await fastify.inject({
      method: 'POST',
      url: '/studio/objects',
      payload: { name: 'Object Beta', shape: 'sphere', dims: { radius: 0.5 }, strategy: 'latitude_rings' },
    })
    assert.equal(objA.statusCode, 201)
    assert.equal(objB.statusCode, 201)

    const idA = JSON.parse(objA.body).id
    const idB = JSON.parse(objB.body).id

    // Rename B to Alpha should collide
    const conflict = await fastify.inject({
      method: 'PATCH',
      url: `/studio/objects/${idB}`,
      payload: { name: 'object alpha' },
    })
    assert.equal(conflict.statusCode, 409)

    // Updating B without changing name should succeed
    const same = await fastify.inject({
      method: 'PATCH',
      url: `/studio/objects/${idB}`,
      payload: { name: 'Object Beta' },
    })
    assert.equal(same.statusCode, 200)

    // Cleanup
    await fastify.inject({ method: 'DELETE', url: `/studio/objects/${idA}` })
    await fastify.inject({ method: 'DELETE', url: `/studio/objects/${idB}` })
  })

  await t.test('POST /api/studio/objects rejects unbuildable layouts', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/studio/objects',
      payload: { name: 'Bad', shape: 'sphere', dims: {}, strategy: 'latitude_rings', options: {} },
    })
    assert.equal(res.statusCode, 400)
  })
})
