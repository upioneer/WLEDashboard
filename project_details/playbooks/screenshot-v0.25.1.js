const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://127.0.0.1:5173'
const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.25.1/screenshots')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function captureScreenshots() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  })
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  try {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Time & Clock').waitFor({ timeout: 15000 })
    await page.getByText('Time & Clock').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200)

    const out = path.join(SCREENSHOT_DIR, 'settings-time-clock.png')
    await page.screenshot({ path: out })
    console.log('Captured: settings-time-clock.png')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

captureScreenshots()
