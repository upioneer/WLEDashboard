const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://127.0.0.1:5191'
const API = 'http://127.0.0.1:3211'
const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.29.0/screenshots')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function apiPost(p, body) {
  const res = await fetch(`${API}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${p} -> ${res.status}`)
  return res.json()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function captureScreenshots() {
  const beta = await apiPost('/api/devices', { name: 'Beta Strip', ip_address: '127.0.0.2' })
  const alpha = await apiPost('/api/devices', { name: 'Alpha Strip', ip_address: '127.0.0.1' })
  await apiPost(`/api/devices/${beta.id}/refresh`, {})
  await apiPost(`/api/devices/${alpha.id}/refresh`, {})
  await apiPost('/api/groups', { name: 'Rig Group', device_ids: [alpha.id, beta.id] })

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  })
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.locator('article').first().waitFor({ timeout: 25000 })
    await page.getByRole('link', { name: 'Studio' }).click()
    await page.getByText('Preview on:').waitFor({ timeout: 25000 })

    // Immediate-apply parameters card with the sandbox row (Keep/Restore).
    const targetSelect = page.locator('select', { has: page.locator('option', { hasText: 'Device...' }) })
    await targetSelect.selectOption({ label: 'Alpha Strip' })
    await page.getByText('Blink', { exact: true }).click()
    await page.getByRole('button', { name: 'Keep changes' }).waitFor({ timeout: 10000 })
    const paramsCard = page.getByText('Effect Parameters & Color Tuning').locator('..')
    await paramsCard.scrollIntoViewIfNeeded()
    await sleep(600)
    await paramsCard.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio-immediate-apply.png') })
    console.log('Captured: studio-immediate-apply.png')

    // Alphabetically sorted effect rows.
    await page.getByRole('button', { name: 'Dropdown / List' }).click()
    await page.locator('#effect-dropdown-select').waitFor({ timeout: 10000 })
    await sleep(400)
    const rows = page.locator('[role=listbox]')
    await rows.scrollIntoViewIfNeeded()
    await rows.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio-effects-sorted.png') })
    console.log('Captured: studio-effects-sorted.png')

    // Firmware-faithful Dynamic simulator.
    await page.locator('#effect-dropdown-select').selectOption('7')
    await sleep(800)
    const simCard = page.getByText('Live 60-Pixel LED Strip Simulator').locator('xpath=ancestor::div[3]')
    await simCard.scrollIntoViewIfNeeded()
    await simCard.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio-dynamic-sim.png') })
    console.log('Captured: studio-dynamic-sim.png')

    // Restyled 3D Objects tab.
    await page.getByRole('button', { name: '3D Objects' }).click()
    await page.getByText('Live Preview & Blueprint').waitFor({ timeout: 15000 })
    await sleep(1500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio-objects-restyled.png') })
    console.log('Captured: studio-objects-restyled.png')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

captureScreenshots()
