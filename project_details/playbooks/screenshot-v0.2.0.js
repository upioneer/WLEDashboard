const { chromium } = require('playwright')
const path = require('path')

const TARGET_URL = 'http://localhost:5173'
const SCREENSHOTS_DIR = path.resolve(
  __dirname,
  '../changelog/v0.2.0/screenshots'
)

;(async () => {
  const browser = await chromium.launch({ headless: true })

  async function shot(page, name, description) {
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`Captured: ${name} - ${description}`)
    return file
  }

  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. Dashboard - with device
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(1200)
  await shot(page, '01-dashboard', 'Dashboard with device card')

  // 2. Hover over card to show the dots menu button
  const card = page.locator('[data-device-id]').first()
  if (await card.count() > 0) {
    await card.hover()
    await page.waitForTimeout(300)
    await shot(page, '02-card-hover', 'Device card hover state with menu button visible')
  }

  // 3. Right-click context menu
  if (await card.count() > 0) {
    await card.click({ button: 'right' })
    await page.waitForTimeout(400)
    await shot(page, '03-context-menu', 'Right-click context menu with device actions')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }

  // 4. Device Manager
  await page.click('a[href="/devices"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
  await shot(page, '04-device-manager', 'Device Manager view with device list')

  // 5. Add device form
  const addBtn = page.locator('button', { hasText: 'Add Device' })
  if (await addBtn.count() > 0) {
    await addBtn.click()
    await page.waitForTimeout(400)
    await shot(page, '05-add-device-form', 'Add Device form expanded')
    // Close it
    await page.click('button:has-text("Cancel")')
  }

  // 6. Settings
  await page.click('a[href="/settings"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
  await shot(page, '06-settings', 'Settings view with poll interval controls')

  // 7. Dashboard empty search state - if more than 4 devices
  await page.click('a[href="/"]')
  await page.waitForTimeout(600)
  const searchInput = page.locator('#device-search')
  if (await searchInput.count() > 0) {
    await searchInput.fill('zzznomatch')
    await page.waitForTimeout(500)
    await shot(page, '07-search-no-results', 'Search with no matching results')
    await searchInput.clear()
  }

  await browser.close()
  console.log('\nAll screenshots saved to:', SCREENSHOTS_DIR)
})()
