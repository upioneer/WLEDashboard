const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = path.join(__dirname, '../../project_details/changelog/v0.8.0/screenshots')
const PROOF_DIR = path.join(__dirname, '../../project_details/proof/v0.8.0')

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
    // 01 Settings View - HA MQTT Section
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-settings-ha-mqtt.png') })
    console.log('Captured: 01-settings-ha-mqtt')

    // 02 Studio View - Audio Visualizer Tab
    await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Audio Visualizer")')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-studio-audio-visualizer.png') })
    console.log('Captured: 02-studio-audio-visualizer')

    // 03 Studio View - 2D Matrix Canvas Tab
    await page.click('button:has-text("2D Matrix Canvas")')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-studio-2d-matrix-canvas.png') })
    console.log('Captured: 03-studio-2d-matrix-canvas')

    console.log('All v0.8.0 screenshots captured successfully!')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
  } finally {
    await browser.close()
  }
}

captureScreenshots()
