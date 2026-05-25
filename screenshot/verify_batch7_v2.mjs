import { chromium } from 'playwright';
import fs from 'fs';

const screenshotDir = '/home/neon/programs/side_project/mangablaze/screenshot';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function captureHTML(page, selector) {
  try {
    const el = await page.$(selector);
    if (!el) return null;
    return await el.innerHTML();
  } catch {
    return null;
  }
}

async function testTimelessToons(browser) {
  console.log('\n=== TimelessToons ===');
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();
  const results = { source: 'timelesstoons', pages: [] };

  try {
    await page.goto('https://timelesstoons.org', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/timelesstoons_homepage.png`, fullPage: true });
    const homeHTML = await captureHTML(page, 'body');
    fs.writeFileSync(`${screenshotDir}/timelesstoons_homepage.html`, homeHTML || '');
    results.pages.push({ name: 'homepage', url: 'https://timelesstoons.org', hasButtons: homeHTML?.includes('<button') || false });
    console.log('Homepage saved, size:', homeHTML?.length);

    await page.goto('https://timelesstoons.org/search_series', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/timelesstoons_search.png`, fullPage: true });
    const searchHTML = await captureHTML(page, 'body');
    fs.writeFileSync(`${screenshotDir}/timelesstoons_search.html`, searchHTML || '');
    const searchButtons = searchHTML?.match(/<button/g) || [];
    results.pages.push({ name: 'search', url: 'https://timelesstoons.org/search_series', buttonCount: searchButtons.length });
    console.log(`Search page saved, buttons: ${searchButtons.length}`);

    const mangaLink = await page.$('a[href^="/series/"]');
    if (mangaLink) {
      const href = await mangaLink.getAttribute('href');
      console.log('Clicking manga link:', href);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        mangaLink.click()
      ]);
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${screenshotDir}/timelesstoons_detail.png`, fullPage: true });
      const detailHTML = await captureHTML(page, 'body');
      fs.writeFileSync(`${screenshotDir}/timelesstoons_detail.html`, detailHTML || '');
      results.pages.push({ name: 'detail', url: page.url(), hasH1: detailHTML?.includes('<h1') || false, hasExpandContent: detailHTML?.includes('expand_content') || false, hasMyImage: detailHTML?.includes('myImage') || false });
      console.log('Detail page saved:', page.url());
    } else {
      console.log('No manga link found on search page');
    }
  } catch (e) {
    console.error('TimelessToons error:', e.message);
    results.error = e.message;
  }

  await context.close();
  return results;
}

async function testGenzToons(browser) {
  console.log('\n=== GenzToons ===');
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();
  const results = { source: 'genztoons', pages: [] };

  try {
    await page.goto('https://genztoons.org', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/genztoons_homepage.png`, fullPage: true });
    const homeHTML = await captureHTML(page, 'body');
    fs.writeFileSync(`${screenshotDir}/genztoons_homepage.html`, homeHTML || '');
    results.pages.push({ name: 'homepage', url: 'https://genztoons.org', hasButtons: homeHTML?.includes('<button') || false });
    console.log('Homepage saved, size:', homeHTML?.length);

    await page.goto('https://genztoons.org/search_series', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/genztoons_search.png`, fullPage: true });
    const searchHTML = await captureHTML(page, 'body');
    fs.writeFileSync(`${screenshotDir}/genztoons_search.html`, searchHTML || '');
    const searchButtons = searchHTML?.match(/<button/g) || [];
    results.pages.push({ name: 'search', url: 'https://genztoons.org/search_series', buttonCount: searchButtons.length });
    console.log(`Search page saved, buttons: ${searchButtons.length}`);

    const mangaLink = await page.$('a[href^="/series/"]');
    if (mangaLink) {
      const href = await mangaLink.getAttribute('href');
      console.log('Clicking manga link:', href);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        mangaLink.click()
      ]);
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${screenshotDir}/genztoons_detail.png`, fullPage: true });
      const detailHTML = await captureHTML(page, 'body');
      fs.writeFileSync(`${screenshotDir}/genztoons_detail.html`, detailHTML || '');
      results.pages.push({ name: 'detail', url: page.url(), hasH1: detailHTML?.includes('<h1') || false, hasExpandContent: detailHTML?.includes('expand_content') || false, hasMyImage: detailHTML?.includes('myImage') || false });
      console.log('Detail page saved:', page.url());
    } else {
      console.log('No manga link found on search page');
    }
  } catch (e) {
    console.error('GenzToons error:', e.message);
    results.error = e.message;
  }

  await context.close();
  return results;
}

async function testStoneScape(browser) {
  console.log('\n=== StoneScape ===');
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();
  const results = { source: 'stonescape', pages: [] };

  try {
    await page.goto('https://stonescape.xyz', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/stonescape_homepage.png`, fullPage: true });
    const homeHTML = await captureHTML(page, 'body');
    fs.writeFileSync(`${screenshotDir}/stonescape_homepage.html`, homeHTML || '');
    results.pages.push({ name: 'homepage', url: 'https://stonescape.xyz' });
    console.log('Homepage saved, size:', homeHTML?.length);

    const searchUrl = 'https://stonescape.xyz/api/series?page=1&limit=20&search=naruto';
    const searchRes = await page.evaluate(async (url) => {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      return { status: res.status, body: await res.text() };
    }, searchUrl);
    fs.writeFileSync(`${screenshotDir}/stonescape_search.json`, JSON.stringify(searchRes, null, 2));
    results.pages.push({ name: 'search_api', url: searchUrl, status: searchRes.status, bodyPreview: searchRes.body.slice(0, 500) });
    console.log('Search API saved, status:', searchRes.status);

    let searchData;
    try { searchData = JSON.parse(searchRes.body); } catch {}
    if (searchData?.data?.length > 0) {
      const slug = searchData.data[0].slug;
      const detailUrl = `https://stonescape.xyz/api/series/by-slug/${slug}`;
      const detailRes = await page.evaluate(async (url) => {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        return { status: res.status, body: await res.text() };
      }, detailUrl);
      fs.writeFileSync(`${screenshotDir}/stonescape_detail.json`, JSON.stringify(detailRes, null, 2));
      results.pages.push({ name: 'detail_api', url: detailUrl, status: detailRes.status, hasTitle: detailRes.body.includes('"title"') });
      console.log('Detail API saved for slug:', slug);

      await page.goto(`https://stonescape.xyz/series/${slug}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${screenshotDir}/stonescape_detail.png`, fullPage: true });
      console.log('Detail page screenshot saved');
    } else {
      console.log('No search results or empty data');
    }
  } catch (e) {
    console.error('StoneScape error:', e.message);
    results.error = e.message;
  }

  await context.close();
  return results;
}

async function testWuxiaWorld(browser) {
  console.log('\n=== WuxiaWorld ===');
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();
  const results = { source: 'wuxiaworld', pages: [] };

  try {
    await page.goto('https://wuxiaworld.site', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/wuxiaworld_homepage.png`, fullPage: true });
    const homeHTML = await captureHTML(page, 'body');
    fs.writeFileSync(`${screenshotDir}/wuxiaworld_homepage.html`, homeHTML || '');
    results.pages.push({ name: 'homepage', url: 'https://wuxiaworld.site' });
    console.log('Homepage saved, size:', homeHTML?.length);

    await page.goto('https://wuxiaworld.site/?s=naruto&post_type=wp-manga', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/wuxiaworld_search.png`, fullPage: true });
    const searchHTML = await captureHTML(page, 'body');
    fs.writeFileSync(`${screenshotDir}/wuxiaworld_search.html`, searchHTML || '');
    results.pages.push({ name: 'search', url: 'https://wuxiaworld.site/?s=naruto&post_type=wp-manga', hasTabsItem: searchHTML?.includes('c-tabs-item') || false, hasPostTitle: searchHTML?.includes('post-title') || false });
    console.log('Search page saved');

    const mangaLink = await page.$('.c-tabs-item a, .post-title a, .tab-thumb a');
    if (mangaLink) {
      const href = await mangaLink.getAttribute('href');
      console.log('Clicking manga link:', href);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        mangaLink.click()
      ]);
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${screenshotDir}/wuxiaworld_detail.png`, fullPage: true });
      const detailHTML = await captureHTML(page, 'body');
      fs.writeFileSync(`${screenshotDir}/wuxiaworld_detail.html`, detailHTML || '');
      results.pages.push({ name: 'detail', url: page.url(), hasPostTitle: detailHTML?.includes('post-title') || false, hasSummaryImage: detailHTML?.includes('summary_image') || false, hasDescriptionSummary: detailHTML?.includes('description-summary') || false, hasWpMangaChapter: detailHTML?.includes('wp-manga-chapter') || false });
      console.log('Detail page saved:', page.url());
    } else {
      console.log('No manga link found on search page');
    }
  } catch (e) {
    console.error('WuxiaWorld error:', e.message);
    results.error = e.message;
  }

  await context.close();
  return results;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const allResults = [];

  allResults.push(await testTimelessToons(browser));
  allResults.push(await testGenzToons(browser));
  allResults.push(await testStoneScape(browser));
  allResults.push(await testWuxiaWorld(browser));

  fs.writeFileSync(`${screenshotDir}/batch7_raw_results.json`, JSON.stringify(allResults, null, 2));
  console.log('\n=== All results saved ===');

  await browser.close();
})();
