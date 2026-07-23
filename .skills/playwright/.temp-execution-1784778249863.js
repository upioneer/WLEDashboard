const { chromium } = require('playwright')
const path = require('path')

const TARGET_URL = 'http://localhost:5173'
const API_URL    = 'http://localhost:3001'
const SCREENSHOTS_DIR = 'C:/Users/hgran/OneDrive/Documents/code/Projects/WLEDashboard/project_details/changelog/v0.4.0/screenshots'

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

  // Seed sample schedule & routine for screenshots
  const devRes = await page.request.post(`${API_URL}/api/devices`, {
    data: { name: 'Porch Strip', ip_address: '192.168.1.180', led_count: 90 },
  })
  const dev = await devRes.json()

  const schRes = await page.request.post(`${API_URL}/api/automation/schedules`, {
    data: {
      name: 'Sunset Porch Warmth',
      trigger_type: 'sunset',
      trigger_value: 'Sunset',
      target_type: 'device',
      target_id: dev.id || 'sample',
      payload: { on: true, bri: 220 },
      enabled: true,
    },
  })
  const schedule = await schRes.json()

  const rtRes = await page.request.post(`${API_URL}/api/automation/routines`, {
    data: {
      name: 'Evening Wind Down',
      description: 'Progressively dims porch and garden lights before turn off',
      steps: [
        { target_type: 'device', target_id: dev.id || 'sample', payload: { on: true, bri: 180 }, delay_ms: 0 },
        { target_type: 'device', target_id: dev.id || 'sample', payload: { on: true, bri: 60 }, delay_ms: 300000 },
      ],
      enabled: true,
    },
  })
  const routine = await rtRes.json()

  async function shot(name, description) {
    await anonymizeIPs(page)
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`Captured (Sanitized): ${name} - ${description}`)
  }

  // 1. Automation View (Schedules tab)
  await page.goto(`${TARGET_URL}/automation`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(800)
  await shot('01-automation-schedules', 'Automation view showing schedules, astronomical sun times, and trigger controls')

  // 2. Schedule Editor Modal
  await page.click('button:has-text("+ Create Schedule")')
  await page.waitForTimeout(500)
  await shot('02-schedule-modal', 'Schedule Editor Modal with fixed/sunset triggers and action controls')
  await page.click('button:has-text("Cancel")')

  // 3. Automation View (Routines tab)
  await page.click('button:has-text("Routines (")')
  await page.waitForTimeout(500)
  await shot('03-automation-routines', 'Automation view showing routines tab with timeline step badges')

  // 4. Routine Editor Modal
  await page.click('button:has-text("+ Create Routine")')
  await page.waitForTimeout(500)
  await shot('04-routine-modal', 'Routine Editor Modal with timeline step builder')
  await page.click('button:has-text("Cancel")')

  // Cleanup seeded test items
  if (schedule.id) await page.request.delete(`${API_URL}/api/automation/schedules/${schedule.id}`)
  if (routine.id)  await page.request.delete(`${API_URL}/api/automation/routines/${routine.id}`)
  if (dev.id)      await page.request.delete(`${API_URL}/api/devices/${dev.id}`)

  await browser.close()
  console.log('All v0.4.0 screenshots re-captured with IP sanitization!')
})()
