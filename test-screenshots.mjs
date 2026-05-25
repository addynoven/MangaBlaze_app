import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/home/neon/programs/side_project/mangablaze/screenshot';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 800 },
});

async function savePageInfo(page, name, url) {
  const html = await page.content();
  fs.writeFileSync(path.join(SCREENSHOT_DIR, `${name}.html`), html);
  console.log(`[${name}] Saved HTML (${html.length} chars)`);
}

async function testMangasushi() {
  console.log('\n=== MANGASUSHI ===');
  const page = await context.newPage();
  try {
    // Homepage
    await page.goto('https://mangasushi.org', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mangasushi_homepage.png'), fullPage: true });
    await savePageInfo(page, 'mangasushi_homepage', 'https://mangasushi.org');
    console.log('Homepage OK');

    // Search
    await page.goto('https://mangasushi.org/?s=naruto&post_type=wp-manga', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mangasushi_search.png'), fullPage: true });
    await savePageInfo(page, 'mangasushi_search', 'https://mangasushi.org/?s=naruto&post_type=wp-manga');
    console.log('Search OK');

    // Click first result
    const firstLink = await page.locator('.c-tabs-item .post-title h3 a').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mangasushi_detail.png'), fullPage: true });
      await savePageInfo(page, 'mangasushi_detail', page.url());
      console.log('Detail OK');
    } else {
      console.log('No search results found');
    }
  } catch (e) {
    console.error('Mangasushi error:', e.message);
  } finally {
    await page.close();
  }
}

async function testMangatellers() {
  console.log('\n=== MANGATELLERS ===');
  const page = await context.newPage();
  try {
    // Homepage
    await page.goto('https://reader.mangatellers.gr', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mangatellers_homepage.png'), fullPage: true });
    await savePageInfo(page, 'mangatellers_homepage', 'https://reader.mangatellers.gr');
    console.log('Homepage OK');

    // Search via POST
    await page.goto('https://reader.mangatellers.gr/search/', { waitUntil: 'networkidle', timeout: 30000 });
    const searchInput = await page.locator('input[name="search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('naruto');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.locator('form').filter({ has: searchInput }).locator('button, input[type="submit"]').first().click().catch(() => searchInput.press('Enter'))
      ]);
    } else {
      // Try POST directly
      await page.evaluate(() => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/search/';
        const input = document.createElement('input');
        input.name = 'search';
        input.value = 'naruto';
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
      });
      await page.waitForLoadState('networkidle');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mangatellers_search.png'), fullPage: true });
    await savePageInfo(page, 'mangatellers_search', page.url());
    console.log('Search OK');

    // Click first result
    const firstLink = await page.locator('.list .group .title a[href*="/series/"]').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mangatellers_detail.png'), fullPage: true });
      await savePageInfo(page, 'mangatellers_detail', page.url());
      console.log('Detail OK');
    } else {
      console.log('No search results found');
    }
  } catch (e) {
    console.error('Mangatellers error:', e.message);
  } finally {
    await page.close();
  }
}

async function testMangatrend() {
  console.log('\n=== MANGATREND ===');
  const page = await context.newPage();
  try {
    // Homepage
    await page.goto('https://mangatrend.org', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mangatrend_homepage.png'), fullPage: true });
    await savePageInfo(page, 'mangatrend_homepage', 'https://mangatrend.org');
    console.log('Homepage OK');

    // Search
    await page.goto('https://mangatrend.org/?s=naruto', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mangatrend_search.png'), fullPage: true });
    await savePageInfo(page, 'mangatrend_search', 'https://mangatrend.org/?s=naruto');
    console.log('Search OK');

    // Click first result
    const firstLink = await page.locator('.listupd .bs .bsx a[href*="/manga/"]').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mangatrend_detail.png'), fullPage: true });
      await savePageInfo(page, 'mangatrend_detail', page.url());
      console.log('Detail OK');
    } else {
      console.log('No search results found');
    }
  } catch (e) {
    console.error('Mangatrend error:', e.message);
  } finally {
    await page.close();
  }
}

async function testManhuahot() {
  console.log('\n=== MANHUAHOT ===');
  const page = await context.newPage();
  try {
    // Homepage
    await page.goto('https://manhuahot.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'manhuahot_homepage.png'), fullPage: true });
    await savePageInfo(page, 'manhuahot_homepage', 'https://manhuahot.com');
    console.log('Homepage OK');

    // Search
    await page.goto('https://manhuahot.com/?s=naruto&post_type=wp-manga', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'manhuahot_search.png'), fullPage: true });
    await savePageInfo(page, 'manhuahot_search', 'https://manhuahot.com/?s=naruto&post_type=wp-manga');
    console.log('Search OK');

    // Click first result
    const firstLink = await page.locator('.tab-content-wrap .c-tabs-item .tab-thumb a[href*="/manga/"]').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'manhuahot_detail.png'), fullPage: true });
      await savePageInfo(page, 'manhuahot_detail', page.url());
      console.log('Detail OK');
    } else {
      console.log('No search results found');
    }
  } catch (e) {
    console.error('Manhuahot error:', e.message);
  } finally {
    await page.close();
  }
}

await testMangasushi();
await testMangatellers();
await testMangatrend();
await testManhuahot();

await browser.close();
console.log('\n=== ALL DONE ===');
