import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const outDir = '/home/neon/programs/side_project/mangablaze/screenshot';

async function gotoWithRetry(page, url) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      return;
    } catch (e) {
      if (i === 2) throw e;
      await page.waitForTimeout(2000);
    }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // --- ManhuaPlus: try a query that should return results ---
  const mp = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await gotoWithRetry(mp, 'https://manhuaplus.com/?s=immortal&post_type=wp-manga');
  await mp.screenshot({ path: `${outDir}/manhuaplus_search2.png`, fullPage: false });
  const mpSearchHtml = await mp.content();
  writeFileSync(`${outDir}/manhuaplus_search2.html`, mpSearchHtml);

  // Check what selectors exist
  const mpHasResults = await mp.locator('.search-no-results').count();
  const mpHasTabs = await mp.locator('.tab-content-wrap .c-tabs-item').count();
  const mpHasItems = await mp.locator('.item__wrap').count();
  const mpHasBlog = await mp.locator('.c-blog__content .c-blog_item').count();
  console.log('manhuaplus search immortal: search-no-results=' + mpHasResults + ', tabs=' + mpHasTabs + ', item__wrap=' + mpHasItems + ', blog_items=' + mpHasBlog);

  // Try detail page
  await gotoWithRetry(mp, 'https://manhuaplus.com/manga/rebirth-of-the-urban-immortal-cultivator/');
  await mp.screenshot({ path: `${outDir}/manhuaplus_detail.png`, fullPage: false });
  const mpDetailHtml = await mp.content();
  writeFileSync(`${outDir}/manhuaplus_detail.html`, mpDetailHtml);

  const mpChapters = await mp.locator('.listing-chapters_wrap ul.main.version-chap li.wp-manga-chapter a[href*="/manga/"]').count();
  const mpAltChapters = await mp.locator('.wp-manga-chapter a[href*="/manga/"]').count();
  const mpOgTitle = await mp.locator('meta[property="og:title"]').count();
  console.log('manhuaplus detail: chapters=' + mpChapters + ', alt_chapters=' + mpAltChapters + ', og:title=' + mpOgTitle);
  await mp.close();

  // --- ReadBerserk: check chapter page after full JS load ---
  const rb = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await gotoWithRetry(rb, 'https://readberserk.com/chapter/berserk-chapter-383/');
  await rb.waitForTimeout(5000);
  await rb.screenshot({ path: `${outDir}/readberserk_chapter.png`, fullPage: false });
  const rbChapterHtml = await rb.content();
  writeFileSync(`${outDir}/readberserk_chapter.html`, rbChapterHtml);

  const rbPagesImg = await rb.locator('img.pages__img').count();
  const rbAllImgs = await rb.locator('.pages img').count();
  const rbImgur = await rb.locator('img[src*="imgur"]').count();
  const rbReadImg = await rb.locator('img.readimg').count();
  console.log('readberserk chapter: pages__img=' + rbPagesImg + ', .pages img=' + rbAllImgs + ', imgur=' + rbImgur + ', readimg=' + rbReadImg);
  await rb.close();

  await browser.close();
})();
