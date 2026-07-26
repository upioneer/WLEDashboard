const { chromium } = require('playwright')

const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:3001'

async function runTests() {
  console.log('\n WLEDashboard v0.8.0 Functional Test (Features 1, 2, 3: HA MQTT, Audio DDP, 2D Matrix)\n')

  let passed = 0
  let failed = 0

  function pass(msg) {
    console.log(`  PASS  ${msg}`)
    passed++
  }

  function fail(msg, err) {
    console.error(`  FAIL  ${msg}:`, err?.message || err)
    failed++
  }

  // 1. API Health Check
  try {
    const res = await fetch(`${API_URL}/api/health`)
    if (res.ok) pass('API responds on :3001')
    else fail('API health check failed', res.statusText)
  } catch (err) {
    fail('API health check error', err)
  }

  // 2. MQTT Status & Config API
  try {
    const res = await fetch(`${API_URL}/api/mqtt/status`)
    const data = await res.json()
    if (res.status === 200 && typeof data.enabled === 'boolean') {
      pass('GET /api/mqtt/status returns HA MQTT bridge status')
    } else {
      fail('GET /api/mqtt/status failed', data)
    }
  } catch (err) {
    fail('MQTT status API error', err)
  }

  // 3. Audio DDP Frame API
  try {
    const res = await fetch(`${API_URL}/api/audio/stream-ddp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_ip: '127.0.0.1',
        pixels: [[255, 0, 0], [0, 255, 0], [0, 0, 255]],
      }),
    })
    const data = await res.json()
    if (res.status === 200 && data.status === 'sent') {
      pass('POST /api/audio/stream-ddp streams real-time DDP audio packet')
    } else {
      fail('POST /api/audio/stream-ddp failed', data)
    }
  } catch (err) {
    fail('Audio DDP API error', err)
  }

  // 4. 2D Matrix API
  let createdMatrixId = null
  try {
    const res = await fetch(`${API_URL}/api/matrix/configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated 16x16 Matrix',
        width: 16,
        height: 16,
      }),
    })
    const data = await res.json()
    if (res.status === 201 && data.id) {
      createdMatrixId = data.id
      pass('POST /api/matrix/configs creates 2D matrix configuration')
    } else {
      fail('POST /api/matrix/configs failed', data)
    }
  } catch (err) {
    fail('Create matrix error', err)
  }

  // 5. Studio View UI Render with Audio & Matrix Tabs
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const audioTab = await page.locator('button:has-text("Audio Visualizer")').isVisible()
    if (audioTab) {
      pass('Audio Visualizer tab renders in Effect Studio')
    } else {
      fail('Audio Visualizer tab missing')
    }

    const matrixTab = await page.locator('button:has-text("2D Matrix Canvas")').isVisible()
    if (matrixTab) {
      pass('2D Matrix Canvas tab renders in Effect Studio')
    } else {
      fail('2D Matrix Canvas tab missing')
    }

  } catch (err) {
    fail('Studio UI test error', err)
  } finally {
    await browser.close()
  }

  // 6. Cleanup Matrix
  if (createdMatrixId) {
    try {
      const res = await fetch(`${API_URL}/api/matrix/configs/${createdMatrixId}`, { method: 'DELETE' })
      if (res.status === 204) {
        pass('DELETE /api/matrix/configs/:id removes test matrix')
      } else {
        fail('DELETE matrix failed', res.statusText)
      }
    } catch (err) {
      fail('Delete matrix cleanup error', err)
    }
  }

  console.log('\n────────────────────────────────────────')
  console.log(` Results: ${passed} passed, ${failed} failed`)
  console.log('────────────────────────────────────────\n')

  process.exit(failed > 0 ? 1 : 0)
}

runTests()
