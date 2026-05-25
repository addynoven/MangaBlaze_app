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
    const url = `${this.baseUrl}/search/?q=${encodeURIComponent(query)}`;
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
          status: 'completed', // These are usually complete galleries
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
        genres.push($(el).text().split(' ').slice(0, -1).join(' ').trim());
    });

    this.reportSuccess(Date.now() - start);
    return {
      id: mangaId,
      title,
      cover: $('.cover img').attr('src') || '/images/placeholder.png',
      description: $('meta[name="description"]').attr('content') || '',
      authors: $('.artists .tag_btn').map((_, el) => $(el).text().split(' ').slice(0, -1).join(' ').trim()).get(),
      artists: [],
      genres: genres.filter(Boolean),
      altTitles: [],
    };
  }

  async getChapters(mangaId: string): Promise<SourceChapter[]> {
    const start = Date.now();
    const url = `${this.baseUrl}/gallery/${mangaId}/`;
    const $ = await this.fetchHTML(url);
    
    const title = $('h1').first().text().trim();
    
    this.reportSuccess(Date.now() - start);
    return [{
      id: mangaId, // Use mangaId as chapterId for single-chapter sources
      chapterNumber: '1',
      title: title || 'Full Gallery',
      language: 'en',
      pages: parseInt($('#load_pages').val() as string || '0'),
      publishedAt: new Date().toISOString(),
      readableAt: new Date().toISOString(),
      externalUrl: null,
      isUnavailable: false,
    }];
  }

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    const start = Date.now();
    // In HentaiFox, chapterId is the same as galleryId
    const url = `${this.baseUrl}/g/${chapterId}/1/`;
    const $ = await this.fetchHTML(url);
    
    const totalPages = parseInt($('#pages').val() as string || '0');
    const firstImageSrc = $('#gimg').attr('data-src') || '';
    
    if (!firstImageSrc || !totalPages) return [];

    // Construct image URLs based on the first one
    // Example: https://i3.hentaifox.com/004/3949613/1.webp
    const baseUrlParts = firstImageSrc.split('/');
    const extension = firstImageSrc.split('.').pop();
    baseUrlParts.pop(); // remove 1.webp
    const baseImageUrl = baseUrlParts.join('/');

    const pages: SourcePage[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        url: `${baseImageUrl}/${i}.${extension}`,
        index: i - 1,
      });
    }

    this.reportSuccess(Date.now() - start);
    return pages;
  }
}

export const hentaifoxSource = new HentaiFoxExtension();
