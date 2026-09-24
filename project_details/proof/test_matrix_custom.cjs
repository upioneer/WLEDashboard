const { chromium } = require('playwright')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    console.log('Navigating to http://localhost:5173/studio...')
    await page.goto('http://localhost:5173/studio', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    console.log('Clicking 2D Matrix Canvas tab...')
    await page.click('button:has-text("2D Matrix Canvas")')
    await page.waitForTimeout(500)

    console.log('Selecting Custom matrix size...')
    await page.selectOption('select', 'custom')
    await page.waitForTimeout(500)

    const dimBadge = await page.textContent('div[class*="dimBadge"]')
    console.log('Dimension badge text:', dimBadge)

    console.log('Zooming in twice...')
    await page.click('button[title="Zoom In"]')
    await page.waitForTimeout(200)
    await page.click('button[title="Zoom In"]')
    await page.waitForTimeout(200)

    const zoomText = await page.textContent('button[class*="zoomBadge"]')
    console.log('Zoom text after in:', zoomText)

    console.log('Resetting zoom...')
    await page.click('button[class*="zoomBadge"]')
    await page.waitForTimeout(200)
    const resetZoomText = await page.textContent('button[class*="zoomBadge"]')
    console.log('Zoom text after reset:', resetZoomText)

    // Click on a pixel cell to draw
    const firstCell = page.locator('div[class*="pixelCell"]').first()
    await firstCell.click()
    await page.waitForTimeout(200)

    console.log('Taking screenshot of custom matrix canvas...')
    await page.screenshot({ path: 'project_details/proof/matrix_custom_test.png' })
    console.log('Test completed successfully!')
  } catch (err) {
    console.error('Error during test:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
