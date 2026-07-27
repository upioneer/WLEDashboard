const { chromium } = require('playwright')

async function testInteractivity() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    await page.goto('http://localhost:5173/spatial', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Select Living Room room box in side panel
    const livingRoomBtn = page.locator('text="Living Room"').first()
    if (await livingRoomBtn.isVisible()) {
      await livingRoomBtn.click()
      await page.waitForTimeout(500)
    }

    // Locate spatial toggle label wrapper
    const toggleLabel = page.locator('label:has([id^="spatial-toggle-"])').first()
    if (await toggleLabel.isVisible()) {
      console.log('Toggle label visible! Testing click...')
      await toggleLabel.click()
      await page.waitForTimeout(500)
      console.log('Toggle label clicked successfully!')
    } else {
      console.log('Toggle label not visible')
    }

    // Locate spatial slider
    const slider = page.locator('[id^="spatial-bri-"]').first()
    if (await slider.isVisible()) {
      console.log('Slider visible! Testing drag...')
      const box = await slider.boundingBox()
      if (box) {
        await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2)
        await page.waitForTimeout(500)
        console.log('Slider clicked/dragged successfully!')
      }
    } else {
      console.log('Slider not visible')
    }

  } catch (err) {
    console.error('Interactivity test error:', err)
  } finally {
    await browser.close()
  }
}

testInteractivity()
