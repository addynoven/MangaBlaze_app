import * as cheerio from 'cheerio';
import { reportSourceHealth } from '@/utils/health';
import type { 
  MangaSource, 
  SourceManga, 
  SourceMangaDetail, 
  SourceChapter, 
  SourcePage 
} from './types';

export abstract class BaseSource implements MangaSource {
  abstract id: string;
  abstract name: string;
  abstract type: 'api' | 'scraper';
  
  protected abstract baseUrl: string;
  protected userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // The core interface requirements
  abstract search(query: string, limit?: number): Promise<SourceManga[]>;
  abstract getManga(mangaId: string): Promise<SourceMangaDetail | null>;
  abstract getChapters(mangaId: string, limit?: number, offset?: number, lang?: string): Promise<SourceChapter[]>;
  abstract getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]>;

  /**
   * Standardized fetch with built-in health reporting and error handling.
   */
  protected async fetchWithHealth(url: string, options: RequestInit = {}): Promise<Response> {
    const start = Date.now();
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': this.userAgent,
          ...options.headers,
        },
      });

      const latency = Date.now() - start;
      
      if (!response.ok) {
        reportSourceHealth(this.id, false, latency, `HTTP Error: ${response.status}`);
        throw new Error(`Source ${this.id} fetch failed: ${response.status}`);
      }

      // Success is usually confirmed by the caller after parsing data
      return response;
    } catch (error: any) {
      const latency = Date.now() - start;
      reportSourceHealth(this.id, false, latency, error.message);
      throw error;
    }
  }

  /**
   * Helper for scrapers: Fetches a URL and returns a Cheerio instance.
   */
  protected async fetchHTML(url: string, options: RequestInit = {}): Promise<cheerio.CheerioAPI> {
    const res = await this.fetchWithHealth(url, options);
    const html = await res.text();
    return cheerio.load(html);
  }

  /**
   * Helper for APIs: Fetches a URL and returns JSON.
   */
  protected async fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await this.fetchWithHealth(url, options);
    return await res.json() as T;
  }
  
  /**
   * Report success after successful data parsing.
   */
  protected reportSuccess(latency: number) {
    reportSourceHealth(this.id, true, latency);
  }
}
