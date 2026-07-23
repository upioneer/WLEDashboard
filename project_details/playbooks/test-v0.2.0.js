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
  console.log('\n WLEDashboard v0.2.0 Functional Test\n')
  const browser = await chromium.launch({ headless: true })
  const page    = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })

  // ── Pre-flight: ensure API is up ─────────────────────────────
  console.log('[ API Health ]')
  await check('API responds on :3001', async () => {
    const res = await page.request.get(`${API_URL}/api/health`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (body.status !== 'ok') throw new Error('status != ok')
  })

  // ── Seed: add a test device via API ──────────────────────────
  let testDeviceId = null
  console.log('\n[ Device API ]')
  await check('POST /api/devices creates device', async () => {
    const res = await page.request.post(`${API_URL}/api/devices`, {
      data: { name: 'Test Device PW', ip_address: '10.0.0.99', led_count: 60 },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (!body.id) throw new Error('No id in response')
    testDeviceId = body.id
  })

  await check('GET /api/devices returns the device', async () => {
    const res = await page.request.get(`${API_URL}/api/devices`)
    const body = await res.json()
    if (!body.some(d => d.id === testDeviceId)) throw new Error('Device not in list')
  })

  await check('PATCH /api/devices/:id updates name', async () => {
    const res = await page.request.patch(`${API_URL}/api/devices/${testDeviceId}`, {
      data: { name: 'Test Device PW Renamed' },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (body.name !== 'Test Device PW Renamed') throw new Error('Name not updated')
  })

  await check('POST /api/devices/reorder accepts id array', async () => {
    const listRes = await page.request.get(`${API_URL}/api/devices`)
    const ids = (await listRes.json()).map(d => d.id)
    const res = await page.request.post(`${API_URL}/api/devices/reorder`, { data: { ids } })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
  })

  await check('GET /api/settings returns object', async () => {
    const res = await page.request.get(`${API_URL}/api/settings`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (typeof body !== 'object') throw new Error('Not an object')
  })

  await check('PATCH /api/settings persists values', async () => {
    const res = await page.request.patch(`${API_URL}/api/settings`, {
      data: { test_key: 'test_val_pw' },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const verify = await page.request.get(`${API_URL}/api/settings`)
    const body = await verify.json()
    if (body.test_key !== 'test_val_pw') throw new Error('Value not persisted')
  })

  await check('Rejects invalid device IP', async () => {
    const res = await page.request.post(`${API_URL}/api/devices`, {
      data: { name: 'Bad', ip_address: 'not-an-ip' },
    })
    if (res.ok()) throw new Error('Should have been rejected')
  })

  // ── UI: Dashboard ─────────────────────────────────────────────
  console.log('\n[ Dashboard UI ]')
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(1000)

  await check('Dashboard renders without crash', async () => {
    await page.waitForSelector('#main-content', { timeout: 5000 })
  })

  await check('Device card renders', async () => {
    await page.waitForSelector('[data-device-id]', { timeout: 5000 })
  })

  await check('Status dot present on card', async () => {
    const dot = page.locator('[data-device-id]').first().locator('[class*="statusDot"]')
    await dot.waitFor({ timeout: 3000 })
  })

  await check('Brightness slider renders', async () => {
    const slider = page.locator('[data-device-id]').first().locator('input[type="range"]').first()
    await slider.waitFor({ timeout: 3000 })
  })

  await check('Toggle renders', async () => {
    const toggle = page.locator('[data-device-id]').first().locator('input[type="checkbox"]').first()
    await toggle.waitFor({ timeout: 3000 })
  })

  // ── UI: Context Menu ──────────────────────────────────────────
  console.log('\n[ Context Menu ]')
  await check('Right-click opens context menu', async () => {
    const card = page.locator('[data-device-id]').first()
    await card.click({ button: 'right' })
    await page.waitForSelector('[role="menu"]', { timeout: 3000 })
  })

  await check('Context menu has Rename item', async () => {
    await page.waitForSelector('[role="menuitem"]', { timeout: 2000 })
    const items = await page.locator('[role="menuitem"]').allTextContents()
    if (!items.some(t => t.includes('Rename'))) throw new Error(`Items: ${items.join(', ')}`)
  })

  await check('Context menu has Remove Device item', async () => {
    const items = await page.locator('[role="menuitem"]').allTextContents()
    if (!items.some(t => t.includes('Remove'))) throw new Error(`Items: ${items.join(', ')}`)
  })

  await check('Escape closes context menu', async () => {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const menu = page.locator('[role="menu"]')
    if (await menu.count() > 0) throw new Error('Menu still visible after Escape')
  })

  // ── UI: Rename ────────────────────────────────────────────────
  console.log('\n[ Inline Rename ]')
  await check('Double-click name activates rename input', async () => {
    const name = page.locator('[data-device-id]').first().locator('[class*="name"]').first()
    await name.dblclick()
    await page.waitForSelector('[class*="renameInput"]', { timeout: 3000 })
  })

  await check('Escape cancels rename without saving', async () => {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const input = page.locator('[class*="renameInput"]')
    if (await input.count() > 0) throw new Error('Rename input still visible')
  })

  // ── UI: Device Manager ────────────────────────────────────────
  console.log('\n[ Device Manager ]')
  await page.click('a[href="/devices"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  await check('Device Manager renders', async () => {
    await page.waitForSelector('h1', { timeout: 5000 })
    const h1 = await page.locator('h1').first().textContent()
    if (!h1.includes('Device Manager')) throw new Error(`h1 = "${h1}"`)
  })

  await check('Device row visible in list', async () => {
    await page.waitForSelector('[class*="rowName"]', { timeout: 5000 })
  })

  await check('Add Device button exists', async () => {
    await page.waitForSelector('button:has-text("Add Device")', { timeout: 3000 })
  })

  await check('Add Device form expands on click', async () => {
    await page.click('button:has-text("Add Device")')
    await page.waitForSelector('[class*="addForm"]', { timeout: 3000 })
  })

  await check('Add Device form collapses on Cancel', async () => {
    await page.click('button:has-text("Cancel")')
    await page.waitForTimeout(300)
    const form = page.locator('[class*="addForm"]')
    if (await form.count() > 0) throw new Error('Form still visible')
  })

  await check('Edit button opens inline edit fields', async () => {
    const editBtn = page.locator('button:has-text("Edit")').first()
    await editBtn.click()
    await page.waitForSelector('[class*="editInput"]', { timeout: 3000 })
  })

  await check('Cancel edit closes fields', async () => {
    await page.click('button:has-text("Cancel")')
    await page.waitForTimeout(200)
    const inputs = page.locator('[class*="editInput"]')
    if (await inputs.count() > 0) throw new Error('Edit inputs still visible')
  })

  // ── UI: Settings ──────────────────────────────────────────────
  console.log('\n[ Settings ]')
  await page.click('a[href="/settings"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  await check('Settings renders', async () => {
    const h1 = await page.locator('h1').first().textContent()
    if (!h1.includes('Settings')) throw new Error(`h1 = "${h1}"`)
  })

  await check('Poll interval input present', async () => {
    await page.waitForSelector('#poll_interval_ms', { timeout: 3000 })
  })

  await check('Save button present', async () => {
    await page.waitForSelector('button:has-text("Save")', { timeout: 3000 })
  })

  await check('Save dispatches success toast', async () => {
    await page.click('button:has-text("Save")')
    await page.waitForSelector('[role="alert"]', { timeout: 5000 })
    const msg = await page.locator('[role="alert"]').first().textContent()
    if (!msg.includes('saved') && !msg.includes('Settings')) throw new Error(`Toast: "${msg}"`)
  })

  // ── Cleanup: delete test device ───────────────────────────────
  console.log('\n[ Cleanup ]')
  await check('DELETE /api/devices/:id removes device', async () => {
    if (!testDeviceId) throw new Error('No test device id')
    const res = await page.request.delete(`${API_URL}/api/devices/${testDeviceId}`)
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
