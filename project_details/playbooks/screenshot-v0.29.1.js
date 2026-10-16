const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://127.0.0.1:5191'
const API = 'http://127.0.0.1:3211'
const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.29.1/screenshots')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function captureScreenshots() {
  // One device, deliberately zero groups: shows the empty-groups hint slot.
  const dev = await (
    await fetch(`${API}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Solo Strip', ip_address: '127.0.0.1' }),
    })
  ).json()
  await fetch(`${API}/api/devices/${dev.id}/refresh`, { method: 'POST' })

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
    await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Preview on:').waitFor({ timeout: 25000 })
    await page.getByText('No groups yet. Create one').waitFor({ timeout: 10000 })
    const paramsCard = page.getByText('Effect Parameters & Color Tuning').locator('..')
    await paramsCard.scrollIntoViewIfNeeded()
    await sleep(600)
    await paramsCard.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio-no-groups-hint.png') })
    console.log('Captured: studio-no-groups-hint.png')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

captureScreenshots()
