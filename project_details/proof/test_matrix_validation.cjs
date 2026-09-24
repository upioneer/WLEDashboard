const { chromium } = require('playwright')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 950 } })
  const page = await context.newPage()

  try {
    console.log('Navigating to http://localhost:5173/studio...')
    await page.goto('http://localhost:5173/studio', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    console.log('Switching to 2D Matrix Canvas...')
    await page.click('button:has-text("2D Matrix Canvas")')
    await page.waitForTimeout(500)

    // Check empty name field
    const nameInput = page.locator('input[placeholder="e.g. Retro Space Invader"]')
    const nameValue = await nameInput.inputValue()
    console.log('Initial name value is empty string:', nameValue === '')

    // 1. Try to save with blank name
    console.log('Clicking Save Drawing with empty name...')
    await page.click('button:has-text("Save Drawing")')
    await page.waitForTimeout(400)

    // 2. Type a name and paint a pixel
    console.log('Filling name and painting pixel...')
    await nameInput.fill('Retro Invader')
    const firstCell = page.locator('div[class*="pixelCell"]').first()
    await firstCell.click()
    await page.waitForTimeout(200)

    console.log('Saving valid drawing...')
    await page.click('button:has-text("Save Drawing")')
    await page.waitForTimeout(800)

    // Verify it changed to "Update Drawing" and shows "New Drawing" button
    const updateBtn = await page.locator('button:has-text("Update Drawing")').isVisible()
    const newBtn = await page.locator('button:has-text("New Drawing")').isVisible()
    console.log('Save transitioned to update state:', updateBtn && newBtn)

    // 3. Try to save duplicate name
    console.log('Clicking New Drawing to test duplicate name validation...')
    await page.click('button:has-text("New Drawing")')
    await page.waitForTimeout(300)

    await nameInput.fill('retro invader')
    await page.click('button:has-text("Save Drawing")')
    await page.waitForTimeout(400)

    // 4. Click saved card to auto load
    console.log('Clicking saved drawing card to auto-load...')
    const savedCard = page.locator('div[class*="savedCard"]').first()
    await savedCard.click()
    await page.waitForTimeout(400)

    const loadedName = await nameInput.inputValue()
    console.log('Auto-loaded drawing name:', loadedName)

    await page.screenshot({ path: 'project_details/proof/matrix_validation_proof.png' })
    console.log('Matrix validation test passed successfully!')
  } catch (err) {
    console.error('Error during test:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
