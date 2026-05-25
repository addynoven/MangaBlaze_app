const { chromium } = require('./screenshot/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/home/neon/.local/bin/google-chrome', headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  // Search results - inspect structure
  const page = await context.newPage();
  await page.goto('https://manhwaclub.net/?s=solo+leveling', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Get all links
  const links = await page.$$eval('a', els => els.slice(0, 20).map(el => ({ href: el.href, text: el.innerText.trim().slice(0, 50) })));
  console.log('Links:', JSON.stringify(links, null, 2));
  
  // Get article/class structures
  const articles = await page.$$eval('article, .bsx, .page-item-detail, .manga-item, [class*="item"]', els => els.slice(0, 10).map(el => ({ tag: el.tagName, class: el.className, html: el.outerHTML.slice(0, 300) })));
  console.log('Articles:', JSON.stringify(articles, null, 2));
  
  await browser.close();
})();
