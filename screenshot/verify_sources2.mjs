import { chromium } from 'playwright';
import fs from 'fs';

const OUTDIR = '/home/neon/programs/side_project/mangablaze/screenshot';

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function gotoWithRetry(page, url, opts, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, opts);
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`    retry ${i + 1} for ${url}`);
      await delay(2000);
    }
  }
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--ignore-certificate-errors',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  // Test bunmanga with "hunger" search and detail page
  {
    console.log('\n========== bunmanga (fixed search) ==========');
    const page = await context.newPage();

    // Search with "hunger"
    try {
      await gotoWithRetry(page, 'https://bunmanga.com/?s=hunger&post_type=wp-manga', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(3000);
      await page.screenshot({ path: `${OUTDIR}/bunmanga_search.png`, fullPage: true });
      const html = await page.content();
      fs.writeFileSync(`${OUTDIR}/bunmanga_search.html`, html);
      const count = await page.locator('.c-tabs-item .c-tabs-item__content').count();
      console.log(`  search hunger: results=${count}`);

      if (count > 0) {
        const href = await page.locator('.tab-thumb a').first().getAttribute('href');
        console.log(`  first result href: ${href}`);
        const detailUrl = href.startsWith('http') ? href : `https://bunmanga.com${href}`;
        await gotoWithRetry(page, detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000);
        await page.screenshot({ path: `${OUTDIR}/bunmanga_detail.png`, fullPage: true });
        fs.writeFileSync(`${OUTDIR}/bunmanga_detail.html`, await page.content());

        const titleFound = await page.locator('.post-title h1').count() > 0;
        const chapters = await page.locator('li.wp-manga-chapter').count();
        console.log(`  detail: titleFound=${titleFound}, chapters=${chapters}`);

        if (chapters > 0) {
          const chHref = await page.locator('li.wp-manga-chapter a').first().getAttribute('href');
          const chUrl = chHref.startsWith('http') ? chHref : `https://bunmanga.com${chHref}`;
          await gotoWithRetry(page, chUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await delay(4000);
          await page.screenshot({ path: `${OUTDIR}/bunmanga_chapter.png`, fullPage: true });
          fs.writeFileSync(`${OUTDIR}/bunmanga_chapter.html`, await page.content());
          const pages = await page.locator('.wp-manga-chapter-img').count();
          console.log(`  chapter: pages=${pages}`);
        }
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
    await page.close();
  }

  // Test mangagofun with "dragon" search and detail page
  {
    console.log('\n========== mangagofun (fixed search) ==========');
    const page = await context.newPage();

    try {
      await gotoWithRetry(page, 'https://www.mangago.fun/?s=dragon&post_type=wp-manga', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(3000);
      await page.screenshot({ path: `${OUTDIR}/mangagofun_search.png`, fullPage: true });
      const html = await page.content();
      fs.writeFileSync(`${OUTDIR}/mangagofun_search.html`, html);
      const count = await page.locator('.c-tabs-item').count();
      console.log(`  search dragon: results=${count}`);

      if (count > 0) {
        const href = await page.locator('.post-title h3 a').first().getAttribute('href');
        console.log(`  first result href: ${href}`);
        const detailUrl = href.startsWith('http') ? href : `https://www.mangago.fun${href}`;
        await gotoWithRetry(page, detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000);
        await page.screenshot({ path: `${OUTDIR}/mangagofun_detail.png`, fullPage: true });
        fs.writeFileSync(`${OUTDIR}/mangagofun_detail.html`, await page.content());

        const titleFound = await page.locator('.post-title h1, .post-title h3').count() > 0;
        const chapters = await page.locator('li.wp-manga-chapter').count();
        console.log(`  detail: titleFound=${titleFound}, chapters=${chapters}`);

        if (chapters > 0) {
          const chHref = await page.locator('li.wp-manga-chapter a').first().getAttribute('href');
          const chUrl = chHref.startsWith('http') ? chHref : `https://www.mangago.fun${chHref}`;
          await gotoWithRetry(page, chUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await delay(4000);
          await page.screenshot({ path: `${OUTDIR}/mangagofun_chapter.png`, fullPage: true });
          fs.writeFileSync(`${OUTDIR}/mangagofun_chapter.html`, await page.content());
          const pages = await page.locator('.wp-manga-chapter-img').count();
          console.log(`  chapter: pages=${pages}`);
        }
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('\nDone.');
}

run().catch(console.error);
