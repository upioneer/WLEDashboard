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

const tmpDir = makeTempDir('wled-demo-test-')
process.env.DATA_DIR = tmpDir

const { getDb } = await import('../src/db/database.js')
const { listDevices, getDevice, getCachedState, sendDeviceCommand, updateDevice } = await import('../src/services/deviceService.js')
const { listGroups } = await import('../src/services/groupService.js')
const { getSpatialHierarchy } = await import('../src/services/spatialService.js')

test('Interactive Demo Mode Virtualization', async (t) => {
  const db = getDb()

  // Ensure initial demo mode is off
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('demo_mode', '0')").run()

  await t.test('returns normal database records when demo_mode is disabled', async () => {
    const devices = listDevices()
    assert.equal(devices.length, 0)

    const groups = listGroups()
    assert.equal(groups.length, 0)

    const hierarchy = getSpatialHierarchy()
    assert.equal(hierarchy.length, 1)
    assert.equal(hierarchy[0].name, 'Main Residence')
  })

  await t.test('returns simulated virtual devices when demo_mode is enabled', async () => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('demo_mode', '1')").run()

    const devices = listDevices()
    assert.equal(devices.length, 6)
    assert.equal(devices[0].id, 'demo-tv')
    assert.equal(devices[0].name, 'Living Room TV Bias')
    assert.equal(devices[5].id, 'demo-garden')
    assert.equal(devices[5].is_online, 0) // Offline simulated controller

    const dev = getDevice('demo-matrix')
    assert.ok(dev)
    assert.equal(dev.name, 'PixelForge Matrix 16x16')

    const state = getCachedState('demo-tv')
    assert.ok(state)
    assert.equal(state.on, true)
    assert.equal(state.bri, 210)
  })

  await t.test('updates virtual device state in-memory without hardware calls', async () => {
    const result = await sendDeviceCommand('demo-tv', { on: false, bri: 120 })
    assert.ok(result)
    assert.equal(result.ok, true)
    assert.equal(result.data.on, false)
    assert.equal(result.data.bri, 120)

    const updatedState = getCachedState('demo-tv')
    assert.equal(updatedState.on, false)
    assert.equal(updatedState.bri, 120)
  })

  await t.test('simulates firmware update in-memory for demo devices', async () => {
    const beforeDev = getDevice('demo-patio')
    assert.equal(beforeDev.firmware_ver, '0.14.4')

    const updated = updateDevice('demo-patio', { firmware_ver: '0.15.0' })
    assert.equal(updated.firmware_ver, '0.15.0')

    const afterDev = getDevice('demo-patio')
    assert.equal(afterDev.firmware_ver, '0.15.0')

    const afterState = getCachedState('demo-patio')
    assert.equal(afterState.info.ver, '0.15.0')
  })

  await t.test('returns companion groups and spatial 3D floorplan hierarchy', async () => {
    const groups = listGroups()
    assert.equal(groups.length, 2)
    assert.equal(groups[0].name, 'Main Floor Ambient')
    assert.ok(groups[0].device_ids.includes('demo-tv'))

    const hierarchy = getSpatialHierarchy()
    assert.equal(hierarchy.length, 1) // 1 dwelling: Demo Penthouse
    assert.equal(hierarchy[0].name, 'Demo Penthouse')
    assert.equal(hierarchy[0].floors.length, 1)
    assert.equal(hierarchy[0].floors[0].rooms.length, 3) // Living Room, Kitchen & Dining, Creative Studio
    assert.equal(hierarchy[0].floors[0].rooms[0].name, 'Living Room')

    const totalAnchors = hierarchy[0].floors[0].rooms.reduce((acc, r) => acc + r.anchors.length, 0)
    assert.equal(totalAnchors, 5)
  })

  await t.test('preserves real database data when demo mode is disabled', async () => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('demo_mode', '0')").run()

    const devices = listDevices()
    assert.equal(devices.length, 0)

    const groups = listGroups()
    assert.equal(groups.length, 0)

    const hierarchy = getSpatialHierarchy()
    assert.equal(hierarchy.length, 1)
    assert.equal(hierarchy[0].name, 'Main Residence') // Default seeded dwelling
  })
})
