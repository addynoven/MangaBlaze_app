import { BaseSource } from '../../sources/BaseSource';
import type { 
  SourceManga, 
  SourceMangaDetail, 
  SourceChapter, 
  SourcePage 
} from '../../sources/types';

export default class HentaiFoxExtension extends BaseSource {
  id = 'hentaifox';
  name = 'HentaiFox';
  type: 'scraper' = 'scraper';
  protected baseUrl = 'https://hentaifox.com';

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    const start = Date.now();
    const url = query 
      ? `${this.baseUrl}/search/?q=${encodeURIComponent(query)}`
      : this.baseUrl;
    const $ = await this.fetchHTML(url);
    
    const results: SourceManga[] = [];
    $('.thumb').each((_, el) => {
      const thumb = $(el);
      const titleLink = thumb.find('.caption .g_title a');
      const href = titleLink.attr('href') || '';
      const id = href.match(/\/gallery\/(\d+)\//)?.[1];
      
      if (id) {
        results.push({
          id,
          title: titleLink.text().trim(),
          cover: thumb.find('.inner_thumb img').attr('data-src') || '/images/placeholder.png',
          status: 'completed',
        });
      }
    });

    this.reportSuccess(Date.now() - start);
    return results.slice(0, limit);
  }

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    const start = Date.now();
    const url = `${this.baseUrl}/gallery/${mangaId}/`;
    const $ = await this.fetchHTML(url);
    
    const title = $('h1').first().text().trim();
    if (!title) return null;

    const genres: string[] = [];
    $('.tags .tag_btn').each((_, el) => {
        const tag = $(el).text().replace(/\d+$/, '').trim();
        if (tag) genres.push(tag);
    });

    this.reportSuccess(Date.now() - start);
    return {
      id: mangaId,
      title,
      cover: $('.cover img').attr('src') || '/images/placeholder.png',
      description: $('meta[name="description"]').attr('content') || '',
      authors: $('.artists .tag_btn').map((_, el) => $(el).text().replace(/\d+$/, '').trim()).get(),
      artists: [],
      genres: Array.from(new Set(genres)),
      altTitles: [],
    };
  }

  async getChapters(mangaId: string): Promise<SourceChapter[]> {
    const start = Date.now();
    const url = `${this.baseUrl}/gallery/${mangaId}/`;
    const $ = await this.fetchHTML(url);
    
    const title = $('h1').first().text().trim();
    const pageCountStr = $('#load_pages').val() as string || $('.i_text.pages').text().match(/Pages:\s*(\d+)/)?.[1] || '0';
    
    this.reportSuccess(Date.now() - start);
    
    // Only return exactly one chapter for the specific gallery requested
    // This prevents "Related Galleries" from being treated as chapters
    return [{
      id: mangaId,
      chapterNumber: '1',
      title: title || 'Full Gallery',
      volume: null,
      language: 'en',
      pages: parseInt(pageCountStr),
      publishedAt: new Date().toISOString(),
      readableAt: new Date().toISOString(),
      externalUrl: null,
      isUnavailable: false,
    }];
  }

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    const start = Date.now();
    const url = `${this.baseUrl}/g/${chapterId}/1/`;
    const $ = await this.fetchHTML(url);
    
    const totalPagesStr = $('#pages').val() as string || $('.total_pages').first().text().trim() || '0';
    const totalPages = parseInt(totalPagesStr);
    const firstImageSrc = $('#gimg').attr('data-src') || $('#gimg').attr('src') || '';
    
    if (!firstImageSrc || !totalPages) return [];

    // Smarter image URL construction
    // Example: https://i3.hentaifox.com/004/3949613/1.webp
    const urlObj = new URL(firstImageSrc);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts.pop() || ''; // e.g. "1.webp" or "1.jpg"
    const extension = fileName.split('.').pop();
    const baseDir = pathParts.join('/');

    const pages: SourcePage[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        url: `${urlObj.origin}${baseDir}/${i}.${extension}`,
        index: i - 1,
      });
    }

    this.reportSuccess(Date.now() - start);
    return pages;
  }
}

export const hentaifoxSource = new HentaiFoxExtension();
