const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.6.0/screenshots')
const PROOF_DIR = path.join(__dirname, '../proof/v0.6.0')

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
    // 01 Studio View - Preset Browser Tab
    await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-studio-preset-browser.png') })
    console.log('Captured: 01-studio-preset-browser')

    // 02 Studio View - Timeline Animator Tab
    await page.click('button:has-text("Timeline Animator")')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-studio-timeline-animator.png') })
    console.log('Captured: 02-studio-timeline-animator')

    // 03 Studio View - Palette Creator Tab
    await page.click('button:has-text("Palette Creator")')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-studio-palette-creator.png') })
    console.log('Captured: 03-studio-palette-creator')

    console.log('All v0.6.0 screenshots captured successfully!')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
  } finally {
    await browser.close()
  }
}

captureScreenshots()
