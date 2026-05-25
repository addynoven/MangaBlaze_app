import * as cheerio from 'cheerio';
import fs from 'fs';

const OUTDIR = '/home/neon/programs/side_project/mangablaze/screenshot';

function testSource(id, baseUrl, searchFile, detailFile, chapterFile, selectors) {
  console.log(`\n========== ${id} ==========`);
  
  // Search
  const searchHtml = fs.readFileSync(searchFile, 'utf8');
  const $s = cheerio.load(searchHtml);
  const searchItems = $s(selectors.searchResultItem);
  console.log(`  search results: ${searchItems.length}`);
  if (searchItems.length > 0) {
    const first = searchItems.first();
    const link = first.find(selectors.searchResultLink);
    console.log(`  first title: ${link.text().trim().substring(0, 60)}`);
    console.log(`  first href: ${link.attr('href')?.substring(0, 80)}`);
  }

  // Detail
  const detailHtml = fs.readFileSync(detailFile, 'utf8');
  const $d = cheerio.load(detailHtml);
  const title = $d(selectors.detailTitle).first().text().trim();
  console.log(`  detail title: "${title.substring(0, 80)}"`);
  const cover = $d(selectors.detailCover).first().attr('src') || $d(selectors.detailCover).first().attr('data-src');
  console.log(`  cover: ${cover?.substring(0, 80)}`);
  if (selectors.detailDesc) {
    const desc = $d(selectors.detailDesc).first().text().trim();
    console.log(`  desc: "${desc.substring(0, 100)}..."`);
  }
  if (selectors.detailGenres) {
    const genres = [];
    $d(selectors.detailGenres).each((_, el) => genres.push($d(el).text().trim()));
    console.log(`  genres: ${genres.slice(0, 5).join(', ')}`);
  }

  // Chapters
  const chapters = $d(selectors.chapterItem);
  console.log(`  chapters: ${chapters.length}`);
  if (chapters.length > 0) {
    const firstCh = chapters.first().find('a').first();
    console.log(`  first chapter: "${firstCh.text().trim()}" href=${firstCh.attr('href')?.substring(0, 80)}`);
  }

  // Chapter pages
  if (chapterFile && selectors.pageImg) {
    const chapterHtml = fs.readFileSync(chapterFile, 'utf8');
    const $c = cheerio.load(chapterHtml);
    const pages = $c(selectors.pageImg);
    console.log(`  chapter pages: ${pages.length}`);
    if (pages.length > 0) {
      const firstSrc = pages.first().attr('src');
      console.log(`  first page: ${firstSrc?.substring(0, 80)}`);
    }
  }
}

testSource('bunmanga', 'https://bunmanga.com',
  `${OUTDIR}/bunmanga_search.html`,
  `${OUTDIR}/bunmanga_detail.html`,
  `${OUTDIR}/bunmanga_chapter.html`,
  {
    searchResultItem: '.c-tabs-item .c-tabs-item__content',
    searchResultLink: '.tab-thumb a',
    detailTitle: '.post-title h1',
    detailCover: '.summary_image img',
    detailDesc: '.description-summary .summary__content',
    detailGenres: '.genres-content a',
    chapterItem: 'li.wp-manga-chapter',
    pageImg: '.wp-manga-chapter-img',
  }
);

testSource('likemanga', 'https://likemanga.ink',
  `${OUTDIR}/likemanga_search.html`,
  `${OUTDIR}/likemanga_detail.html`,
  `${OUTDIR}/likemanga_chapter.html`,
  {
    searchResultItem: 'img.jtip.card-img-top',
    searchResultLink: 'img.jtip.card-img-top',
    detailTitle: 'h1.title-detail',
    detailCover: 'img.card-img-top, img.lazy, img.center',
    detailDesc: '#summary_shortened, #summary_content',
    detailGenres: 'a[href^="/genres/"]',
    chapterItem: 'li.wp-manga-chapter',
    pageImg: 'img[data-index]',
  }
);

testSource('mangack', 'https://mangack.com',
  `${OUTDIR}/mangack_search.html`,
  `${OUTDIR}/mangack_detail.html`,
  `${OUTDIR}/mangack_chapter.html`,
  {
    searchResultItem: 'a.wrap-text[href^="https://mangack.com/manga/"]',
    searchResultLink: 'a.wrap-text[href^="https://mangack.com/manga/"]',
    detailTitle: 'h1.entry-title',
    detailCover: 'img.wp-post-image',
    detailDesc: '.entry-content',
    detailGenres: 'a[href^="https://mangack.com/genre/"]',
    chapterItem: 'ul.chapterslist a.title',
    pageImg: 'img.aligncenter',
  }
);

testSource('mangagofun', 'https://www.mangago.fun',
  `${OUTDIR}/mangagofun_search.html`,
  `${OUTDIR}/mangagofun_detail.html`,
  `${OUTDIR}/mangagofun_chapter.html`,
  {
    searchResultItem: '.c-tabs-item',
    searchResultLink: '.post-title h3 a',
    detailTitle: '.post-title h1, .post-title h3',
    detailCover: '.summary_image img',
    detailDesc: '.description-summary p, .summary__content p',
    detailGenres: '.genres-content a, a[href*="/manga-genre/"]',
    chapterItem: 'li.wp-manga-chapter',
    pageImg: '.wp-manga-chapter-img',
  }
);
