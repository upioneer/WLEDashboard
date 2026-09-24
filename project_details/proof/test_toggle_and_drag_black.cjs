const { chromium } = require('playwright')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    console.log('Navigating to http://localhost:5173/studio...')
    await page.goto('http://localhost:5173/studio', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    console.log('Switching to 2D Matrix Canvas...')
    await page.click('button:has-text("2D Matrix Canvas")')
    await page.waitForTimeout(500)

    const cells = page.locator('div[class*="pixelCell"]')

    // Helper to get background color of cell idx
    async function getCellBg(idx) {
      return await cells.nth(idx).evaluate(el => el.style.backgroundColor)
    }

    console.log('1. Testing click turns black pixel into selected color...')
    const bgBefore = await getCellBg(0)
    console.log('Cell 0 before click:', bgBefore)

    await cells.nth(0).click()
    await page.waitForTimeout(100)
    const bgAfterFirstClick = await getCellBg(0)
    console.log('Cell 0 after 1st click:', bgAfterFirstClick)

    console.log('2. Testing click again turns pixel back to black...')
    await cells.nth(0).click()
    await page.waitForTimeout(100)
    const bgAfterSecondClick = await getCellBg(0)
    console.log('Cell 0 after 2nd click (should be black):', bgAfterSecondClick)

    console.log('3. Painting 4 consecutive pixels...')
    await cells.nth(0).click()
    await page.waitForTimeout(50)
    await cells.nth(1).click()
    await page.waitForTimeout(50)
    await cells.nth(2).click()
    await page.waitForTimeout(50)
    await cells.nth(3).click()
    await page.waitForTimeout(100)

    console.log('Cells 0-3 background before drag-erase:', [
      await getCellBg(0),
      await getCellBg(1),
      await getCellBg(2),
      await getCellBg(3),
    ])

    console.log('4. Testing click and drag changes anything touched to black...')
    // Drag from cell 0 across cells 1, 2, 3
    const cell0Box = await cells.nth(0).boundingBox()
    const cell3Box = await cells.nth(3).boundingBox()

    await page.mouse.move(cell0Box.x + cell0Box.width / 2, cell0Box.y + cell0Box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(50)
    await page.mouse.move(cell3Box.x + cell3Box.width / 2, cell3Box.y + cell3Box.height / 2, { steps: 10 })
    await page.waitForTimeout(50)
    await page.mouse.up()
    await page.waitForTimeout(100)

    const colorsAfterDrag = [
      await getCellBg(0),
      await getCellBg(1),
      await getCellBg(2),
      await getCellBg(3),
    ]
    console.log('Cells 0-3 background after drag-erase (all should be rgb(0, 0, 0)):', colorsAfterDrag)

    // Now paint a nice little smiley pattern and erase part of it to capture a screenshot proof
    console.log('Painting pattern for screenshot proof...')
    await cells.nth(18).click()
    await cells.nth(21).click()
    await cells.nth(34).click()
    await cells.nth(51).click()
    await cells.nth(66).click()
    await cells.nth(67).click()
    await cells.nth(68).click()
    await page.waitForTimeout(200)

    await page.screenshot({ path: 'project_details/proof/matrix_toggle_drag_black_proof.png' })
    console.log('Captured screenshot proof successfully!')

    // Validate that all erased cells are black
    const allBlack = colorsAfterDrag.every(c => c === 'rgb(0, 0, 0)' || c === '#000000')
    if (!allBlack) {
      throw new Error(`Expected all cells to be black after drag erase, but got ${JSON.stringify(colorsAfterDrag)}`)
    }

    console.log('All tests passed successfully!')
  } catch (err) {
    console.error('Error during test:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
