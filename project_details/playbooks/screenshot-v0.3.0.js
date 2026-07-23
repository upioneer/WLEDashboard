const { chromium } = require('playwright')
const path = require('path')

const TARGET_URL = 'http://localhost:5173'
const API_URL    = 'http://localhost:3001'
const SCREENSHOTS_DIR = 'C:/Users/hgran/OneDrive/Documents/code/Projects/WLEDashboard/project_details/changelog/v0.3.0/screenshots'

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

  // Seed a sample device and group for clear screenshots
  const devRes = await page.request.post(`${API_URL}/api/devices`, {
    data: { name: 'Balcony Lights', ip_address: '192.168.1.150', led_count: 120 },
  })
  const dev = await devRes.json()

  const groupRes = await page.request.post(`${API_URL}/api/groups`, {
    data: {
      name: 'Outdoor Zone',
      type: 'zone',
      color: '#10b981',
      device_ids: dev.id ? [dev.id] : [],
    },
  })
  const group = await groupRes.json()

  async function shot(name, description) {
    await anonymizeIPs(page)
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`Captured (Sanitized): ${name} - ${description}`)
  }

  // 1. Groups view
  await page.goto(`${TARGET_URL}/groups`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(800)
  await shot('01-groups-view', 'Groups view showing group cards, filters, and backup controls')

  // 2. Group Editor Modal
  await page.click('button:has-text("+ Create Group")')
  await page.waitForTimeout(500)
  await shot('02-group-modal', 'Group Editor Modal with group type, accent palette, and member picker')
  await page.click('button:has-text("Cancel")')

  // 3. Dashboard Group Mode
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(600)
  const modeBtn = page.locator('button', { hasText: 'Groups (' })
  if (await modeBtn.count() > 0) {
    await modeBtn.click()
    await page.waitForTimeout(400)
    await shot('03-dashboard-group-mode', 'Dashboard showing Group Clusters view mode')
  }

  // Cleanup seeded test device & group
  if (group.id) await page.request.delete(`${API_URL}/api/groups/${group.id}`)
  if (dev.id)   await page.request.delete(`${API_URL}/api/devices/${dev.id}`)

  await browser.close()
  console.log('All v0.3.0 screenshots re-captured with IP sanitization!')
})()
