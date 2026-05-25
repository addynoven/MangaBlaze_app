import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const outDir = '/home/neon/programs/side_project/mangablaze/screenshot';

async function gotoWithRetry(page, url, opts = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000, ...opts });
      await page.waitForTimeout(3000);
      return;
    } catch (e) {
      if (i === 2) throw e;
      await page.waitForTimeout(2000);
    }
  }
}

async function testManhuaPlus(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const report = { source: 'manhuaplus', pages: [], issues: [] };
  try {
    await gotoWithRetry(page, 'https://manhuaplus.com');
    await page.screenshot({ path: `${outDir}/manhuaplus_homepage.png`, fullPage: false });
    report.pages.push('manhuaplus_homepage.png');
    const homeHtml = await page.content();
    writeFileSync(`${outDir}/manhuaplus_homepage.html`, homeHtml);

    const hasTabsItem = await page.locator('.tab-content-wrap .c-tabs-item').count();
    const hasThumb = await page.locator('.tab-thumb a[href*="/manga/"]').count();
    report.issues.push(`Homepage .tab-content-wrap .c-tabs-item count: ${hasTabsItem}`);
    report.issues.push(`Homepage .tab-thumb a[href*="/manga/"] count: ${hasThumb}`);

    await gotoWithRetry(page, 'https://manhuaplus.com/?s=naruto&post_type=wp-manga');
    await page.screenshot({ path: `${outDir}/manhuaplus_search.png`, fullPage: false });
    report.pages.push('manhuaplus_search.png');
    const searchHtml = await page.content();
    writeFileSync(`${outDir}/manhuaplus_search.html`, searchHtml);

    const searchTabsItem = await page.locator('.tab-content-wrap .c-tabs-item').count();
    const searchThumb = await page.locator('.tab-thumb a[href*="/manga/"]').count();
    report.issues.push(`Search .tab-content-wrap .c-tabs-item count: ${searchTabsItem}`);
    report.issues.push(`Search .tab-thumb a[href*="/manga/"] count: ${searchThumb}`);

    const firstLink = page.locator('.tab-thumb a[href*="/manga/"]').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${outDir}/manhuaplus_detail.png`, fullPage: false });
      report.pages.push('manhuaplus_detail.png');
      const detailHtml = await page.content();
      writeFileSync(`${outDir}/manhuaplus_detail.html`, detailHtml);

      const hasChapters = await page.locator('.listing-chapters_wrap ul.main.version-chap li.wp-manga-chapter a[href*="/manga/"]').count();
      const hasOgTitle = await page.locator('meta[property="og:title"]').count();
      const hasSummaryImg = await page.locator('.summary_image img').count();
      report.issues.push(`Detail .listing-chapters_wrap chapters count: ${hasChapters}`);
      report.issues.push(`Detail meta[property="og:title"] count: ${hasOgTitle}`);
      report.issues.push(`Detail .summary_image img count: ${hasSummaryImg}`);
    } else {
      report.issues.push('No search result to click for detail page');
    }
  } catch (e) {
    report.issues.push(`ERROR: ${e.message}`);
  }
  await page.close();
  return report;
}

async function testManhwaGet(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const report = { source: 'manhwaget', pages: [], issues: [] };
  try {
    await gotoWithRetry(page, 'https://manhwaget.com');
    await page.screenshot({ path: `${outDir}/manhwaget_homepage.png`, fullPage: false });
    report.pages.push('manhwaget_homepage.png');

    // Try search with a manhwa title
    await gotoWithRetry(page, 'https://manhwaget.com/?s=revenge&post_type=wp-manga');
    await page.screenshot({ path: `${outDir}/manhwaget_search.png`, fullPage: false });
    report.pages.push('manhwaget_search.png');
    const searchHtml = await page.content();
    writeFileSync(`${outDir}/manhwaget_search.html`, searchHtml);

    const searchTabsItem = await page.locator('.c-tabs-item__content').count();
    report.issues.push(`Search .c-tabs-item__content count: ${searchTabsItem}`);

    const firstLink = page.locator('.c-tabs-item__content .post-title h3 a').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${outDir}/manhwaget_detail.png`, fullPage: false });
      report.pages.push('manhwaget_detail.png');
      const detailHtml = await page.content();
      writeFileSync(`${outDir}/manhwaget_detail.html`, detailHtml);

      const hasPostTitle = await page.locator('.post-title h1').count();
      const hasSummaryImg = await page.locator('.summary_image img').count();
      const hasDescription = await page.locator('.description-summary').count();
      const hasChapters = await page.locator('ul.main.version-chap li.wp-manga-chapter a').count();
      report.issues.push(`Detail .post-title h1 count: ${hasPostTitle}`);
      report.issues.push(`Detail .summary_image img count: ${hasSummaryImg}`);
      report.issues.push(`Detail .description-summary count: ${hasDescription}`);
      report.issues.push(`Detail ul.main.version-chap li.wp-manga-chapter a count: ${hasChapters}`);
    } else {
      report.issues.push('No search result to click for detail page');
    }
  } catch (e) {
    report.issues.push(`ERROR: ${e.message}`);
  }
  await page.close();
  return report;
}

async function testReadBerserk(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const report = { source: 'readberserk', pages: [], issues: [] };
  try {
    await gotoWithRetry(page, 'https://readberserk.com');
    await page.screenshot({ path: `${outDir}/readberserk_homepage.png`, fullPage: false });
    report.pages.push('readberserk_homepage.png');
    const homeHtml = await page.content();
    writeFileSync(`${outDir}/readberserk_homepage.html`, homeHtml);

    const hasMangaLinks = await page.locator('a[href^="https://readberserk.com/manga/"]').count();
    report.issues.push(`Homepage a[href^="https://readberserk.com/manga/"] count: ${hasMangaLinks}`);

    await gotoWithRetry(page, 'https://readberserk.com/manga/berserk/');
    await page.screenshot({ path: `${outDir}/readberserk_detail.png`, fullPage: false });
    report.pages.push('readberserk_detail.png');
    const detailHtml = await page.content();
    writeFileSync(`${outDir}/readberserk_detail.html`, detailHtml);

    const hasH2 = await page.locator('h2.mb-0 span').count();
    const hasCardImg = await page.locator('.card-img-right').count();
    const hasCardText = await page.locator('.card-text p').count();
    const hasChapterLinks = await page.locator('a[href*="/chapter/"]').count();
    report.issues.push(`Detail h2.mb-0 span count: ${hasH2}`);
    report.issues.push(`Detail .card-img-right count: ${hasCardImg}`);
    report.issues.push(`Detail .card-text p count: ${hasCardText}`);
    report.issues.push(`Detail a[href*="/chapter/"] count: ${hasChapterLinks}`);

    const firstChapter = page.locator('a[href*="/chapter/"]').first();
    if (await firstChapter.count() > 0) {
      await firstChapter.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${outDir}/readberserk_chapter.png`, fullPage: false });
      report.pages.push('readberserk_chapter.png');
      const chapterHtml = await page.content();
      writeFileSync(`${outDir}/readberserk_chapter.html`, chapterHtml);

      const hasPagesImg = await page.locator('img.pages__img').count();
      report.issues.push(`Chapter img.pages__img count: ${hasPagesImg}`);
    }
  } catch (e) {
    report.issues.push(`ERROR: ${e.message}`);
  }
  await page.close();
  return report;
}

async function testReadMHA(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const report = { source: 'readmha', pages: [], issues: [] };
  try {
    await gotoWithRetry(page, 'https://ww10.readmha.com');
    await page.screenshot({ path: `${outDir}/readmha_homepage.png`, fullPage: false });
    report.pages.push('readmha_homepage.png');
    const homeHtml = await page.content();
    writeFileSync(`${outDir}/readmha_homepage.html`, homeHtml);

    const hasMangaLinks = await page.locator('a[href^="/manga/"]').count();
    report.issues.push(`Homepage a[href^="/manga/"] count: ${hasMangaLinks}`);

    // Use correct slug from homepage
    await gotoWithRetry(page, 'https://ww10.readmha.com/manga/boku-no-hero-academia-colored/');
    await page.screenshot({ path: `${outDir}/readmha_detail.png`, fullPage: false });
    report.pages.push('readmha_detail.png');
    const detailHtml = await page.content();
    writeFileSync(`${outDir}/readmha_detail.html`, detailHtml);

    const hasTitle = await page.locator('title').count();
    const hasOgImage = await page.locator('meta[property="og:image"]').count();
    const hasImgur = await page.locator('img[src*="i.imgur.com"]').count();
    const hasChapterLinks = await page.locator('a[href*="/chapter/"]').count();
    report.issues.push(`Detail <title> count: ${hasTitle}`);
    report.issues.push(`Detail meta[property="og:image"] count: ${hasOgImage}`);
    report.issues.push(`Detail img[src*="i.imgur.com"] count: ${hasImgur}`);
    report.issues.push(`Detail a[href*="/chapter/"] count: ${hasChapterLinks}`);

    const firstChapter = page.locator('a[href*="/chapter/"]').first();
    if (await firstChapter.count() > 0) {
      await firstChapter.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${outDir}/readmha_chapter.png`, fullPage: false });
      report.pages.push('readmha_chapter.png');
      const chapterHtml = await page.content();
      writeFileSync(`${outDir}/readmha_chapter.html`, chapterHtml);

      const hasJsPage = await page.locator('img.js-page').count();
      report.issues.push(`Chapter img.js-page count: ${hasJsPage}`);
    } else {
      report.issues.push('No chapter links found on detail page');
    }
  } catch (e) {
    report.issues.push(`ERROR: ${e.message}`);
  }
  await page.close();
  return report;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const r1 = await testManhuaPlus(browser);
  const r2 = await testManhwaGet(browser);
  const r3 = await testReadBerserk(browser);
  const r4 = await testReadMHA(browser);
  await browser.close();
  const results = [r1, r2, r3, r4];
  writeFileSync(`${outDir}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
