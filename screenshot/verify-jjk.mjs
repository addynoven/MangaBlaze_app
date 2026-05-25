import { chromium } from 'playwright';

const SCREENSHOT_DIR = '/home/neon/programs/side_project/mangablaze/screenshot';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const baseUrl = 'https://ww5.readjujutsukaisen.com';

  // Detail page
  console.log('-> Detail: /manga/jujutsu-kaisen/');
  await page.goto(baseUrl + '/manga/jujutsu-kaisen/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/readjujutsukaisen_detail.png`, fullPage: true });

  // Get first chapter link
  const chapterLinks = await page.locator('a[href*="/chapter/"]').all();
  let firstChapterHref = '';
  for (const link of chapterLinks) {
    const href = await link.getAttribute('href');
    if (href) {
      firstChapterHref = href;
      break;
    }
  }
  console.log('First chapter href:', firstChapterHref);

  // Chapter page
  if (firstChapterHref) {
    const chapterUrl = firstChapterHref.startsWith('http') ? firstChapterHref : baseUrl + firstChapterHref;
    console.log('-> Chapter:', chapterUrl);
    await page.goto(chapterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/readjujutsukaisen_chapter.png`, fullPage: true });
  }

  // Search screenshot (just homepage since that's how the scraper works)
  console.log('-> Search (homepage)');
  await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/readjujutsukaisen_search.png`, fullPage: true });

  await browser.close();
}

run().catch(console.error);
