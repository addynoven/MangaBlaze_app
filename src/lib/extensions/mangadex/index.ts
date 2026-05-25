import { BaseSource } from '../../sources/BaseSource';
import type { 
  SourceManga, 
  SourceMangaDetail, 
  SourceChapter, 
  SourcePage 
} from '../../sources/types';

export default class MangaDexExtension extends BaseSource {
  id = 'mangadex';
  name = 'MangaDex';
  type: 'api' = 'api';
  protected baseUrl = 'https://api.mangadex.org';
  private coverUrl = 'https://uploads.mangadex.org/covers';

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    const start = Date.now();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: '0',
      'includes[]': 'cover_art',
      'contentRating[]': 'safe',
      'order[relevance]': 'desc'
    });
    if (query) params.set('title', query);

    const res = await this.fetchJSON<any>(`${this.baseUrl}/manga?${params.toString()}`);
    this.reportSuccess(Date.now() - start);
    return res.data.map(this.normalizeManga.bind(this));
  }

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    const start = Date.now();
    const res = await this.fetchJSON<any>(
      `${this.baseUrl}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`
    );
    if (!res.data) return null;
    this.reportSuccess(Date.now() - start);
    return this.normalizeMangaDetail(res.data);
  }

  async getChapters(mangaId: string, limit = 100, offset = 0, lang = 'en'): Promise<SourceChapter[]> {
    const start = Date.now();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      'translatedLanguage[]': lang,
      'order[chapter]': 'desc'
    });

    const res = await this.fetchJSON<any>(`${this.baseUrl}/manga/${mangaId}/feed?${params.toString()}`);
    this.reportSuccess(Date.now() - start);
    return res.data.map(this.normalizeChapter);
  }

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    const start = Date.now();
    const res = await this.fetchJSON<any>(`${this.baseUrl}/at-home/server/${chapterId}`);
    this.reportSuccess(Date.now() - start);
    return res.chapter.data.map((file: string, index: number) => ({
      url: `${res.baseUrl}/data/${res.chapter.hash}/${file}`,
      index,
    }));
  }

  private normalizeManga(manga: any): SourceManga {
    const coverRel = manga.relationships?.find((r: any) => r.type === 'cover_art');
    const fileName = coverRel?.attributes?.fileName;
    return {
      id: manga.id,
      title: manga.attributes.title.en || Object.values(manga.attributes.title)[0] as string,
      cover: fileName ? `${this.coverUrl}/${manga.id}/${fileName}.512.jpg` : '/images/placeholder.png',
      status: manga.attributes.status,
      year: manga.attributes.year,
      genres: manga.attributes.tags.map((t: any) => t.attributes.name.en).filter(Boolean),
      lastChapter: manga.attributes.lastChapter,
    };
  }

  private normalizeMangaDetail(manga: any): SourceMangaDetail {
    const base = this.normalizeManga(manga);
    return {
      ...base,
      description: manga.attributes.description.en || Object.values(manga.attributes.description)[0] as string || '',
      authors: manga.relationships.filter((r: any) => r.type === 'author').map((r: any) => r.attributes?.name),
      artists: manga.relationships.filter((r: any) => r.type === 'artist').map((r: any) => r.attributes?.name),
      genres: base.genres || [],
      altTitles: Object.values(manga.attributes.title) as string[],
      originalLanguage: manga.attributes.originalLanguage,
    };
  }

  private normalizeChapter(ch: any): SourceChapter {
    return {
      id: ch.id,
      chapterNumber: ch.attributes.chapter || '?',
      title: ch.attributes.title,
      volume: ch.attributes.volume,
      language: ch.attributes.translatedLanguage,
      pages: ch.attributes.pages,
      publishedAt: ch.attributes.publishAt,
      readableAt: ch.attributes.readableAt,
      externalUrl: ch.attributes.externalUrl,
      isUnavailable: ch.attributes.isUnavailable,
    };
  }
}
