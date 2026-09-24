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

const tmpDir = makeTempDir('wled-config-selective-test-')
process.env.DATA_DIR = tmpDir

const { getDb } = await import('../src/db/database.js')
const { configRoutes } = await import('../src/routes/config.js')
const Fastify = (await import('fastify')).default

test('Phase 15 selective restore', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(configRoutes)

  await t.test('GET /api/config/categories covers all 18 tables', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/config/categories' })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const tables = Object.values(body.categories).flatMap((c) => c.tables)
    assert.equal(new Set(tables).size, 18)
  })

  await t.test('POST /api/config/import restores only selected categories in merge mode', async () => {
    const payload = {
      mode: 'merge',
      categories: ['devices'],
      data: {
        devices: [
          { id: 'sel-dev-1', name: 'Selected', ip_address: '192.168.1.50' },
        ],
        routines: [
          { id: 'sel-routine-1', name: 'Should Be Skipped', is_enabled: 1 },
        ],
      },
    }
    const res = await fastify.inject({ method: 'POST', url: '/config/import', payload })
    assert.equal(res.statusCode, 200)
    const db = getDb()
    assert.ok(db.prepare('SELECT * FROM devices WHERE id = ?').get('sel-dev-1'))
    assert.equal(db.prepare('SELECT * FROM routines WHERE id = ?').get('sel-routine-1'), undefined)
  })

  await t.test('POST /api/config/import drops orphan group members and routine steps', async () => {
    const payload = {
      mode: 'merge',
      data: {
        devices: [
          { id: 'dep-dev-1', name: 'Dep Device', ip_address: '192.168.1.51' },
        ],
        groups: [
          { id: 'dep-group-1', name: 'Dep Group' },
        ],
        group_members: [
          { group_id: 'dep-group-1', device_id: 'dep-dev-1' },
          { group_id: 'dep-group-1', device_id: 'ghost-device' },
        ],
        routines: [
          { id: 'dep-routine-1', name: 'Dep Routine', is_enabled: 1 },
        ],
        routine_steps: [
          { id: 'dep-step-1', routine_id: 'dep-routine-1', step_order: 0 },
          { id: 'dep-step-ghost', routine_id: 'ghost-routine', step_order: 0 },
        ],
      },
    }
    const res = await fastify.inject({ method: 'POST', url: '/config/import', payload })
    assert.equal(res.statusCode, 200)
    const result = JSON.parse(res.body)
    assert.equal(result.ok, true)
    const db = getDb()
    assert.ok(db.prepare('SELECT * FROM group_members WHERE device_id = ?').get('dep-dev-1'))
    assert.equal(db.prepare('SELECT * FROM group_members WHERE device_id = ?').get('ghost-device'), undefined)
    assert.ok(db.prepare('SELECT * FROM routine_steps WHERE id = ?').get('dep-step-1'))
    assert.equal(db.prepare('SELECT * FROM routine_steps WHERE id = ?').get('dep-step-ghost'), undefined)
    assert.ok((result.skipped?.group_members ?? 0) >= 1)
    assert.ok((result.skipped?.routine_steps ?? 0) >= 1)
  })

  await t.test('POST /api/config/import replace mode stays scoped to selected categories', async () => {
    const db = getDb()
    db.prepare(
      "INSERT OR REPLACE INTO palettes (id, name, colors_json) VALUES ('keep-palette-1', 'Keep', '[]')"
    ).run()
    const payload = {
      mode: 'replace',
      categories: ['devices'],
      data: {
        devices: [
          { id: 'only-device', name: 'Only', ip_address: '192.168.1.60' },
        ],
        palettes: [
          { id: 'drop-palette-1', name: 'Drop', colors_json: '[]' },
        ],
      },
    }
    const res = await fastify.inject({ method: 'POST', url: '/config/import', payload })
    assert.equal(res.statusCode, 200)
    assert.ok(db.prepare('SELECT * FROM devices WHERE id = ?').get('only-device'))
    assert.ok(db.prepare('SELECT * FROM palettes WHERE id = ?').get('keep-palette-1'))
    assert.equal(db.prepare('SELECT * FROM palettes WHERE id = ?').get('drop-palette-1'), undefined)
  })

  await t.test('POST /api/config/import rejects unknown categories', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/config/import',
      payload: { mode: 'merge', categories: ['nope'], data: {} },
    })
    assert.equal(res.statusCode, 400)
  })
})
