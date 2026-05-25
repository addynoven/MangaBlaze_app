import { BaseSource } from '../../sources/BaseSource';
import type { 
  SourceManga, 
  SourceMangaDetail, 
  SourceChapter, 
  SourcePage 
} from '../../sources/types';

export default class AsuraScansExtension extends BaseSource {
  id = 'asurascans';
  name = 'Asura Scans';
  type: 'scraper' = 'scraper';
  protected baseUrl = 'https://asurascans.com';

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    const start = Date.now();
    const q = query.toLowerCase();
    const results: SourceManga[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= 3; page++) {
      const $ = await this.fetchHTML(`${this.baseUrl}/browse?page=${page}`);
      
      $('a[href^="/comics/"]').each((_, el) => {
        const link = $(el);
        const href = link.attr('href') || '';
        const id = href.match(/\/comics\/([^/]+)/)?.[1];
        if (!id || seen.has(id)) return;

        const text = link.text().trim();
        if (!text || /^[\d.]+$/.test(text)) return;
        if (!text.toLowerCase().includes(q) && !id.toLowerCase().includes(q)) return;

        seen.add(id);
        results.push({ id, title: text, cover: '/images/placeholder.png' });
      });

      if (results.length >= limit) break;
    }

    this.reportSuccess(Date.now() - start);
    return results.slice(0, limit);
  }

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    const start = Date.now();
    const $ = await this.fetchHTML(`${this.baseUrl}/comics/${mangaId}`);
    
    const title = $('h1').first().text().trim();
    if (!title) return null;

    this.reportSuccess(Date.now() - start);
    return {
      id: mangaId,
      title,
      cover: $('meta[property="og:image"]').attr('content') || '/images/placeholder.png',
      description: $('meta[name="description"]').attr('content') || '',
      authors: [],
      artists: [],
      genres: [],
      altTitles: [],
    };
  }

  async getChapters(mangaId: string, limit = 100): Promise<SourceChapter[]> {
    const start = Date.now();
    const $ = await this.fetchHTML(`${this.baseUrl}/comics/${mangaId}`);
    const chapters: SourceChapter[] = [];
    const seen = new Set<string>();

    $('a[href*="/chapter/"]').each((_, el) => {
      const link = $(el);
      const href = link.attr('href') || '';
      const id = href.split('/chapter/')[1]?.replace(/\/$/, '');
      if (!id || seen.has(id)) return;

      seen.add(id);
      const chapterNumber = id.match(/(\d+(?:\.\d+)?)$/)?.[1] || id;

      chapters.push({
        id,
        chapterNumber,
        title: link.text().trim() || `Chapter ${chapterNumber}`,
        volume: null,
        language: 'en',
        pages: 0,
        publishedAt: new Date().toISOString(),
        readableAt: new Date().toISOString(),
        externalUrl: null,
        isUnavailable: false,
      });
    });

    this.reportSuccess(Date.now() - start);
    return chapters.slice(0, limit);
  }

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    const start = Date.now();
    const finalMangaId = mangaId || chapterId.split('/')[0];
    const $ = await this.fetchHTML(`${this.baseUrl}/comics/${finalMangaId}/chapter/${chapterId}`);
    
    const pages: SourcePage[] = [];
    $('img').each((index, el) => {
      const src = $(el).attr('src');
      if (src && src.includes('cdn.asurascans.com') && src.includes('/chapters/')) {
        pages.push({ url: src.trim(), index });
      }
    });

    this.reportSuccess(Date.now() - start);
    return pages.sort((a, b) => {
      const aNum = parseInt(a.url.match(/(\d+)\.webp$/)?.[1] || '0');
      const bNum = parseInt(b.url.match(/(\d+)\.webp$/)?.[1] || '0');
      return aNum - bNum;
    });
  }
}
