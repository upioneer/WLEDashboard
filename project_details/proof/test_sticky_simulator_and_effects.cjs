const { chromium } = require('playwright')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  try {
    console.log('Navigating to http://localhost:5173/studio...')
    await page.goto('http://localhost:5173/studio', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // Verify simulator is present
    const simulator = page.locator('div[class*="stickySimulator"]')
    const simBoxInitial = await simulator.boundingBox()
    console.log('Simulator initial position:', simBoxInitial.y)

    // Scroll down 600px
    console.log('Scrolling down 600px...')
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForTimeout(400)

    const simBoxScrolled = await simulator.boundingBox()
    console.log('Simulator scrolled position (should be pinned near top ~12px):', simBoxScrolled.y)

    if (simBoxScrolled.y > 50) {
      throw new Error(`Simulator did not stick near top! Position: ${simBoxScrolled.y}`)
    }

    // Capture screenshot of pinned simulator when scrolled down
    console.log('Capturing pinned simulator screenshot...')
    await page.screenshot({ path: 'project_details/proof/pinned_simulator_scrolled.png' })

    // Test clicking effects while scrolled down
    console.log('Clicking Pacifica effect card...')
    const pacificaCard = page.locator('div[class*="effectCard"]:has-text("Pacifica")')
    await pacificaCard.scrollIntoViewIfNeeded()
    await pacificaCard.click()
    await page.waitForTimeout(500)

    const badgeText = await page.textContent('span[class*="effectBadge"]')
    console.log('Active effect badge text:', badgeText)

    console.log('Capturing Pacifica render screenshot...')
    await page.screenshot({ path: 'project_details/proof/simulator_pacifica_scrolled.png' })

    // Click Lightning effect card
    console.log('Clicking Lightning effect card...')
    const lightningCard = page.locator('div[class*="effectCard"]:has-text("Lightning")')
    await lightningCard.scrollIntoViewIfNeeded()
    await lightningCard.click()
    await page.waitForTimeout(500)

    console.log('Capturing Lightning render screenshot...')
    await page.screenshot({ path: 'project_details/proof/simulator_lightning_scrolled.png' })

    console.log('Sticky simulator and effect tests passed successfully!')
  } catch (err) {
    console.error('Error during test:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
