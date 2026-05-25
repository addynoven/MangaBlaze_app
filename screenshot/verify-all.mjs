import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTDIR = '/home/neon/programs/side_project/mangablaze/screenshot';
const SOURCES_DIR = '/home/neon/programs/side_project/mangablaze/src/lib/sources';

const results = [];

function extractBaseUrl(content) {
  const m = content.match(/BASE_URL\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

function extractSourceId(content) {
  const m = content.match(/id:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

function extractName(content) {
  const m = content.match(/name:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

async function testSource(browser, file) {
  const filePath = path.join(SOURCES_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const baseUrl = extractBaseUrl(content);
  const id = extractSourceId(content);
  const name = extractName(content);

  if (!baseUrl) {
    results.push({ file, id, name, baseUrl, status: 'SKIP_NO_URL', error: null });
    return;
  }

  console.log(`\n=== Testing ${id || file} → ${baseUrl} ===`);
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
  const page = await context.newPage();
  
  try {
    // Homepage
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);
    const homepagePath = path.join(OUTDIR, `${id || file.replace('.ts','')}_homepage.png`);
    await page.screenshot({ path: homepagePath, fullPage: false });
    console.log(`  ✓ homepage screenshot saved`);

    // Check title
    const title = await page.title().catch(() => 'NO_TITLE');
    console.log(`  title: ${title}`);

    // Try search
    let searchWorked = false;
    const searchPatterns = [
      `${baseUrl}/?s=naruto`,
      `${baseUrl}/?s=naruto&post_type=wp-manga`,
      `${baseUrl}/search?q=naruto`,
      `${baseUrl}/search/naruto/`,
      `${baseUrl}/manga/?s=naruto`,
      `${baseUrl}/search?name=naruto`,
    ];
    
    for (const searchUrl of searchPatterns) {
      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        const searchTitle = await page.title().catch(() => '');
        if (!searchTitle.toLowerCase().includes('404') && !searchTitle.toLowerCase().includes('not found')) {
          const searchPath = path.join(OUTDIR, `${id || file.replace('.ts','')}_search.png`);
          await page.screenshot({ path: searchPath, fullPage: false });
          console.log(`  ✓ search screenshot saved (${searchUrl})`);
          searchWorked = true;
          break;
        }
      } catch (e) {
        // try next pattern
      }
    }
    if (!searchWorked) {
      console.log(`  ✗ search failed for all patterns`);
    }

    results.push({ file, id, name, baseUrl, status: 'OK', title, searchWorked, error: null });
  } catch (error) {
    console.log(`  ✗ ERROR: ${error.message}`);
    results.push({ file, id, name, baseUrl, status: 'ERROR', error: error.message });
  } finally {
    await context.close();
  }
}

async function main() {
  const files = fs.readdirSync(SOURCES_DIR).filter(f => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts');
  
  console.log(`Found ${files.length} source files to test`);
  
  const browser = await chromium.launch({ headless: true });
  
  for (const file of files) {
    await testSource(browser, file);
  }
  
  await browser.close();

  // Generate report
  const report = `# MangaBlaze Source Verification Report
Generated: ${new Date().toISOString()}

## Summary
| Status | Count |
|--------|-------|
| OK | ${results.filter(r => r.status === 'OK').length} |
| ERROR | ${results.filter(r => r.status === 'ERROR').length} |
| SKIP_NO_URL | ${results.filter(r => r.status === 'SKIP_NO_URL').length} |

## Detailed Results

| File | ID | Name | Base URL | Status | Title | Search | Error |
|------|----|------|----------|--------|-------|--------|-------|
${results.map(r => `| ${r.file} | ${r.id || '-'} | ${r.name || '-'} | ${r.baseUrl || '-'} | ${r.status} | ${r.title || '-'} | ${r.searchWorked ? '✓' : '✗'} | ${r.error || '-'} |`).join('\n')}
`;

  fs.writeFileSync(path.join(OUTDIR, 'VERIFICATION_REPORT.md'), report);
  console.log(`\n✅ Report saved to ${path.join(OUTDIR, 'VERIFICATION_REPORT.md')}`);
}

main().catch(console.error);
