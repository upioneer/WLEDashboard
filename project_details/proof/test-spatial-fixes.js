const { chromium } = require('playwright')
const path = require('path')

async function verifySpatialFixes() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
  const page = await context.newPage()

  try {
    await page.goto('http://localhost:5173/spatial', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Take canvas screenshot showing legend and floating panel
    await page.screenshot({ path: path.join(__dirname, 'spatial-fixes-overview.png') })
    console.log('Captured: spatial-fixes-overview.png')

    // Click "Edit Room" to test modal overlay z-index
    const editBtn = page.locator('button:has-text("Edit Room")').first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(__dirname, 'spatial-modal-overlay.png') })
      console.log('Captured: spatial-modal-overlay.png')
    }
  } catch (err) {
    console.error('Error during spatial verification:', err)
  } finally {
    await browser.close()
  }
}

verifySpatialFixes()
