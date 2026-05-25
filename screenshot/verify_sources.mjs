import { chromium } from 'playwright';
import fs from 'fs';

const OUTDIR = '/home/neon/programs/side_project/mangablaze/screenshot';

const sources = [
  {
    id: 'bunmanga',
    baseUrl: 'https://bunmanga.com',
    searchUrl: 'https://bunmanga.com/?s=naruto&post_type=wp-manga',
    selectors: {
      searchResultItem: '.c-tabs-item .c-tabs-item__content',
      searchResultLink: '.tab-thumb a',
      detailTitle: '.post-title h1',
      detailCover: '.summary_image img',
      detailDesc: '.description-summary .summary__content',
      detailGenres: '.genres-content a',
      chapterItem: 'li.wp-manga-chapter',
      chapterLink: 'li.wp-manga-chapter a',
      pageImg: '.wp-manga-chapter-img',
    },
  },
  {
    id: 'likemanga',
    baseUrl: 'https://likemanga.ink',
    searchUrl: 'https://likemanga.ink/?act=search&f%5Bstatus%5D=all&f%5Bsortby%5D=lastest-chap&f%5Bkeyword%5D=naruto',
    selectors: {
      searchResultItem: 'img.jtip.card-img-top',
      searchResultLink: 'img.jtip.card-img-top',
      detailTitle: 'h1.title-detail',
      detailDesc: '#summary_shortened, #summary_content',
      detailGenres: 'a[href^="/genres/"]',
      chapterItem: 'li.wp-manga-chapter',
      chapterLink: 'li.wp-manga-chapter a',
      pageImg: 'img[data-index]',
    },
  },
  {
    id: 'mangack',
    baseUrl: 'https://mangack.com',
    searchUrl: 'https://mangack.com/search/naruto/',
    selectors: {
      searchResultItem: 'a.wrap-text[href^="https://mangack.com/manga/"]',
      searchResultLink: 'a.wrap-text[href^="https://mangack.com/manga/"]',
      detailTitle: 'h1.entry-title',
      detailCover: 'img.wp-post-image',
      detailDesc: '.entry-content',
      detailGenres: 'a[href^="https://mangack.com/genre/"]',
      chapterItem: 'ul.chapterslist a.title',
      chapterLink: 'ul.chapterslist a.title',
      pageImg: 'img.aligncenter',
    },
  },
  {
    id: 'mangagofun',
    baseUrl: 'https://www.mangago.fun',
    searchUrl: 'https://www.mangago.fun/?s=naruto&post_type=wp-manga',
    selectors: {
      searchResultItem: '.c-tabs-item',
      searchResultLink: '.post-title h3 a',
      detailTitle: '.post-title h1, .post-title h3',
      detailCover: '.summary_image img',
      detailDesc: '.description-summary p, .summary__content p',
      detailGenres: '.genres-content a, a[href*="/manga-genre/"]',
      chapterItem: 'li.wp-manga-chapter',
      chapterLink: 'li.wp-manga-chapter a',
      pageImg: null,
    },
  },
];

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

  const report = [];

  for (const src of sources) {
    console.log(`\n========== ${src.id} ==========`);
    const page = await context.newPage();
    const findings = { id: src.id, checks: [] };

    // 1. Homepage
    try {
      await gotoWithRetry(page, src.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(3000);
      await page.screenshot({ path: `${OUTDIR}/${src.id}_homepage.png`, fullPage: true });
      const homeHtml = await page.content();
      fs.writeFileSync(`${OUTDIR}/${src.id}_homepage.html`, homeHtml);
      findings.checks.push({ page: 'homepage', status: 'OK', url: src.baseUrl });
      console.log(`  homepage: OK`);
    } catch (e) {
      findings.checks.push({ page: 'homepage', status: 'ERROR', error: e.message });
      console.log(`  homepage: ERROR - ${e.message}`);
    }

    // 2. Search
    try {
      await gotoWithRetry(page, src.searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(3000);
      await page.screenshot({ path: `${OUTDIR}/${src.id}_search.png`, fullPage: true });
      const searchHtml = await page.content();
      fs.writeFileSync(`${OUTDIR}/${src.id}_search.html`, searchHtml);

      const searchCount = await page.locator(src.selectors.searchResultItem).count();
      findings.checks.push({ page: 'search', status: 'OK', url: src.searchUrl, resultCount: searchCount });
      console.log(`  search: OK, results=${searchCount}`);

      // 3. Detail page
      try {
        let detailHref = null;
        if (src.id === 'likemanga') {
          const firstImg = page.locator(src.selectors.searchResultItem).first();
          const parentA = firstImg.locator('xpath=ancestor::a').first();
          detailHref = await parentA.getAttribute('href');
        } else {
          detailHref = await page.locator(src.selectors.searchResultLink).first().getAttribute('href');
        }

        if (detailHref) {
          const detailUrl = detailHref.startsWith('http') ? detailHref : `${src.baseUrl}${detailHref.startsWith('/') ? '' : '/'}${detailHref}`;
          await gotoWithRetry(page, detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await delay(3000);
          await page.screenshot({ path: `${OUTDIR}/${src.id}_detail.png`, fullPage: true });
          const detailHtml = await page.content();
          fs.writeFileSync(`${OUTDIR}/${src.id}_detail.html`, detailHtml);

          const titleFound = await page.locator(src.selectors.detailTitle).count() > 0;
          findings.checks.push({ page: 'detail', status: 'OK', url: detailUrl, titleFound });
          console.log(`  detail: OK, titleFound=${titleFound}`);

          // 4. Chapter page
          try {
            const chapterCount = await page.locator(src.selectors.chapterLink).count();
            if (chapterCount > 0) {
              const chapterHref = await page.locator(src.selectors.chapterLink).first().getAttribute('href');
              const chapterUrl = chapterHref.startsWith('http') ? chapterHref : `${src.baseUrl}${chapterHref.startsWith('/') ? '' : '/'}${chapterHref}`;
              await gotoWithRetry(page, chapterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
              await delay(4000);
              await page.screenshot({ path: `${OUTDIR}/${src.id}_chapter.png`, fullPage: true });
              const chapterHtml = await page.content();
              fs.writeFileSync(`${OUTDIR}/${src.id}_chapter.html`, chapterHtml);

              const pageCount = src.selectors.pageImg ? await page.locator(src.selectors.pageImg).count() : 0;
              findings.checks.push({ page: 'chapter', status: 'OK', url: chapterUrl, pageCount });
              console.log(`  chapter: OK, pages=${pageCount}`);
            } else {
              findings.checks.push({ page: 'chapter', status: 'NO_CHAPTERS' });
              console.log(`  chapter: NO_CHAPTERS_FOUND`);
            }
          } catch (ce) {
            findings.checks.push({ page: 'chapter', status: 'ERROR', error: ce.message });
            console.log(`  chapter: ERROR - ${ce.message}`);
          }
        } else {
          findings.checks.push({ page: 'detail', status: 'NO_LINK' });
          console.log(`  detail: NO_LINK_FOUND`);
        }
      } catch (de) {
        findings.checks.push({ page: 'detail', status: 'ERROR', error: de.message });
        console.log(`  detail: ERROR - ${de.message}`);
      }
    } catch (se) {
      findings.checks.push({ page: 'search', status: 'ERROR', error: se.message });
      console.log(`  search: ERROR - ${se.message}`);
    }

    await page.close();
    report.push(findings);
  }

  await browser.close();

  fs.writeFileSync(`${OUTDIR}/batch1_report.json`, JSON.stringify(report, null, 2));
  console.log('\nDone. Report saved to batch1_report.json');
}

run().catch(console.error);
