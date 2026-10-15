const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://127.0.0.1:5195'
const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.28.0/screenshots')

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
    // Dashboard first populates the device store used by Studio.
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.locator('article').first().waitFor({ timeout: 20000 })
    await page.waitForTimeout(1500)

    // Preview target picker: Device/Group toggle, dropdown, Apply, Reset.
    await page.getByRole('link', { name: 'Studio' }).click()
    await page.getByText('Preview on:').waitFor({ timeout: 20000 })
    const targetSelect = page.locator('select', { has: page.locator('option', { hasText: 'Device...' }) })
    const firstDevice = await targetSelect.locator('option').nth(1).getAttribute('value')
    await targetSelect.selectOption(firstDevice)
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await page.getByText('Sandbox mode.').waitFor({ timeout: 10000 })
    await page.getByText('Sandbox mode.').scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio-target-picker.png') })
    console.log('Captured: studio-target-picker.png')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

captureScreenshots()
