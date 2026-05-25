import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://stonescape.xyz/series/our-guilds-idol', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/home/neon/programs/side_project/mangablaze/screenshot/stonescape_detail.png', fullPage: true });
  console.log('saved');
  await browser.close();
})();
