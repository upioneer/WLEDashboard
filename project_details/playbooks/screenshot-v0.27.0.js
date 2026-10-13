const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://127.0.0.1:5183'
const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.27.0/screenshots')

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
    // 1. Dashboard first: it populates the device store used by Studio.
    // Refresh State context menu on a device card.
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    const card = page.locator('article').first()
    await card.waitFor({ timeout: 20000 })
    await page.waitForTimeout(1500)
    await card.click({ button: 'right' })
    await page.getByText('Refresh State').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard-refresh.png') })
    console.log('Captured: dashboard-refresh.png')
    await page.keyboard.press('Escape')

    // 2. Studio sandbox banner: apply an effect to a demo device.
    // In-app navigation preserves the device store across views.
    await page.getByRole('link', { name: 'Studio' }).click()
    await page.getByText('Apply Live Config to Target:').waitFor({ timeout: 20000 })
    const deviceSelect = page.locator('select', { has: page.locator('option', { hasText: 'Device...' }) })
    const firstDevice = await deviceSelect.locator('option').nth(1).getAttribute('value')
    await deviceSelect.selectOption(firstDevice)
    await page.getByText('Sandbox mode.').waitFor({ timeout: 10000 })
    await page.getByText('Sandbox mode.').scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio-sandbox.png') })
    console.log('Captured: studio-sandbox.png')

    // 3. Saved matrix recall in the marquee tab
    await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded' })
    await page.getByText('2D Matrix Canvas').click()
    await page.getByRole('tab', { name: 'Marquee' }).click()
    await page.getByPlaceholder('SCROLLING TEXT').first().fill('KEEP IT')
    await page.getByText('Saved matrix').scrollIntoViewIfNeeded()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio-saved-matrix.png') })
    console.log('Captured: studio-saved-matrix.png')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

captureScreenshots()
