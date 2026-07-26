const { chromium } = require('playwright')

const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:3001'

async function runTests() {
  console.log('\n WLEDashboard v0.7.0 Functional Test (Phase 7: Polish & Hardening)\n')

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

  // 2. Direct WebSocket Proxy Export Check
  try {
    const wsModule = require('../../apps/api/src/services/wledWsService.js')
    if (typeof wsModule.connectWledWebSocket === 'function' && typeof wsModule.sendWledWebSocketCommand === 'function') {
      pass('WLED direct WebSocket proxy service exported correctly')
    } else {
      fail('wledWsService exports missing')
    }
  } catch (err) {
    fail('WLED WebSocket service error', err)
  }

  // 3. UI Accessibility Attributes Test
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const liveRegionCount = await page.locator('[aria-live="polite"]').count()
    if (liveRegionCount >= 1) {
      pass(`WCAG aria-live polite regions present (${liveRegionCount} found)`)
    } else {
      fail('Aria live regions missing')
    }

    const navCount = await page.locator('nav button, nav a').count()
    if (navCount >= 5) {
      pass(`Keyboard navigable sidebar buttons present (${navCount} items)`)
    } else {
      fail('Sidebar navigation buttons missing', navCount)
    }

  } catch (err) {
    fail('Accessibility UI test error', err)
  } finally {
    await browser.close()
  }

  console.log('\n────────────────────────────────────────')
  console.log(` Results: ${passed} passed, ${failed} failed`)
  console.log('────────────────────────────────────────\n')

  process.exit(failed > 0 ? 1 : 0)
}

runTests()
