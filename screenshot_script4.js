const { chromium } = require('./screenshot/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/home/neon/.local/bin/google-chrome', headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  await page.goto('https://manhwaclub.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Use the search form
  const searchInput = await page.$('input[name="s"]');
  if (searchInput) {
    await searchInput.fill('pervert');
    await searchInput.press('Enter');
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'screenshot/manhwaclub_agent3_search.png', fullPage: true });
    console.log('Search saved');
  }
  
  await browser.close();
})();
