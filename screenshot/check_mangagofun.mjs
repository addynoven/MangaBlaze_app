import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('mangagofun_search.html', 'utf8');
const $ = cheerio.load(html);
const items = $('.c-tabs-item');
console.log('total c-tabs-item:', items.length);
items.each((i, el) => {
  const link = $(el).find('.post-title h3 a').first();
  const href = link.attr('href') || '';
  const title = link.text().trim();
  console.log(i, 'href:', href.substring(0, 60), 'title:', title.substring(0, 60));
});
