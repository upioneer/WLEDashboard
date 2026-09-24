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

const tmpDir = makeTempDir('wled-config-test-')
process.env.DATA_DIR = tmpDir

const { getDb } = await import('../src/db/database.js')
const { configRoutes } = await import('../src/routes/config.js')
const Fastify = (await import('fastify')).default

test('Config Backup & Restore API', async (t) => {
  const fastify = Fastify({ logger: false })
  await fastify.register(configRoutes)

  await t.test('GET /api/config/export includes schema version, row counts, and all 18 tables', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/config/export' })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)

    assert.equal(body.schema_version, '0.24.0')
    assert.ok(body.exported_at)
    assert.ok(body.row_counts)
    assert.ok(body.data)

    const expectedTables = [
      'devices', 'groups', 'group_members', 'group_children',
      'settings', 'presets', 'schedules', 'routines', 'routine_steps',
      'dwellings', 'floors', 'rooms', 'anchors', 'animations',
      'palettes', 'matrices', 'matrix_drawings', 'studio_objects'
    ]

    for (const tbl of expectedTables) {
      assert.ok(Array.isArray(body.data[tbl]), `data.${tbl} should be an array`)
      assert.equal(typeof body.row_counts[tbl], 'number', `row_counts.${tbl} should be a number`)
    }
  })

  await t.test('POST /api/config/import merges records safely', async () => {
    const backupPayload = {
      mode: 'merge',
      data: {
        devices: [
          { id: 'backup-dev-1', name: 'Kitchen Counter', ip_address: '192.168.1.101', led_count: 60 }
        ],
        dwellings: [
          { id: 'dwelling-1', name: 'Main Residence', sort_order: 0 }
        ],
        floors: [
          { id: 'floor-1', dwelling_id: 'dwelling-1', name: 'First Floor', elevation: 0 }
        ],
        rooms: [
          { id: 'room-1', floor_id: 'floor-1', name: 'Kitchen', width: 5.0, depth: 4.0 }
        ],
        routines: [
          { id: 'routine-1', name: 'Evening Ambience', is_enabled: 1 }
        ]
      }
    }

    const res = await fastify.inject({
      method: 'POST',
      url: '/config/import',
      payload: backupPayload,
    })

    assert.equal(res.statusCode, 200)
    const result = JSON.parse(res.body)
    assert.equal(result.ok, true)
    assert.equal(result.stats.devices, 1)
    assert.equal(result.stats.rooms, 1)
    assert.equal(result.stats.routines, 1)

    const db = getDb()
    const dev = db.prepare('SELECT * FROM devices WHERE id = ?').get('backup-dev-1')
    assert.ok(dev)
    assert.equal(dev.name, 'Kitchen Counter')
  })

  await t.test('POST /api/config/import handles older backups lacking newer tables', async () => {
    // Simulating an export from v0.14.0 or v0.2.0 containing only devices and settings
    const legacyBackup = {
      mode: 'merge',
      data: {
        devices: [
          { id: 'legacy-dev-1', name: 'Bedroom Light', ip_address: '192.168.1.105' }
        ],
        settings: [
          { key: 'theme', value: 'dark' }
        ]
      }
    }

    const res = await fastify.inject({
      method: 'POST',
      url: '/config/import',
      payload: legacyBackup,
    })

    assert.equal(res.statusCode, 200)
    const result = JSON.parse(res.body)
    assert.equal(result.ok, true)
    assert.equal(result.stats.devices, 1)

    const db = getDb()
    const dev = db.prepare('SELECT * FROM devices WHERE id = ?').get('legacy-dev-1')
    assert.ok(dev)
    assert.equal(dev.name, 'Bedroom Light')
    assert.equal(dev.led_density, 60, 'Should apply default led_density for legacy backup rows')
  })

  await t.test('POST /api/config/import in replace mode clears and repopulates user tables', async () => {
    const replacePayload = {
      mode: 'replace',
      data: {
        devices: [
          { id: 'sole-device', name: 'Living Room', ip_address: '192.168.1.200' }
        ]
      }
    }

    const res = await fastify.inject({
      method: 'POST',
      url: '/config/import',
      payload: replacePayload,
    })

    assert.equal(res.statusCode, 200)
    const db = getDb()
    const allDevs = db.prepare('SELECT id FROM devices').all()
    assert.equal(allDevs.length, 1)
    assert.equal(allDevs[0].id, 'sole-device')
  })
})
