import { chromium } from 'playwright';
import fs from 'fs';

const outDir = '/home/neon/programs/side_project/mangablaze/screenshot';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 900 },
});

async function dumpHTML(page, filename) {
  const html = await page.content();
  fs.writeFileSync(`${outDir}/${filename}.html`, html);
}

// --- 1. honkaiimpact3 ---
try {
  const page = await context.newPage();
  await page.goto('https://manga.honkaiimpact3.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${outDir}/honkaiimpact3_home.png`, fullPage: true });
  await dumpHTML(page, 'honkaiimpact3_home');

  // Search / book list
  await page.goto('https://manga.honkaiimpact3.com/book/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${outDir}/honkaiimpact3_booklist.png`, fullPage: true });
  await dumpHTML(page, 'honkaiimpact3_booklist');

  // Try first book detail
  const firstBook = await page.locator('a[href*="/book/"]').first();
  if (await firstBook.count() > 0) {
    await firstBook.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${outDir}/honkaiimpact3_detail.png`, fullPage: true });
    await dumpHTML(page, 'honkaiimpact3_detail');
  }
  await page.close();
  console.log('honkaiimpact3: done');
} catch (e) {
  console.log('honkaiimpact3 error:', e.message);
}

// --- 2. vgperson ---
try {
  const page = await context.newPage();
  await page.goto('https://vgperson.com/other/mangaviewer.php', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${outDir}/vgperson_home.png`, fullPage: true });
  await dumpHTML(page, 'vgperson_home');

  // Click first manga link (?m=)
  const firstManga = await page.locator('a[href^="?m="]').first();
  if (await firstManga.count() > 0) {
    await firstManga.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${outDir}/vgperson_detail.png`, fullPage: true });
    await dumpHTML(page, 'vgperson_detail');
  }
  await page.close();
  console.log('vgperson: done');
} catch (e) {
  console.log('vgperson error:', e.message);
}

// --- 3. onepunchmanonline ---
try {
  const page = await context.newPage();
  await page.goto('https://w11.1punchman.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${outDir}/onepunchmanonline_home.png`, fullPage: true });
  await dumpHTML(page, 'onepunchmanonline_home');

  // Search naruto (site only has One Punch Man, but let's see search page if any)
  // Try the API
  await page.goto('https://w11.1punchman.com/wp-json/wp/v2/comic?per_page=10&page=1', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${outDir}/onepunchmanonline_api.png`, fullPage: true });
  await dumpHTML(page, 'onepunchmanonline_api');
  await page.close();
  console.log('onepunchmanonline: done');
} catch (e) {
  console.log('onepunchmanonline error:', e.message);
}

// --- 4. frierenonline ---
try {
  const page = await context.newPage();
  await page.goto('https://www.frieren.online', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${outDir}/frierenonline_home.png`, fullPage: true });
  await dumpHTML(page, 'frierenonline_home');

  // Try clicking a chapter link
  const chapterLink = await page.locator('a[href*="/manga/sousou-no-frieren-chapter-"]').first();
  if (await chapterLink.count() > 0) {
    await chapterLink.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${outDir}/frierenonline_chapter.png`, fullPage: true });
    await dumpHTML(page, 'frierenonline_chapter');
  }
  await page.close();
  console.log('frierenonline: done');
} catch (e) {
  console.log('frierenonline error:', e.message);
}

await browser.close();
console.log('All screenshots saved to', outDir);
