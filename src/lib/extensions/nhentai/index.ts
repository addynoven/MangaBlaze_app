import { BaseSource } from '../../sources/BaseSource';
import type { 
  SourceManga, 
  SourceMangaDetail, 
  SourceChapter, 
  SourcePage 
} from '../../sources/types';

export default class NHentaiExtension extends BaseSource {
  id = 'nhentai';
  name = 'nHentai';
  type: 'scraper' = 'scraper';
  protected baseUrl = 'https://nhentai.net';
  private imageServer = 'https://i.nhentai.net';
  private thumbServer = 'https://t.nhentai.net';

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    const start = Date.now();
    const url = query 
      ? `${this.baseUrl}/search?q=${encodeURIComponent(query)}`
      : this.baseUrl;
      
    const $ = await this.fetchHTML(url);
    const results: SourceManga[] = [];

    // nHentai (SvelteKit) stores data in JSON script tags
    $('script[type="application/json"]').each((_, el) => {
      try {
        const content = $(el).text();
        const json = JSON.parse(content);
        if (json.body) {
          const body = typeof json.body === 'string' ? JSON.parse(json.body) : json.body;
          const galleries = body.result || (Array.isArray(body) ? body : null); 
          
          if (Array.isArray(galleries)) {
            galleries.forEach((g: any) => {
              if (g.id && (g.title || g.english_title)) {
                results.push({
                  id: String(g.id),
                  title: g.title?.pretty || g.title?.english || g.english_title || 'Unknown',
                  cover: g.thumbnail?.path ? `${this.thumbServer}/${g.thumbnail.path}` : (g.cover?.path ? `${this.thumbServer}/${g.cover.path}` : '/images/placeholder.png'),
                  status: 'completed',
                  genres: g.tags?.filter((t: any) => t.type === 'tag').map((t: any) => t.name) || [],
                });
              }
            });
          }
        }
      } catch (e) {
        // Skip malformed script tags
      }
    });

    this.reportSuccess(Date.now() - start);
    
    // Deduplicate (SvelteKit pages often have multiple JSON bodies)
    const unique = new Map<string, SourceManga>();
    results.forEach(m => unique.set(m.id, m));
    
    return Array.from(unique.values()).slice(0, limit);
  }

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    const start = Date.now();
    const url = `${this.baseUrl}/g/${mangaId}/`;
    const $ = await this.fetchHTML(url);
    
    let manga: SourceMangaDetail | null = null;

    $('script[type="application/json"]').each((_, el) => {
      try {
        const content = $(el).text();
        const json = JSON.parse(content);
        if (json.body) {
          const body = typeof json.body === 'string' ? JSON.parse(json.body) : json.body;
          if (body.id && String(body.id) === mangaId) {
            const tags = body.tags || [];
            manga = {
              id: String(body.id),
              title: body.title?.english || body.title?.japanese || body.title?.pretty || body.english_title,
              cover: body.cover?.path ? `${this.thumbServer}/${body.cover.path}` : (body.thumbnail?.path ? `${this.thumbServer}/${body.thumbnail.path}` : '/images/placeholder.png'),
              description: '',
              authors: tags.filter((t: any) => t.type === 'artist' || t.type === 'group').map((t: any) => t.name),
              artists: tags.filter((t: any) => t.type === 'artist').map((t: any) => t.name),
              genres: tags.filter((t: any) => t.type === 'tag' || t.type === 'category').map((t: any) => t.name),
              altTitles: [body.title?.japanese, body.title?.pretty, body.japanese_title].filter(Boolean),
              source: 'nhentai'
            };
          }
        }
      } catch (e) {}
    });

    this.reportSuccess(Date.now() - start);
    return manga;
  }

  async getChapters(mangaId: string): Promise<SourceChapter[]> {
    const start = Date.now();
    const url = `${this.baseUrl}/g/${mangaId}/`;
    const $ = await this.fetchHTML(url);
    
    let chapter: SourceChapter | null = null;

    $('script[type="application/json"]').each((_, el) => {
      try {
        const content = $(el).text();
        const json = JSON.parse(content);
        if (json.body) {
          const body = typeof json.body === 'string' ? JSON.parse(json.body) : json.body;
          if (body.id && String(body.id) === mangaId) {
            chapter = {
              id: String(body.id),
              chapterNumber: '1',
              title: body.title?.pretty || body.english_title || 'Full Gallery',
              language: body.tags?.find((t: any) => t.type === 'language')?.name || 'en',
              pages: body.num_pages || 0,
              publishedAt: body.upload_date ? new Date(body.upload_date * 1000).toISOString() : new Date().toISOString(),
              readableAt: new Date().toISOString(),
              externalUrl: null,
              isUnavailable: false,
            };
          }
        }
      } catch (e) {}
    });

    this.reportSuccess(Date.now() - start);
    return chapter ? [chapter] : [];
  }

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    const start = Date.now();
    const url = `${this.baseUrl}/g/${chapterId}/`;
    const $ = await this.fetchHTML(url);
    
    const pages: SourcePage[] = [];

    $('script[type="application/json"]').each((_, el) => {
      try {
        const content = $(el).text();
        const json = JSON.parse(content);
        if (json.body) {
          const body = typeof json.body === 'string' ? JSON.parse(json.body) : json.body;
          if (body.id && String(body.id) === chapterId && body.pages) {
            body.pages.forEach((p: any, idx: number) => {
              pages.push({
                url: `${this.imageServer}/${p.path}`,
                index: idx,
              });
            });
          }
        }
      } catch (e) {}
    });

    this.reportSuccess(Date.now() - start);
    return pages;
  }
}

export const nhentaiSource = new NHentaiExtension();
