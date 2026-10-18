const { chromium } = require('playwright')
const http = require('http')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://127.0.0.1:5199'
const API = 'http://127.0.0.1:3001'
const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.30.0/screenshots')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Best effort mock WLED on port 80 so seeded devices render online.
// Falls back silently to offline cards when the port is unavailable.
function startMockWled() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    if (req.url.startsWith('/json/info')) {
      res.end(JSON.stringify({ name: 'Mock Strip', arch: 'esp32', version: '0.15.0' }))
    } else {
      res.end(JSON.stringify({ on: true, bri: 128, seg: [{ fx: 0, col: [[139, 92, 246]] }] }))
    }
  })
  return new Promise((resolve) => {
    server.on('error', () => resolve(null))
    server.listen(80, '127.0.0.1', () => resolve(server))
  })
}

async function seed() {
  const names = ['deck 10', 'Arcadia', 'deck 2', 'Porch']
  for (const name of names) {
    const dev = await (
      await fetch(`${API}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ip_address: '127.0.0.1' }),
      })
    ).json()
    await fetch(`${API}/api/devices/${dev.id}/refresh`, { method: 'POST' }).catch(() => {})
  }
}

async function captureScreenshots() {
  const mock = await startMockWled()
  console.log(mock ? 'Mock WLED on :80' : 'No mock WLED (offline cards)')
  await seed()

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  })
  try {
    // 1. Dashboard with an ambient background pattern.
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
      await ctx.addInitScript(() => {
        localStorage.setItem('wled_background', JSON.stringify({ pattern: 'aurora', mode: 'custom', color: '#8b5cf6', targetId: null }))
      })
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
      await page.getByText('Arcadia').first().waitFor({ timeout: 25000 })
      await sleep(800)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard-bg.png') })
      console.log('Captured: dashboard-bg.png')
      await ctx.close()
    }

    // 2. Device Manager alphabetical sort.
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}/devices`, { waitUntil: 'domcontentloaded' })
      await page.getByLabel('Sort devices').waitFor({ timeout: 25000 })
      await page.getByLabel('Sort devices').selectOption('az')
      await sleep(600)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'device-manager-sorts.png') })
      console.log('Captured: device-manager-sorts.png')
      await ctx.close()
    }

    // 3. Settings Device Names section.
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Device Names' }).waitFor({ timeout: 25000 })
      const section = page.locator('section[aria-labelledby="names-heading"]')
      await section.locator('input[type="checkbox"]').first().waitFor({ timeout: 15000 })
      await page.getByRole('heading', { name: 'Device Names' }).scrollIntoViewIfNeeded()
      await sleep(400)
      await section.screenshot({ path: path.join(SCREENSHOT_DIR, 'settings-names.png') })
      console.log('Captured: settings-names.png')
      await ctx.close()
    }

    // 4. Location guard notice when geolocation is unavailable.
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
      await ctx.addInitScript(() => {
        Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true })
      })
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Location & Astronomy' }).waitFor({ timeout: 25000 })
      await page.getByText('does not expose geolocation').waitFor({ timeout: 10000 })
      await page.getByRole('heading', { name: 'Location & Astronomy' }).scrollIntoViewIfNeeded()
      await sleep(400)
      await page.locator('section[aria-labelledby="location-heading"]').screenshot({ path: path.join(SCREENSHOT_DIR, 'settings-geo-notice.png') })
      console.log('Captured: settings-geo-notice.png')
      await ctx.close()
    }
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
    if (mock) mock.close()
  }
}

captureScreenshots()
