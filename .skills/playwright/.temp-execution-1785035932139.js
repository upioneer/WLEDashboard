
(async () => {
  try {
    const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = path.join(__dirname, '../../project_details/changelog/v0.7.0/screenshots')
const PROOF_DIR = path.join(__dirname, '../../project_details/proof/v0.7.0')

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
    // 01 Dashboard Overview
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard-polish.png') })
    console.log('Captured: 01-dashboard-polish')

    // 02 Settings View - Unit System & Map Picker
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-settings-polish.png') })
    console.log('Captured: 02-settings-polish')

    console.log('All v0.7.0 screenshots captured successfully!')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
  } finally {
    await browser.close()
  }
}

captureScreenshots()

  } catch (error) {
    console.error('❌ Automation error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }

process.exit(1);
  }
})();
