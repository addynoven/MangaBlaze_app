import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const outDir = '/home/neon/programs/side_project/mangablaze/screenshot';

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  });
  if (!res.ok) throw new Error(`fetch error: ${res.status} ${url}`);
  return await res.text();
}

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

  // Test manhuaplus chapter page
  console.log('--- ManhuaPlus chapter ---');
  try {
    const mpHtml = await fetchHTML('https://manhuaplus.com/manga/rebirth-of-the-urban-immortal-cultivator/chapter-1038/');
    writeFileSync(`${outDir}/manhuaplus_chapter_fetched.html`, mpHtml);
    const hasAsyncImg = mpHtml.includes('decoding="async"') && mpHtml.includes('cdn.manhuaplus.com');
    console.log('manhuaplus chapter fetch: has async img with cdn.manhuaplus.com =', hasAsyncImg);
  } catch (e) { console.log('manhuaplus chapter fetch error:', e.message); }

  // Test manhwaget chapter page
  console.log('--- ManhwaGet chapter ---');
  try {
    const mgHtml = await fetchHTML('https://manhwaget.com/manga/revenge-of-the-iron-blooded-sword-hound/chapter-159/');
    writeFileSync(`${outDir}/manhwaget_chapter_fetched.html`, mgHtml);
    const hasWpImg = mgHtml.includes('wp-manga-chapter-img');
    console.log('manhwaget chapter fetch: has wp-manga-chapter-img =', hasWpImg);
  } catch (e) { console.log('manhwaget chapter fetch error:', e.message); }

  // Test readberserk chapter page (server-side fetch)
  console.log('--- ReadBerserk chapter fetch ---');
  try {
    const rbHtml = await fetchHTML('https://readberserk.com/chapter/berserk-chapter-383/');
    writeFileSync(`${outDir}/readberserk_chapter_fetched.html`, rbHtml);
    const hasPagesImg = rbHtml.includes('pages__img');
    const hasDataSrc = rbHtml.includes('data-src');
    console.log('readberserk chapter fetch: has pages__img =', hasPagesImg, ', has data-src =', hasDataSrc);
  } catch (e) { console.log('readberserk chapter fetch error:', e.message); }

  // Test readmha chapter page
  console.log('--- ReadMHA chapter ---');
  try {
    const rmHtml = await fetchHTML('https://ww10.readmha.com/chapter/boku-no-hero-academia-colored-chapter-430/');
    writeFileSync(`${outDir}/readmha_chapter_fetched.html`, rmHtml);
    const hasJsPage = rmHtml.includes('js-page');
    console.log('readmha chapter fetch: has js-page =', hasJsPage);
  } catch (e) { console.log('readmha chapter fetch error:', e.message); }

  // Also test readberserk with JS rendering for comparison
  const rbPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await gotoWithRetry(rbPage, 'https://readberserk.com/chapter/berserk-chapter-383/');
  await rbPage.waitForTimeout(5000);
  const rbRendered = await rbPage.content();
  writeFileSync(`${outDir}/readberserk_chapter_rendered.html`, rbRendered);
  const rbPagesImgRendered = (rbRendered.match(/pages__img/g) || []).length;
  console.log('readberserk chapter rendered: pages__img count =', rbPagesImgRendered);
  await rbPage.close();

  await browser.close();
})();
