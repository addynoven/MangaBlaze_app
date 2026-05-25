import { BaseSource } from '../../sources/BaseSource';
import type { 
  SourceManga, 
  SourceMangaDetail, 
  SourceChapter, 
  SourcePage 
} from '../../sources/types';

interface ComickSearchResult {
  id: number;
  hid: string;
  slug: string;
  title: string;
  md_covers?: Array<{ b2key: string }>;
  cover_url?: string;
  status: number;
  year: number | null;
}

interface ComickComic {
  comic: {
    id: number;
    hid: string;
    slug: string;
    title: string;
    desc: string;
    status: number;
    year: number | null;
    md_covers?: Array<{ b2key: string }>;
    md_comic_md_genres?: Array<{ md_genres: { name: string } }>;
    authors?: string[];
    artists?: string[];
  };
}

interface ComickChapter {
  id: number;
  hid: string;
  chap: string;
  title: string | null;
  vol: string | null;
  lang: string;
  group_name?: string[];
  created_at: string;
  updated_at: string;
  md_images?: Array<{ name: string; url?: string }>;
}

interface ComickChapterDetail {
  chapter: ComickChapter & {
    md_images?: Array<{ name: string; url?: string; w: number; h: number }>;
  };
}

export default class ComicKExtension extends BaseSource {
  id = 'comick';
  name = 'ComicK';
  type: 'api' = 'api';
  protected baseUrl = 'https://api.comick.app';
  private imgUrl = 'https://meo.comick.pictures';

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    const start = Date.now();
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      tachiyomi: 'true'
    });

    const data = await this.fetchJSON<ComickSearchResult[]>(`${this.baseUrl}/v1.0/search?${params.toString()}`);
    this.reportSuccess(Date.now() - start);

    return data.map((item) => ({
      id: item.hid || String(item.id),
      title: item.title,
      cover: this.getCoverUrl(item),
      status: this.statusFromCode(item.status),
      year: item.year,
    }));
  }

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    const start = Date.now();
    const data = await this.fetchJSON<ComickComic>(`${this.baseUrl}/comic/${mangaId}?tachiyomi=true`);
    const comic = data.comic;

    const genres = comic.md_comic_md_genres?.map((g) => g.md_genres?.name).filter(Boolean) as string[] || [];

    this.reportSuccess(Date.now() - start);
    return {
      id: comic.hid || String(comic.id),
      title: comic.title,
      cover: this.getCoverUrl(comic),
      status: this.statusFromCode(comic.status),
      year: comic.year,
      description: comic.desc || '',
      authors: comic.authors || [],
      artists: comic.artists || [],
      genres,
      altTitles: [],
      originalLanguage: 'ja',
    };
  }

  async getChapters(mangaId: string, limit = 100, offset = 0, lang = 'en'): Promise<SourceChapter[]> {
    const start = Date.now();
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(Math.floor(offset / limit) + 1),
      lang: lang
    });

    const data = await this.fetchJSON<{ chapters: ComickChapter[] }>(`${this.baseUrl}/comic/${mangaId}/chapters?${params.toString()}`);
    this.reportSuccess(Date.now() - start);

    return (data.chapters || []).map((ch) => ({
      id: ch.hid || String(ch.id),
      chapterNumber: ch.chap || '?',
      title: ch.title,
      volume: ch.vol,
      language: ch.lang || lang,
      pages: ch.md_images?.length || 0,
      publishedAt: ch.created_at,
      readableAt: ch.created_at,
      externalUrl: null,
      isUnavailable: false,
    }));
  }

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    const start = Date.now();
    const data = await this.fetchJSON<ComickChapterDetail>(`${this.baseUrl}/chapter/${chapterId}?tachiyomi=true`);
    const images = data.chapter?.md_images || [];

    this.reportSuccess(Date.now() - start);
    return images.map((img, index) => ({
      url: img.url || `${this.imgUrl}/${img.name}`,
      index,
    }));
  }

  private getCoverUrl(comic: { md_covers?: Array<{ b2key: string }> }): string {
    if (comic.md_covers && comic.md_covers.length > 0) {
      const key = comic.md_covers[0].b2key;
      if (key) return `${this.imgUrl}/${key}`;
    }
    return '/images/placeholder.png';
  }

  private statusFromCode(code: number): string {
    const map: Record<number, string> = { 1: 'ongoing', 2: 'completed', 3: 'cancelled', 4: 'hiatus' };
    return map[code] || 'unknown';
  }
}
