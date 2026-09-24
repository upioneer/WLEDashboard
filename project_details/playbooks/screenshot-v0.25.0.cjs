const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const SCREENSHOT_DIR = path.join(__dirname, '../changelog/v0.25.0/screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isPortOpen(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function isWebOpen() {
  try {
    const res = await fetch(`http://127.0.0.1:5173`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  let apiProc = null;
  let webProc = null;

  if (!(await isPortOpen(3001))) {
    console.log('Starting API server...');
    apiProc = spawn('node', ['apps/api/src/server.js'], { cwd: path.join(__dirname, '../..'), stdio: 'ignore', shell: true });
  }

  if (!(await isWebOpen())) {
    console.log('Starting Web dev server...');
    webProc = spawn('npm', ['run', 'dev', '--workspace=apps/web'], { cwd: path.join(__dirname, '../..'), stdio: 'ignore', shell: true });
  }

  // Wait for servers to be responsive
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    if ((await isPortOpen(3001)) && (await isWebOpen())) {
      console.log('Both servers responsive');
      break;
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 950 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to Studio...');
  await page.goto('http://localhost:5173/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Preset Browser Dropdown / List View
  const listToggle = page.locator('button:has-text("Dropdown / List")');
  if (await listToggle.isVisible()) {
    await listToggle.click();
    await page.waitForTimeout(600);
    // Select effect 38 (Fire 2012)
    const select = page.locator('#effect-dropdown-select');
    if (await select.isVisible()) {
      await select.selectOption('38');
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio_preset_list_view.png') });
    console.log('Saved studio_preset_list_view.png');
  }

  // 2. 3D Objects Tab
  const objTab = page.locator('button:has-text("3D Objects")');
  if (await objTab.isVisible()) {
    await objTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio_3d_objects.png') });
    console.log('Saved studio_3d_objects.png');
  }

  // 3. 2D Matrix Canvas Tab
  const matTab = page.locator('button:has-text("2D Matrix Canvas")');
  if (await matTab.isVisible()) {
    await matTab.click();
    await page.waitForTimeout(1000);
    // Select Custom size if available
    const customBtn = page.locator('button:has-text("Custom")');
    if (await customBtn.isVisible()) {
      await customBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'studio_matrix_custom.png') });
    console.log('Saved studio_matrix_custom.png');
  }

  await browser.close();

  if (apiProc) {
    apiProc.kill();
    console.log('Killed API server');
  }
  if (webProc) {
    webProc.kill();
    console.log('Killed Web server');
  }

  console.log('All screenshots captured successfully.');
}

main().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
