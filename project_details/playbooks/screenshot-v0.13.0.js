const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = path.join(__dirname, '../../project_details/changelog/v0.13.0/screenshots')
const PROOF_DIR = path.join(__dirname, '../../project_details/proof/v0.13.0')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(PROOF_DIR, { recursive: true })

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  try {
    // 01 Holographic Spatial Intro & Altimeter
    await page.goto(`${BASE_URL}/spatial`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500) // 0.5s into the dive
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-holographic-intro-altimeter.png') })
    console.log('Captured: 01-holographic-intro-altimeter')

    // 02 Spatial View - Direct Grab Rotation Handles (wait for intro to finish, then click a room)
    await page.waitForTimeout(4000) // Intro finishes after 4s total
    
    // Attempt to click the center to select a room (if there is one in the center)
    // Or just click the room list in the sidebar to select it
    await page.locator('text="Main House"').click().catch(() => {})
    await page.locator('text="Living Room"').first().click().catch(() => {})
    
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-spatial-rotation-handles.png') })
    console.log('Captured: 02-spatial-rotation-handles')

    // 03 Settings - Spotify Auth
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-spotify-auth-settings.png') })
    console.log('Captured: 03-spotify-auth-settings')

    console.log('All v0.13.0 screenshots captured successfully!')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
  } finally {
    await browser.close()
  }
}

captureScreenshots()
