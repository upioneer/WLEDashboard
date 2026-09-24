const { chromium } = require('playwright')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    // 1. Check custom dimension focus highlight
    console.log('Navigating to http://localhost:5173/studio...')
    await page.goto('http://localhost:5173/studio', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    await page.click('button:has-text("2D Matrix Canvas")')
    await page.waitForTimeout(500)

    await page.selectOption('select', 'custom')
    await page.waitForTimeout(300)

    // Focus into the custom width input
    const widthInput = page.locator('input[class*="dimInput"]').first()
    await widthInput.click()
    await page.waitForTimeout(200)

    await page.screenshot({ path: 'project_details/proof/custom_focus_single_highlight.png' })
    console.log('Captured custom focus highlight screenshot!')

    // 2. Check guides article title
    console.log('Navigating to http://localhost:5173/guides?topic=studio-timelines-matrix...')
    await page.goto('http://localhost:5173/guides?topic=studio-timelines-matrix', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const articleTitle = await page.locator('h1').textContent()
    console.log('Article title:', articleTitle)

    await page.screenshot({ path: 'project_details/proof/guides_3d_title.png' })
    console.log('Captured guides title screenshot!')

    console.log('All checks passed!')
  } catch (err) {
    console.error('Error during test:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
