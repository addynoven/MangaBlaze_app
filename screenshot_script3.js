const { chromium } = require('./screenshot/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/home/neon/.local/bin/google-chrome', headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const pages = [
    { url: 'https://manhwaclub.net', path: 'screenshot/manhwaclub_agent3_homepage.png' },
    { url: 'https://manhwaclub.net/manga/', path: 'screenshot/manhwaclub_agent3_mangalist.png' },
    { url: 'https://manhwaclub.net/manga/a-pervert-who-only-picks-out-perverts/', path: 'screenshot/manhwaclub_agent3_detail.png' },
    { url: 'https://manhwaclub.net/manga/a-pervert-who-only-picks-out-perverts/chapter-7-raw/', path: 'screenshot/manhwaclub_agent3_chapter.png' },
  ];
  
  for (const p of pages) {
    try {
      const page = await context.newPage();
      await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: p.path, fullPage: true });
      console.log('Saved', p.path);
      await page.close();
    } catch (e) {
      console.error('Failed', p.path, e.message);
    }
  }
  
  await browser.close();
})();
