const { chromium } = require('playwright')
const path = require('path')

const TARGET_URL = 'http://localhost:5173'
const SCREENSHOTS_DIR = 'C:/Users/hgran/OneDrive/Documents/code/Projects/WLEDashboard/project_details/changelog/v0.5.0/screenshots'

async function anonymizeIPs(page) {
  await page.evaluate(() => {
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      if (ipRegex.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(ipRegex, '192.168.1.xxx')
      }
    }
  })
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })

  async function shot(name, description) {
    await anonymizeIPs(page)
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`Captured (Sanitized): ${name} - ${description}`)
  }

  // 1. Spatial 3D Viewport
  await page.goto(`${TARGET_URL}/spatial`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(1200)
  await shot('01-spatial-3d-view', '3D Spatial Viewport rendering rooms, emissive LED strips, and hierarchy side panel')

  // 2. Room Selection & Floating Quick Control Overlay
  const roomItem = page.locator('[class*="roomItem"]').first()
  if (await roomItem.count() > 0) {
    await roomItem.click()
    await page.waitForTimeout(500)
    await shot('02-spatial-room-selected', 'Selected 3D room with floating quick-control light panel')
  }

  // 3. Add 3D Room Modal
  const addRoomBtn = page.locator('button', { hasText: '+ Add Room' })
  if (await addRoomBtn.count() > 0) {
    await addRoomBtn.click()
    await page.waitForTimeout(400)
    await shot('03-spatial-add-room-modal', 'Add 3D Room Modal dialog')
    await page.click('button:has-text("Cancel")')
  }

  await browser.close()
  console.log('All v0.5.0 screenshots captured with IP sanitization!')
})()
