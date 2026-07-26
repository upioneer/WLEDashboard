const { chromium } = require('playwright')

const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:3001'

async function runTests() {
  console.log('\n WLEDashboard v0.6.0 Functional Test (Phase 6: Studio)\n')

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

  // 2. Studio Effects & Palettes API
  try {
    const res = await fetch(`${API_URL}/api/studio/effects`)
    const data = await res.json()
    if (Array.isArray(data) && data.length > 10) {
      pass(`GET /api/studio/effects returns ${data.length} built-in WLED effects`)
    } else {
      fail('GET /api/studio/effects failed', data)
    }
  } catch (err) {
    fail('Studio effects error', err)
  }

  // 3. Studio Custom Animation API
  let createdAnimId = null
  try {
    const res = await fetch(`${API_URL}/api/studio/animations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Test Sequence',
        duration_ms: 6000,
        timeline: [
          { time_ms: 0, bri: 255, col: '#ff0055', fx: 9 },
          { time_ms: 3000, bri: 180, col: '#00ffcc', fx: 27 },
        ],
      }),
    })
    const data = await res.json()
    if (res.status === 201 && data.id) {
      createdAnimId = data.id
      pass('POST /api/studio/animations creates custom timeline animation')
    } else {
      fail('POST /api/studio/animations failed', data)
    }
  } catch (err) {
    fail('Create animation error', err)
  }

  // 4. Studio View UI Render
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const titleText = await page.locator('h1').textContent()
    if (titleText?.includes('Effect Studio')) {
      pass('Studio view header renders')
    } else {
      fail('Studio view header missing', titleText)
    }

    const canvasVisible = await page.locator('canvas').isVisible()
    if (canvasVisible) {
      pass('60-Pixel LED Strip Simulator Canvas mounts in DOM')
    } else {
      fail('Pixel strip simulator canvas missing')
    }

    const tabsCount = await page.locator('button').count()
    if (tabsCount >= 3) {
      pass('Studio tab navigation (Presets, Timeline, Palette) renders')
    } else {
      fail('Studio tabs missing', tabsCount)
    }

  } catch (err) {
    fail('Studio UI test error', err)
  } finally {
    await browser.close()
  }

  // 5. Cleanup Animation
  if (createdAnimId) {
    try {
      const res = await fetch(`${API_URL}/api/studio/animations/${createdAnimId}`, { method: 'DELETE' })
      if (res.status === 204) {
        pass('DELETE /api/studio/animations/:id removes test animation')
      } else {
        fail('DELETE animation failed', res.statusText)
      }
    } catch (err) {
      fail('Delete animation cleanup error', err)
    }
  }

  console.log('\n────────────────────────────────────────')
  console.log(` Results: ${passed} passed, ${failed} failed`)
  console.log('────────────────────────────────────────\n')

  process.exit(failed > 0 ? 1 : 0)
}

runTests()
