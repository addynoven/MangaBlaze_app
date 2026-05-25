const { chromium } = require('./screenshot/node_modules/playwright');
const fs = require('fs');

// Full list of source IDs extracted from src/lib/sources/index.ts
const allSources = [
  'anisascans', 'arenascan', 'arenascans', 'arvencomics', 'aryascans', 'asmhentai', 'assortedscans', 
  'asurascans', 'aurora', 'blastwave', 'bunmanga', 'cocomic', 'coffeemanga', 'comicfury', 'comick', 
  'comickunoriginal', 'comicskingdom', 'comikey', 'commitstrip', 'coronaex', 'crowscans', 'culturedworks', 
  'darklegacycomics', 'darthsdroids', 'deathtollscans', 'decadencescans', 'digitalcomicmuseum', 
  'dragonballmultiverse', 'dynastyscans', 'egscomics', 'elgoonishshive', 'elanschool', 'erisscans', 
  'ero18x', 'erofus', 'evascans', 'existentialcomics', 'fablescans', 'fairyscans', 'fanfox', 'flamecomics', 
  'flamescanslol', 'frierenonline', 'galaxymanga', 'gensura', 'genztoons', 'giantitp', 'grabberzone', 
  'grrlpowercomic', 'gunnerkrigg', 'hachirumi', 'hadescans', 'hennojin', 'hentaienvy', 'hentaiera', 
  'hentaihere', 'hentainexus', 'hentairead', 'hentairox', 'hentaixcomic', 'hentaixyuri', 'hentaizap', 
  'hentara', 'heytoon', 'hiperdex', 'hm2d', 'holonomertia', 'hniscantrad', 'honkaiimpact3', 'imhentai', 
  'isekaiscan', 'kaynscan', 'kemono', 'kewnscans', 'kingcomix', 'kingofshojo', 'kokomangas', 'kuramanga', 
  'lagoonscans', 'lhtranslation', 'likemanga', 'luminaretranslations', 'luscious', 'madaradex', 
  'madarascans', 'manga18me', 'mangack', 'mangaclash', 'mangadass', 'mangacrazy', 'mangademon', 
  'mangadistrict', 'mangadex', 'mangadna', 'mangafire', 'mangafreak', 'mangaforfree', 'mangafree', 
  'mangagg', 'mangago', 'mangagofun', 'mangahere', 'mangahe', 'mangahub', 'mangakakalotfun', 'mangaka', 
  'mangakiss', 'mangamaniacs', 'mangamonk', 'manganato', 'mangapandaonl', 'mangapill', 'mangareaderin', 
  'mangareadersite', 'mangareadorg', 'mangasushi', 'mangatellers', 'mangatown', 'megatokyo', 'mangatrend', 
  'mangatx', 'manhuahot', 'manhuascanus', 'manhuaplus', 'manhuarm', 'manhwa18cc', 'manhwabuddy', 
  'manhwaclub', 'manhwaclub_agent2', 'manhwaclub_agent4', 'manhwaget', 'misskon', 'nhentaicom', 
  'nhentaixxx', 'newmanhwa', 'nexcomic', 'niadd', 'nineanime', 'ninehentai', 'ninekon', 'ninemangaen', 
  'nixmanga', 'novelcool', 'noxenscans', 'nyanukafe', 'onepunchmanonline', 'ososedki', 'pandachaika', 
  'paritehaber', 'patchfriday', 'peppercarrot', 'photos18', 'politeandgood', 'questionablecontent', 
  'petrotechsociety', 'porncomic18', 'pornpics', 'rackusreads', 'rdscans', 'read7deadlysins', 
  'readallcomics', 'readberserk', 'readblackclover', 'readchainsawman', 'readcomiconline', 
  'readcomicsonline', 'readfairytail', 'readjujutsukaisen', 'readkingdom', 'readmha', 'readnaruto', 
  'readonepiece', 'readopm', 'readsololeveling', 'readvagabond', 'reallifecomics', 'resetscans', 
  'rinkocomics', 'rizzcomic', 'rizzcomiccom', 'rokaricomics', 's2manga', 'sandraandwoo', 'scythescans', 
  'shibamanga', 'skymanga', 'smbccomics', 'stonescape', 'supermegacomics', 'swordscomic', 'tcbscans', 
  'thepropertyofhate', 'thunderscans', 'timelesstoons', 'tokyoghoulre', 'toon18', 'vgperson', 
  'vinnieveritas', 'violetscans', 'viz', 'vortexscans', 'voyceme', 'webtoonscan', 'webtoonxyz', 
  'weebcentral', 'whalemanga', 'writerscans', 'wuxiaworld', 'xarthunter', 'xasiat', 'xgmn8', 
  'xinmeitulu', 'xiutaku', 'xkcd', 'xoxocomic'
];

const BATCH_SIZE = 10;
const startIdx = parseInt(process.argv[2] || '0');
const endIdx = Math.min(startIdx + BATCH_SIZE, allSources.length);
const sourcesToTest = allSources.slice(startIdx, endIdx);

const baseUrl = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ 
    executablePath: '/home/neon/.local/bin/google-chrome', 
    headless: true 
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  console.log(`Starting verification for sources ${startIdx} to ${endIdx - 1}...`);
  
  const results = [];

  for (const sourceId of sourcesToTest) {
    const report = { sourceId, status: 'fail', error: null, steps: [] };
    
    try {
      const page = await context.newPage();
      
      // 1. Browse Source
      report.steps.push('browsing');
      await page.goto(`${baseUrl}/browse/${sourceId}`, { waitUntil: 'networkidle', timeout: 30000 });
      
      // 2. Find a manga link - looking for any link that contains /manga/
      report.steps.push('finding_manga');
      await page.waitForSelector('a[href*="/manga/"]', { timeout: 10000 });
      const mangaLink = await page.locator('a[href*="/manga/"]').first();
      const mangaHref = await mangaLink.getAttribute('href');
      
      if (!mangaHref) {
         throw new Error('Found manga card but no href attribute');
      }

      console.log(`[${sourceId}] Found manga: ${mangaHref}`);
      
      // 3. Open Detail Page
      report.steps.push('detailing');
      await page.goto(`${baseUrl}${mangaHref}`, { waitUntil: 'networkidle', timeout: 30000 });
      
      // 4. Find first chapter - looking for any link that contains /read/
      report.steps.push('finding_chapter');
      // Sometimes it takes a moment for the chapter list to load via API
      await page.waitForSelector('a[href*="/read/"]', { timeout: 15000 }).catch(() => {});
      
      const chapterLink = await page.locator('a[href*="/read/"]').first();
      const chapterCount = await page.locator('a[href*="/read/"]').count();
      
      if (chapterCount === 0) {
         // Maybe it's an external link?
         const externalLink = await page.locator('.list-body .item a[target="_blank"]').first();
         if (await externalLink.count()) {
            report.status = 'external_ok';
            console.log(`[${sourceId}] OK (External chapter)`);
         } else {
            throw new Error('No chapters found (neither internal nor external)');
         }
      } else {
         const chapterHref = await chapterLink.getAttribute('href');
         
         // 5. Open Reader
         report.steps.push('reading');
         console.log(`[${sourceId}] Opening reader: ${chapterHref}`);
         await page.goto(`${baseUrl}${chapterHref}`, { waitUntil: 'networkidle', timeout: 45000 });
         
         // 6. Check for images
         await page.waitForTimeout(5000); // Wait for potential async image loads
         const images = await page.locator('.pages img');
         const imgCount = await images.count();
         
         if (imgCount > 0) {
            report.status = 'pass';
            console.log(`[${sourceId}] PASS (${imgCount} images)`);
            await page.screenshot({ path: `screenshot/verify_full_${sourceId}.png` });
         } else {
            throw new Error('Reader loaded but no images found in .pages container');
         }
      }
      await page.close();
    } catch (e) {
      report.error = e.message;
      console.error(`[${sourceId}] FAIL at step ${report.steps.join('->')}: ${e.message}`);
    } finally {
      results.push(report);
    }
  }

  const reportFile = `screenshot/batch_report_${startIdx}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  console.log(`Batch verification complete. Report saved to ${reportFile}`);
  
  await browser.close();
})();
