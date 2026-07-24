const { chromium } = require('playwright')

const TARGET_URL = 'http://localhost:5173'
const API_URL    = 'http://127.0.0.1:3001'

let pass = 0
let fail = 0
const failures = []

async function check(label, fn) {
  try {
    await fn()
    console.log(`  PASS  ${label}`)
    pass++
  } catch (err) {
    console.log(`  FAIL  ${label}`)
    console.log(`        ${err.message.split('\n')[0]}`)
    fail++
    failures.push({ label, error: err.message.split('\n')[0] })
  }
}

;(async () => {
  console.log('\n WLEDashboard v0.5.0 Functional Test (Phase 5: Spatial View)\n')
  const browser = await chromium.launch({ headless: true })
  const page    = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })

  // ── Pre-flight: API health ────────────────────────────────────
  console.log('[ API Health ]')
  await check('API responds on :3001', async () => {
    const res = await page.request.get(`${API_URL}/api/health`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
  })

  // ── Spatial Hierarchy API ──────────────────────────────────────
  console.log('\n[ Spatial Hierarchy API ]')
  let createdRoomId = null
  let createdAnchorId = null

  await check('GET /api/spatial/hierarchy returns spatial tree', async () => {
    const res = await page.request.get(`${API_URL}/api/spatial/hierarchy`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (!Array.isArray(body) || body.length === 0) throw new Error('Hierarchy is empty or invalid')
  })

  await check('POST /api/spatial/rooms creates 3D room', async () => {
    const hierarchyRes = await page.request.get(`${API_URL}/api/spatial/hierarchy`)
    const hierarchy = await hierarchyRes.json()
    const floorId = hierarchy[0]?.floors[0]?.id
    if (!floorId) throw new Error('No floor found to attach room')

    const res = await page.request.post(`${API_URL}/api/spatial/rooms`, {
      data: { floor_id: floorId, name: '3D Test Studio', width: 5.5, depth: 4.5 },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (!body.id || body.name !== '3D Test Studio') throw new Error('Invalid room response')
    createdRoomId = body.id
  })

  await check('POST /api/spatial/anchors creates 3D light anchor', async () => {
    const res = await page.request.post(`${API_URL}/api/spatial/anchors`, {
      data: { room_id: createdRoomId, name: '3D Test Strip', type: 'strip_linear', offset_y: 1.5 },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (!body.id || body.name !== '3D Test Strip') throw new Error('Invalid anchor response')
    createdAnchorId = body.id
  })

  // ── UI: Spatial View ──────────────────────────────────────────
  console.log('\n[ Spatial View UI ]')
  await page.goto(`${TARGET_URL}/spatial`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(1000)

  await check('Spatial view renders', async () => {
    await page.waitForSelector('#main-content', { timeout: 5000 })
  })

  await check('3D Canvas element mounts in DOM', async () => {
    await page.waitForSelector('canvas', { timeout: 5000 })
  })

  await check('Side panel hierarchy displays rooms', async () => {
    await page.waitForSelector('[class*="roomItem"]', { timeout: 5000 })
  })

  await check('+ Add Room button opens creation modal', async () => {
    await page.click('button:has-text("+ Add Room")')
    await page.waitForSelector('form input', { timeout: 3000 })
    await page.click('button:has-text("Cancel")')
  })

  // ── Cleanup ───────────────────────────────────────────────────
  console.log('\n[ Cleanup ]')
  await check('DELETE /api/spatial/rooms/:id removes 3D room', async () => {
    if (!createdRoomId) throw new Error('No created room id')
    const res = await page.request.delete(`${API_URL}/api/spatial/rooms/${createdRoomId}`)
    if (res.status() !== 204) throw new Error(`Status ${res.status()}`)
  })

  await browser.close()

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────')
  console.log(` Results: ${pass} passed, ${fail} failed`)
  if (failures.length) {
    console.log('\n Failed tests:')
    failures.forEach(f => console.log(`   ${f.label}\n   ${f.error}`))
  }
  console.log('────────────────────────────────────────\n')
  process.exit(fail > 0 ? 1 : 0)
})()
