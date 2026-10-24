const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://127.0.0.1:5199'
const API = 'http://127.0.0.1:3001'
const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.31.0/screenshots')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(method, url, body) {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

async function captureScreenshots() {
  const browser = await chromium.launch()
  let stripId = null
  try {
    // 1. Dashboard with flat hairline cards.
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
      await page.locator('article').first().waitFor({ timeout: 25000 })
      await sleep(1500)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard-hairline.png') })
      console.log('Captured: dashboard-hairline.png')
      // 2. Offline card closeup: marching ants strip, crisp name.
      const offline = page.locator('article', { hasText: 'Unreachable' }).first()
      if (await offline.count()) {
        await offline.screenshot({ path: path.join(SCREENSHOT_DIR, 'offline-ants.png') })
        console.log('Captured: offline-ants.png')
      }
      await ctx.close()
    }

    // 3. Virtual Strips builder with a device selected (bookends + swap).
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}/strips`, { waitUntil: 'domcontentloaded' })
      await page.getByLabel('Member 1 device').waitFor({ timeout: 25000 })
      const values = await page.evaluate(() => [...document.querySelector('select[aria-label="Member 1 device"]').options].map((o) => o.value).filter(Boolean))
      if (values.length > 0) {
        await page.getByLabel('Member 1 device').selectOption(values[0])
        await sleep(600)
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'strips-page.png') })
      console.log('Captured: strips-page.png')
      await ctx.close()
    }

    // 4. A playing strip with one reversed member (created + cleaned up).
    {
      const devices = (await api('GET', '/api/devices')).filter((d) => Number.isInteger(d.led_count) && d.led_count >= 10)
      if (devices.length >= 2) {
        const strip = await api('POST', '/api/virtual-strips', {
          name: 'Screenshot Run',
          members: [
            { device_id: devices[0].id, offset: 0, length: 30 },
            { device_id: devices[1].id, offset: 0, length: 30, reverse: true },
          ],
        })
        stripId = strip.id
        await api('POST', `/api/virtual-strips/${strip.id}/play`, { pattern: 'gradient', params: {} })
        const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
        const page = await ctx.newPage()
        await page.goto(`${BASE_URL}/strips`, { waitUntil: 'domcontentloaded' })
        await page.getByText('Screenshot Run').waitFor({ timeout: 25000 })
        await sleep(2500)
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'strips-running.png') })
        console.log('Captured: strips-running.png')
        await ctx.close()
      } else {
        console.log('Skipped strips-running.png (need 2 known count devices)')
      }
    }

    // 5. Studio with the aligned page header.
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Effect Studio' }).waitFor({ timeout: 25000 })
      await sleep(1500)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio-header.png') })
      console.log('Captured: studio-header.png')
      await ctx.close()
    }

    // 6. Groups with flat hairline cards.
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}/groups`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Groups' }).waitFor({ timeout: 25000 })
      await sleep(1500)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'groups-flat.png') })
      console.log('Captured: groups-flat.png')
      await ctx.close()
    }
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    process.exitCode = 1
  } finally {
    if (stripId) {
      await api('POST', `/api/virtual-strips/${stripId}/stop`).catch(() => {})
      await api('DELETE', `/api/virtual-strips/${stripId}`).catch(() => {})
      console.log('Cleaned up screenshot strip')
    }
    await browser.close()
  }
}

captureScreenshots()
