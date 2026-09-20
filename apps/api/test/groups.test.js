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

const tmpDir = makeTempDir('wled-groups-test-')
process.env.DATA_DIR = tmpDir

const { getDb } = await import('../src/db/database.js')
const { groupRoutes } = await import('../src/routes/groups.js')
const { deviceRoutes } = await import('../src/routes/devices.js')
const Fastify = (await import('fastify')).default

test('Groups & Devices Spotify & Weather sync toggle functionality', async (t) => {
  const db = getDb()
  const fastify = Fastify({ logger: false })
  await fastify.register(groupRoutes)
  await fastify.register(deviceRoutes)

  // 1. Create a group in normal mode
  const createRes = await fastify.inject({
    method: 'POST',
    url: '/groups',
    payload: {
      name: 'Test Sync Group',
      type: 'zone',
      color: '#10b981',
      spotify_sync_enabled: 0,
      weather_sync_enabled: 0,
    }
  })
  assert.equal(createRes.statusCode, 201)
  const group = JSON.parse(createRes.body)
  assert.equal(group.name, 'Test Sync Group')
  assert.equal(group.spotify_sync_enabled, 0)
  assert.equal(group.weather_sync_enabled, 0)

  // 2. PATCH to enable Spotify sync
  const patchRes1 = await fastify.inject({
    method: 'PATCH',
    url: `/groups/${group.id}`,
    payload: { spotify_sync_enabled: 1 }
  })
  assert.equal(patchRes1.statusCode, 200)
  const patched1 = JSON.parse(patchRes1.body)
  assert.equal(patched1.spotify_sync_enabled, 1)

  // Verify with GET
  const getRes1 = await fastify.inject({
    method: 'GET',
    url: `/groups/${group.id}`
  })
  assert.equal(getRes1.statusCode, 200)
  assert.equal(JSON.parse(getRes1.body).spotify_sync_enabled, 1)

  // 3. PATCH to disable Spotify sync
  const patchRes2 = await fastify.inject({
    method: 'PATCH',
    url: `/groups/${group.id}`,
    payload: { spotify_sync_enabled: 0 }
  })
  assert.equal(patchRes2.statusCode, 200)
  assert.equal(JSON.parse(patchRes2.body).spotify_sync_enabled, 0)

  // 4. PATCH to enable Weather sync
  const patchRes3 = await fastify.inject({
    method: 'PATCH',
    url: `/groups/${group.id}`,
    payload: { weather_sync_enabled: 1 }
  })
  assert.equal(patchRes3.statusCode, 200)
  assert.equal(JSON.parse(patchRes3.body).weather_sync_enabled, 1)

  // 5. Test Demo Mode group sync toggle
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('demo_mode', '1')").run()

  const demoPatchRes = await fastify.inject({
    method: 'PATCH',
    url: '/groups/demo-grp-ambient',
    payload: { spotify_sync_enabled: 0 }
  })
  assert.equal(demoPatchRes.statusCode, 200)
  const demoPatched = JSON.parse(demoPatchRes.body)
  assert.equal(demoPatched.spotify_sync_enabled, 0)

  // 6. Test Device sync toggle
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('demo_mode', '0')").run()
  const devId = 'test-dev-1'
  db.prepare(`
    INSERT INTO devices (id, name, ip_address, sort_order, spotify_sync_enabled, weather_sync_enabled)
    VALUES (?, ?, ?, ?, 0, 0)
  `).run(devId, 'Test Sync Device', '192.168.1.199', 0)

  const patchDevRes = await fastify.inject({
    method: 'PATCH',
    url: `/devices/${devId}`,
    payload: { spotify_sync_enabled: 1, weather_sync_enabled: 1 }
  })
  assert.equal(patchDevRes.statusCode, 200)
  const patchedDev = JSON.parse(patchDevRes.body)
  assert.equal(patchedDev.spotify_sync_enabled, 1)
  assert.equal(patchedDev.weather_sync_enabled, 1)

  await fastify.close()
})
