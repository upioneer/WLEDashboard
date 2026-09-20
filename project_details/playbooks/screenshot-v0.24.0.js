const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const API_URL = 'http://127.0.0.1:3001/api'
const BASE_URL = 'http://127.0.0.1:5173'
const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.24.0/screenshots')
const TMP_BACKUP = 'C:/Users/hgran/AppData/LocalLow/muse-shell-sandbox-7750a5b2-5598-48f6-80d3-71976781078e/restore-preview-backup.json'

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function api(method, url, body) {
  const res = await fetch(`${API_URL}${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`)
  return res.json()
}

async function captureScreenshots() {
  // Seed representative data so the restore preview shows real per-category counts.
  await api('POST', '/config/import', {
    mode: 'merge',
    data: {
      devices: [
        { id: 'shot-dev-1', name: 'Living Room Cove', ip_address: '192.168.1.101', led_count: 300 },
        { id: 'shot-dev-2', name: 'Patio String', ip_address: '192.168.1.102', led_count: 150 },
      ],
      groups: [{ id: 'shot-group-1', name: 'Downstairs', type: 'zone' }],
      group_members: [{ group_id: 'shot-group-1', device_id: 'shot-dev-1' }],
      presets: [{ id: 'shot-preset-1', name: 'Evening Glow', state_json: '{}' }],
      settings: [{ key: 'poll_interval_ms', value: '5000' }],
      schedules: [{ id: 'shot-sched-1', name: 'Sunset On', trigger_type: 'sunset' }],
      routines: [{ id: 'shot-routine-1', name: 'Movie Night', is_enabled: 1 }],
      routine_steps: [{ id: 'shot-step-1', routine_id: 'shot-routine-1', step_order: 0 }],
      dwellings: [{ id: 'shot-dwelling-1', name: 'Main House', sort_order: 0 }],
      floors: [{ id: 'shot-floor-1', dwelling_id: 'shot-dwelling-1', name: 'Ground Floor', elevation: 0 }],
      rooms: [{ id: 'shot-room-1', floor_id: 'shot-floor-1', name: 'Living Room', width: 5, depth: 4 }],
      anchors: [{ id: 'shot-anchor-1', room_id: 'shot-room-1', device_id: 'shot-dev-1', name: 'Cove Strip' }],
      animations: [{ id: 'shot-anim-1', name: 'Sunrise Fade', timeline_json: '[]', duration_ms: 8000 }],
      palettes: [{ id: 'shot-pal-1', name: 'Ember', colors_json: '["#ff5500","#ffaa00"]' }],
      matrices: [{ id: 'shot-mat-1', name: 'Door Matrix', width: 16, height: 16 }],
      matrix_drawings: [{ id: 'shot-draw-1', name: 'Heart', width: 16, height: 16, pixels_json: '[]' }],
    },
  })

  const backup = await api('GET', '/config/export')
  fs.writeFileSync(TMP_BACKUP, JSON.stringify(backup, null, 2))

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
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Backup & Restore').first().waitFor({ timeout: 15000 })
    await page.getByText('Backup & Restore').first().scrollIntoViewIfNeeded()

    await page.locator('input[type="file"]').setInputFiles(TMP_BACKUP)
    await page.getByText('Backup Preview').waitFor({ timeout: 10000 })
    await page.getByText('Restore scope').scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)

    const out = path.join(SCREENSHOT_DIR, 'settings-restore-scope.png')
    await page.screenshot({ path: out })
    console.log('Captured: settings-restore-scope.png')
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

captureScreenshots()
