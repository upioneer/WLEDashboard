const { chromium } = require('playwright')
const path = require('path')

async function verifyDeviceManagerForm() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
  const page = await context.newPage()

  try {
    await page.goto('http://localhost:5173/devices', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // Toggle Add Device form
    const addBtn = page.locator('button:has-text("Add Device")').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)
    }

    await page.screenshot({ path: path.join(__dirname, 'device-manager-form-polished.png') })
    console.log('Captured: device-manager-form-polished.png')
  } catch (err) {
    console.error('Error during form verification:', err)
  } finally {
    await browser.close()
  }
}

verifyDeviceManagerForm()
