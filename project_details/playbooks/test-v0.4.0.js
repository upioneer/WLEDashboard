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
  console.log('\n WLEDashboard v0.4.0 Functional Test (Phase 4: Automation)\n')
  const browser = await chromium.launch({ headless: true })
  const page    = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })

  // ── Pre-flight: API health ────────────────────────────────────
  console.log('[ API Health ]')
  await check('API responds on :3001', async () => {
    const res = await page.request.get(`${API_URL}/api/health`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
  })

  // ── SunTimes API Test ─────────────────────────────────────────
  console.log('\n[ SunTimes API ]')
  await check('GET /api/automation/suntimes returns sunrise and sunset', async () => {
    const res = await page.request.get(`${API_URL}/api/automation/suntimes`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (!body.sunrise || !body.sunset) throw new Error('Missing sunrise/sunset times')
  })

  // ── Schedules API Test ────────────────────────────────────────
  console.log('\n[ Schedules API ]')
  let createdScheduleId = null

  await check('POST /api/automation/schedules creates schedule', async () => {
    const res = await page.request.post(`${API_URL}/api/automation/schedules`, {
      data: {
        name: 'Test Sunset Schedule',
        trigger_type: 'sunset',
        trigger_value: '19:30',
        target_type: 'device',
        target_id: 'test-device-id',
        payload: { on: true, bri: 200 },
        enabled: true,
      },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (!body.id || body.name !== 'Test Sunset Schedule') throw new Error('Invalid schedule response')
    createdScheduleId = body.id
  })

  await check('GET /api/automation/schedules includes schedule', async () => {
    const res = await page.request.get(`${API_URL}/api/automation/schedules`)
    const body = await res.json()
    if (!body.some(s => s.id === createdScheduleId)) throw new Error('Schedule not in list')
  })

  await check('PATCH /api/automation/schedules/:id updates schedule', async () => {
    const res = await page.request.patch(`${API_URL}/api/automation/schedules/${createdScheduleId}`, {
      data: { name: 'Updated Sunset Schedule', enabled: false },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (body.name !== 'Updated Sunset Schedule' || body.enabled !== false) throw new Error('Schedule not updated')
  })

  await check('POST /api/automation/schedules/:id/trigger runs action', async () => {
    const res = await page.request.post(`${API_URL}/api/automation/schedules/${createdScheduleId}/trigger`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
  })

  // ── Routines API Test ─────────────────────────────────────────
  console.log('\n[ Routines API ]')
  let createdRoutineId = null

  await check('POST /api/automation/routines creates routine', async () => {
    const res = await page.request.post(`${API_URL}/api/automation/routines`, {
      data: {
        name: 'Test Wind Down Routine',
        description: 'Multi-step testing routine',
        steps: [
          { target_type: 'device', target_id: 'test-dev-1', payload: { on: true, bri: 255 }, delay_ms: 0 },
          { target_type: 'device', target_id: 'test-dev-1', payload: { on: true, bri: 100 }, delay_ms: 100 },
        ],
        enabled: true,
      },
    })
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
    const body = await res.json()
    if (!body.id || body.name !== 'Test Wind Down Routine') throw new Error('Invalid routine response')
    createdRoutineId = body.id
  })

  await check('GET /api/automation/routines includes routine', async () => {
    const res = await page.request.get(`${API_URL}/api/automation/routines`)
    const body = await res.json()
    if (!body.some(r => r.id === createdRoutineId)) throw new Error('Routine not in list')
  })

  await check('POST /api/automation/routines/:id/execute runs routine', async () => {
    const res = await page.request.post(`${API_URL}/api/automation/routines/${createdRoutineId}/execute`)
    if (!res.ok()) throw new Error(`Status ${res.status()}`)
  })

  // ── UI: Automation View ───────────────────────────────────────
  console.log('\n[ Automation UI ]')
  await page.goto(`${TARGET_URL}/automation`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(800)

  await check('Automation view renders', async () => {
    await page.waitForSelector('#main-content', { timeout: 5000 })
    const h1 = await page.locator('h1').first().textContent()
    if (!h1.includes('Automation')) throw new Error(`h1 = "${h1}"`)
  })

  await check('Sun times badge displays in header', async () => {
    await page.waitForSelector('[title*="astronomical"]', { timeout: 3000 })
  })

  await check('Schedule item renders in list', async () => {
    await page.waitForSelector('button:has-text("Run Now")', { timeout: 5000 })
  })

  await check('Create Schedule button opens ScheduleEditorModal', async () => {
    await page.click('button:has-text("+ Create Schedule")')
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 })
    await page.click('button:has-text("Cancel")')
  })

  await check('Switching tab to Routines renders routine cards', async () => {
    await page.click('button:has-text("Routines (")')
    await page.waitForTimeout(400)
    await page.waitForSelector('button:has-text("Execute Timeline")', { timeout: 5000 })
  })

  await check('Create Routine button opens RoutineEditorModal', async () => {
    await page.click('button:has-text("+ Create Routine")')
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 })
    await page.click('button:has-text("Cancel")')
  })

  // ── Cleanup ───────────────────────────────────────────────────
  console.log('\n[ Cleanup ]')
  await check('DELETE /api/automation/schedules/:id removes schedule', async () => {
    if (!createdScheduleId) throw new Error('No created schedule id')
    const res = await page.request.delete(`${API_URL}/api/automation/schedules/${createdScheduleId}`)
    if (res.status() !== 204) throw new Error(`Status ${res.status()}`)
  })

  await check('DELETE /api/automation/routines/:id removes routine', async () => {
    if (!createdRoutineId) throw new Error('No created routine id')
    const res = await page.request.delete(`${API_URL}/api/automation/routines/${createdRoutineId}`)
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
