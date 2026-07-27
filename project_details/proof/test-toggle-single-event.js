const { chromium } = require('playwright')

async function testToggleSingleEvent() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    const toggle = page.locator('[id^="power-"]').first()
    if (await toggle.isVisible()) {
      const isCheckedBefore = await toggle.isChecked()
      console.log(`Before click: checked = ${isCheckedBefore}`)

      const wrapper = page.locator('[role="switch"]').first()
      await wrapper.click()
      await page.waitForTimeout(600)

      const isCheckedAfter = await toggle.isChecked()
      console.log(`After 1st click: checked = ${isCheckedAfter}`)

      if (isCheckedBefore !== isCheckedAfter) {
        console.log('SUCCESS: Toggle state changed cleanly without snapping back!')
      } else {
        console.error('FAIL: Toggle state snapped back!')
      }

      await wrapper.click()
      await page.waitForTimeout(600)
      const isCheckedFinal = await toggle.isChecked()
      console.log(`After 2nd click: checked = ${isCheckedFinal}`)
    } else {
      console.log('No toggle found')
    }
  } catch (err) {
    console.error('Toggle test error:', err)
  } finally {
    await browser.close()
  }
}

testToggleSingleEvent()
