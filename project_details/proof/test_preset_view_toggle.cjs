const { chromium } = require('playwright');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Studio...');
  await page.goto('http://localhost:5173/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Verify 2-position toggle exists
  const toggle = page.locator('[aria-label="Effect display view"]');
  await toggle.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Found 2-position toggle button group');

  // Verify Cards button is active by default
  const cardsBtn = toggle.locator('button:has-text("Cards")');
  const listBtn = toggle.locator('button:has-text("Dropdown / List")');

  const isCardsActive = await cardsBtn.getAttribute('aria-pressed');
  console.log('Cards button initial aria-pressed:', isCardsActive);

  // Take screenshot of Cards view
  await page.screenshot({ path: path.join(__dirname, 'preset_cards_view.png') });
  console.log('Captured preset_cards_view.png');

  // 2. Click Dropdown / List toggle button
  console.log('Clicking Dropdown / List toggle...');
  await listBtn.click();
  await page.waitForTimeout(500);

  const isListActive = await listBtn.getAttribute('aria-pressed');
  console.log('List button aria-pressed after click:', isListActive);

  // Verify dropdown bar exists
  const dropdown = page.locator('#effect-dropdown-select');
  await dropdown.waitFor({ state: 'visible', timeout: 3000 });
  console.log('Found quick select dropdown');

  // Verify compact effect list exists
  const effectList = page.locator('[aria-label="Effect list"]');
  await effectList.waitFor({ state: 'visible', timeout: 3000 });
  const rowCount = await effectList.locator('[role="option"]').count();
  console.log(`Found compact effect list with ${rowCount} items`);

  // Take screenshot of Dropdown / List view
  await page.screenshot({ path: path.join(__dirname, 'preset_list_view.png') });
  console.log('Captured preset_list_view.png');

  // 3. Test selecting an effect via dropdown (e.g. #09 Rainbow)
  console.log('Selecting effect #09 via dropdown...');
  await dropdown.selectOption('9');
  await page.waitForTimeout(500);

  // Verify that row #09 is selected and marked "Previewing"
  const row9 = effectList.locator('[role="option"]').filter({ hasText: '#09' });
  const row9Text = await row9.innerText();
  console.log('Row 09 content after dropdown select:', row9Text);
  if (!row9Text.includes('Previewing')) {
    throw new Error('Row 09 should show Previewing tag');
  }

  // 4. Test selecting an effect by clicking a row in the list (e.g. #01 Blink)
  console.log('Clicking row for effect #01 Blink...');
  const row1 = effectList.locator('[role="option"]').filter({ hasText: '#01' });
  await row1.click();
  await page.waitForTimeout(500);

  // Verify that dropdown updated to 1
  const selectedDropdownVal = await dropdown.inputValue();
  console.log('Dropdown value after clicking row 1:', selectedDropdownVal);
  if (selectedDropdownVal !== '1') {
    throw new Error(`Expected dropdown value 1, got ${selectedDropdownVal}`);
  }

  // Take screenshot of list view with Blink previewing
  await page.screenshot({ path: path.join(__dirname, 'preset_list_selection_proof.png') });
  console.log('Captured preset_list_selection_proof.png');

  // 5. Switch back to Cards view
  console.log('Switching back to Cards view...');
  await cardsBtn.click();
  await page.waitForTimeout(500);

  const grid = page.locator('div[class*="effectGrid"]');
  await grid.waitFor({ state: 'visible', timeout: 3000 });
  console.log('Successfully toggled back to Cards view');

  await page.screenshot({ path: path.join(__dirname, 'preset_swapped_back_cards.png') });
  console.log('Captured preset_swapped_back_cards.png');

  await browser.close();
  console.log('All tests passed successfully!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
