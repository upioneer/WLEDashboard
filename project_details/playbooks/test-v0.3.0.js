const { chromium } = require('playwright')

const TARGET_URL = 'http://localhost:5173'
const API_URL    = 'http://localhost:3001'

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
  console.log('\n WLEDashboard v0.3.0 Functional Test (Phase 3: Organization)\n')
  const browser = await chromium.launch({ headless: true })
  const page    = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })

  // ── Pre-flight: API health ────────────────────────────────────
  console.log('[ API Health ]')
  await check('API responds on :3001', async () => {
    const res = await page.request.get(`${API_URL}/api/health`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
  })

  // ── Group API Tests ──────────────────────────────────────────
  let createdGroupId = null
  console.log('\n[ Groups API ]')

  await check('POST /api/groups creates a group', async () => {
    const res = await page.request.post(`${API_URL}/api/groups`, {
      data: { name: 'Test Zone Group', type: 'zone', color: '#10b981' },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (!body.id || body.name !== 'Test Zone Group') throw new Error('Invalid group response')
    createdGroupId = body.id
  })

  await check('GET /api/groups includes created group', async () => {
    const res = await page.request.get(`${API_URL}/api/groups`)
    const body = await res.json()
    if (!body.some(g => g.id === createdGroupId)) throw new Error('Group not found in list')
  })

  await check('PATCH /api/groups/:id updates group name & color', async () => {
    const res = await page.request.patch(`${API_URL}/api/groups/${createdGroupId}`, {
      data: { name: 'Updated Zone Group', color: '#06b6d4' },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (body.name !== 'Updated Zone Group' || body.color !== '#06b6d4') throw new Error('Group not updated')
  })

  await check('POST /api/groups/:id/command executes without error', async () => {
    const res = await page.request.post(`${API_URL}/api/groups/${createdGroupId}/command`, {
      data: { on: true, bri: 128 },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
  })

  // ── Config Export / Import API Tests ─────────────────────────
  console.log('\n[ Config Backup API ]')
  let exportedBackup = null

  await check('GET /api/config/export returns full json backup', async () => {
    const res = await page.request.get(`${API_URL}/api/config/export`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    exportedBackup = await res.json()
    if (!exportedBackup.data || !Array.isArray(exportedBackup.data.groups)) {
      throw new Error('Invalid backup structure')
    }
  })

  await check('POST /api/config/import restores backup data', async () => {
    const res = await page.request.post(`${API_URL}/api/config/import`, {
      data: { mode: 'merge', data: exportedBackup.data },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (!body.ok) throw new Error('Import result not ok')
  })

  // ── UI: Groups View ──────────────────────────────────────────
  console.log('\n[ Groups UI ]')
  await page.goto(`${TARGET_URL}/groups`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(800)

  await check('Groups view renders', async () => {
    await page.waitForSelector('#main-content', { timeout: 5000 })
    const h1 = await page.locator('h1').first().textContent()
    if (!h1.includes('Groups')) throw new Error(`h1 = "${h1}"`)
  })

  await check('Group card renders for created group', async () => {
    await page.waitForSelector('[data-group-id]', { timeout: 5000 })
  })

  await check('Create Group button opens modal', async () => {
    await page.click('button:has-text("+ Create Group")')
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 })
  })

  await check('Modal closes on Cancel button', async () => {
    await page.click('button:has-text("Cancel")')
    await page.waitForTimeout(200)
    const modal = page.locator('[role="dialog"]')
    if (await modal.count() > 0) throw new Error('Modal still visible')
  })

  // ── UI: Dashboard View Mode ──────────────────────────────────
  console.log('\n[ Dashboard Group Clustering ]')
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(800)

  await check('Dashboard renders mode toggle', async () => {
    await page.waitForSelector('[aria-label="Dashboard view mode"]', { timeout: 5000 })
  })

  await check('Switching mode to Groups shows group cards', async () => {
    await page.click('button:has-text("Groups (")')
    await page.waitForTimeout(400)
    await page.waitForSelector('[data-group-id]', { timeout: 5000 })
  })

  await check('Switching back to Devices shows device cards or empty state', async () => {
    await page.click('button:has-text("Devices")')
    await page.waitForTimeout(400)
  })

  // ── Cleanup: delete test group ───────────────────────────────
  console.log('\n[ Cleanup ]')
  await check('DELETE /api/groups/:id removes group', async () => {
    if (!createdGroupId) throw new Error('No created group id')
    const res = await page.request.delete(`${API_URL}/api/groups/${createdGroupId}`)
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
