const { chromium } = require('./screenshot/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/home/neon/.local/bin/google-chrome', headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  // Homepage
  const page1 = await context.newPage();
  await page1.goto('https://manhwaclub.net', { waitUntil: 'networkidle', timeout: 30000 });
  await page1.screenshot({ path: 'screenshot/manhwaclub_agent3_homepage.png', fullPage: true });
  console.log('Homepage saved');
  await page1.close();
  
  // Search results
  const page2 = await context.newPage();
  await page2.goto('https://manhwaclub.net/?s=solo+leveling', { waitUntil: 'networkidle', timeout: 30000 });
  await page2.screenshot({ path: 'screenshot/manhwaclub_agent3_search.png', fullPage: true });
  console.log('Search saved');
  await page2.close();
  
  // Manga detail - need to find a URL from search first
  const page3 = await context.newPage();
  await page3.goto('https://manhwaclub.net/?s=solo+leveling', { waitUntil: 'networkidle', timeout: 30000 });
  const detailLink = await page3.$eval('.bsx a, .bs a, .tt a, .page-item-detail a, .item-summary a, .c-image-hover a, article a', el => el.href).catch(() => null);
  console.log('Detail link:', detailLink);
  
  let chapterLink = null;
  if (detailLink) {
    await page3.goto(detailLink, { waitUntil: 'networkidle', timeout: 30000 });
    await page3.screenshot({ path: 'screenshot/manhwaclub_agent3_detail.png', fullPage: true });
    console.log('Detail saved');
    
    // Find chapter link
    chapterLink = await page3.$eval('.epcurlist a, .chap-link a, .wp-manga-chapter a, .chapter-item a, li a[href*="chapter"]', el => el.href).catch(() => null);
    console.log('Chapter link:', chapterLink);
  }
  await page3.close();
  
  if (chapterLink) {
    const page4 = await context.newPage();
    await page4.goto(chapterLink, { waitUntil: 'networkidle', timeout: 30000 });
    await page4.screenshot({ path: 'screenshot/manhwaclub_agent3_chapter.png', fullPage: true });
    console.log('Chapter saved');
    await page4.close();
  }
  
  await browser.close();
})();
