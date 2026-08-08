const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = path.join(__dirname, '../../project_details/changelog/v0.12.0/screenshots')
const PROOF_DIR = path.join(__dirname, '../../project_details/proof/v0.12.0')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(PROOF_DIR, { recursive: true })

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  try {
    // 01 Dashboard Grid View (Default)
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard-grid.png') })
    console.log('Captured: 01-dashboard-grid')

    // 02 Dashboard Compact View
    await page.selectOption('select[title="Dashboard View"]', 'compact')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-dashboard-compact.png') })
    console.log('Captured: 02-dashboard-compact')

    // 03 Dashboard Rooms View
    await page.selectOption('select[title="Dashboard View"]', 'rooms')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-dashboard-rooms.png') })
    console.log('Captured: 03-dashboard-rooms')
    
    // 04 Dashboard Media View
    await page.selectOption('select[title="Dashboard View"]', 'media')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-dashboard-media.png') })
    console.log('Captured: 04-dashboard-media')

    console.log('All v0.12.0 screenshots captured successfully!')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
  } finally {
    await browser.close()
  }
}

captureScreenshots()
