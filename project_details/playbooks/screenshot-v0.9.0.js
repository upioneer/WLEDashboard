const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = path.join(__dirname, '../../project_details/changelog/v0.9.0/screenshots')
const PROOF_DIR = path.join(__dirname, '../../project_details/proof/v0.9.0')

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
    // 01 Dashboard View - Device Cards with Calibrated Brightness & Toggles
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard-calibrated-controls.png') })
    console.log('Captured: 01-dashboard-calibrated-controls')

    // 02 Spatial View - 3D Legend & Interactive Floating Panel Card
    await page.goto(`${BASE_URL}/spatial`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-spatial-3d-legend-panel.png') })
    console.log('Captured: 02-spatial-3d-legend-panel')

    console.log('All v0.9.0 screenshots captured successfully!')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
  } finally {
    await browser.close()
  }
}

captureScreenshots()
