const { chromium } = require('playwright')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    await page.goto('http://localhost:5173/studio', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // Fire 2012
    const fireCard = page.locator('div[class*="effectCard"]:has-text("Fire 2012")')
    await fireCard.scrollIntoViewIfNeeded()
    await fireCard.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'project_details/proof/simulator_fire.png' })

    // Rainbow
    const rainbowCard = page.locator('div[class*="effectCard"]:has-text("Rainbow")').first()
    await rainbowCard.scrollIntoViewIfNeeded()
    await rainbowCard.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'project_details/proof/simulator_rainbow.png' })

    // Merry Christmas
    const xmasCard = page.locator('div[class*="effectCard"]:has-text("Merry Christmas")')
    await xmasCard.scrollIntoViewIfNeeded()
    await xmasCard.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'project_details/proof/simulator_christmas.png' })

    console.log('Captured effect variety screenshots successfully!')
  } catch (err) {
    console.error('Error during test:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
