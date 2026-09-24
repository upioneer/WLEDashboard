const { chromium } = require('playwright')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    await page.goto('http://localhost:5173/studio', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await page.click('button:has-text("2D Matrix Canvas")')
    await page.waitForTimeout(500)

    // Select custom
    await page.selectOption('select', 'custom')
    await page.waitForTimeout(300)

    // Set custom Width to 48 and Height to 24
    const inputs = page.locator('input[class*="dimInput"]')
    await inputs.nth(0).fill('48')
    await page.waitForTimeout(200)
    await inputs.nth(1).fill('24')
    await page.waitForTimeout(300)

    // Zoom in to 150%
    await page.click('button[title="Zoom In"]')
    await page.waitForTimeout(200)
    await page.click('button[title="Zoom In"]')
    await page.waitForTimeout(200)

    const dimBadge = await page.textContent('div[class*="dimBadge"]')
    console.log('Dimension badge text:', dimBadge)

    // Scroll viewport
    const viewport = page.locator('div[class*="canvasViewport"]')
    await viewport.evaluate((el) => {
      el.scrollLeft = 200
      el.scrollTop = 100
    })
    await page.waitForTimeout(300)

    await page.screenshot({ path: 'project_details/proof/matrix_custom_large_scroll.png' })
    console.log('Large scroll test completed successfully!')
  } catch (err) {
    console.error('Error during test:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
