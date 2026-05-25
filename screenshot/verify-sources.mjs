import { chromium } from 'playwright';
import * as fs from 'fs';

const SCREENSHOT_DIR = '/home/neon/programs/side_project/mangablaze/screenshot';

const sources = [
  {
    id: 'readvagabond',
    name: 'Read Vagabond',
    baseUrl: 'https://readbagabondo.com',
    searchQuery: 'vagabond',
    detailPath: '/',
    chapterPath: '/volume-1/chapter-1',
  },
  {
    id: 'readblackclover',
    name: 'Read Black Clover',
    baseUrl: 'https://ww10.readblackclover.com',
    searchQuery: 'black clover',
    detailPath: '/manga/black-clover/',
    chapterPath: '/chapter/black-clover-chapter-1/',
  },
  {
    id: 'readfairytail',
    name: 'Read Fairy Tail',
    baseUrl: 'https://ww8.readfairytail.com',
    searchQuery: 'fairy tail',
    detailPath: '/manga/fairy-tail/',
    chapterPath: '/chapter/fairy-tail-chapter-1/',
  },
  {
    id: 'readjujutsukaisen',
    name: 'Read Jujutsu Kaisen',
    baseUrl: 'https://ww5.readjujutsukaisen.com',
    searchQuery: 'jujutsu kaisen',
    detailPath: '/manga/jujutsu-kaisen/',
    chapterPath: '/chapter/jujutsu-kaisen-chapter-1/',
  },
];

async function analyzePage(page, source) {
  const info = {
    url: page.url(),
    title: await page.title().catch(() => ''),
  };

  // For readmanga-base sources
  if (source.id !== 'readvagabond') {
    info.hasMangaLinks = await page.locator('a[href*="/manga/"]').count();
    info.hasChapterLinks = await page.locator('a[href*="/chapter/"]').count();
    info.hasH1My3FontBold = await page.locator('h1.my-3.font-bold').count();
    info.hasImgWidth300 = await page.locator('img[style*="width: 300px"]').count();
    info.hasMetaOgImage = await page.locator('meta[property="og:image"]').count();
    info.hasTextTextMuted = await page.locator('div.text-text-muted').count();
    info.hasJsPage = await page.locator('img.js-page').count();
  } else {
    // For readvagabond custom
    info.hasVolumeLinks = await page.locator('a[href^="/volume-"]').count();
    info.hasMainImg = await page.locator('main img').count();
    info.hasDescription = await page.locator('p.text-gray-500.dark\\:text-neutral-400').count();
  }

  // Get a sample of HTML structure for key areas
  info.sampleHTML = await page.content().then(html => html.slice(0, 5000));

  return info;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  const results = [];

  for (const source of sources) {
    console.log(`\n=== Testing ${source.id} ===`);
    const page = await context.newPage();
    const sourceResult = { id: source.id, pages: [] };

    try {
      // 1. Homepage
      console.log(`  -> Homepage: ${source.baseUrl}/`);
      await page.goto(source.baseUrl + '/', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      const homeShot = `${SCREENSHOT_DIR}/${source.id}_homepage.png`;
      await page.screenshot({ path: homeShot, fullPage: true });
      console.log(`     Screenshot saved: ${homeShot}`);
      const homeInfo = await analyzePage(page, source);
      sourceResult.pages.push({ name: 'homepage', screenshot: homeShot, info: homeInfo });

      // 2. Search / try to find manga
      console.log(`  -> Search for "${source.searchQuery}"`);
      let searchUrl = source.baseUrl + '/';
      if (source.id !== 'readvagabond') {
        // Try to use search input if available
        const searchInput = await page.locator('input[type="search"], input[placeholder*="Search"], input[name="s"]').first();
        if (await searchInput.isVisible().catch(() => false)) {
          await searchInput.fill(source.searchQuery);
          await searchInput.press('Enter');
          await page.waitForTimeout(3000);
        } else {
          // Just stay on homepage, the scraper searches there anyway
          await page.goto(source.baseUrl + '/', { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(2000);
        }
      }
      const searchShot = `${SCREENSHOT_DIR}/${source.id}_search.png`;
      await page.screenshot({ path: searchShot, fullPage: true });
      console.log(`     Screenshot saved: ${searchShot}`);
      const searchInfo = await analyzePage(page, source);
      sourceResult.pages.push({ name: 'search', screenshot: searchShot, info: searchInfo });

      // 3. Detail page
      console.log(`  -> Detail page: ${source.baseUrl}${source.detailPath}`);
      const detailResp = await page.goto(source.baseUrl + source.detailPath, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      const detailShot = `${SCREENSHOT_DIR}/${source.id}_detail.png`;
      await page.screenshot({ path: detailShot, fullPage: true });
      console.log(`     Screenshot saved: ${detailShot}`);
      const detailInfo = await analyzePage(page, source);
      sourceResult.pages.push({ name: 'detail', screenshot: detailShot, info: detailInfo });

      // 4. Chapter page
      console.log(`  -> Chapter page: ${source.baseUrl}${source.chapterPath}`);
      const chapterResp = await page.goto(source.baseUrl + source.chapterPath, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      const chapterShot = `${SCREENSHOT_DIR}/${source.id}_chapter.png`;
      await page.screenshot({ path: chapterShot, fullPage: true });
      console.log(`     Screenshot saved: ${chapterShot}`);
      const chapterInfo = await analyzePage(page, source);
      sourceResult.pages.push({ name: 'chapter', screenshot: chapterShot, info: chapterInfo });

    } catch (err) {
      console.log(`     ERROR: ${err.message}`);
      sourceResult.error = err.message;
      // Take error screenshot
      const errShot = `${SCREENSHOT_DIR}/${source.id}_error.png`;
      await page.screenshot({ path: errShot, fullPage: true }).catch(() => {});
    }

    results.push(sourceResult);
    await page.close();
  }

  await browser.close();

  // Save raw results as JSON
  fs.writeFileSync(`${SCREENSHOT_DIR}/batch5_results.json`, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${SCREENSHOT_DIR}/batch5_results.json`);
}

run().catch(console.error);
