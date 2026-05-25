import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://comick.dev'
const IMG_URL = 'https://meo.comick.pictures'

interface ComickSearchResult {
  id: number
  hid: string
  slug: string
  title: string
  md_covers?: Array<{ b2key: string }>
  cover_url?: string
  status: number
  year: number | null
}

interface ComickComic {
  comic: {
    id: number
    hid: string
    slug: string
    title: string
    desc: string
    status: number
    year: number | null
    md_covers?: Array<{ b2key: string }>
    md_comic_md_genres?: Array<{ md_genres: { name: string } }>
    authors?: string[]
    artists?: string[]
  }
}

interface ComickChapter {
  id: number
  hid: string
    chap: string
  title: string | null
  vol: string | null
  lang: string
  group_name?: string[]
  created_at: string
  updated_at: string
  md_images?: Array<{ name: string; url?: string }>
}

interface ComickChapterDetail {
  chapter: ComickChapter & {
    md_images?: Array<{ name: string; url?: string; w: number; h: number }>
  }
}

function getCoverUrl(comic: { md_covers?: Array<{ b2key: string }> }): string {
  if (comic.md_covers && comic.md_covers.length > 0) {
    const key = comic.md_covers[0].b2key
    if (key) return `${IMG_URL}/${key}`
  }
  return '/images/placeholder.png'
}

function statusFromCode(code: number): string {
  const map: Record<number, string> = { 1: 'ongoing', 2: 'completed', 3: 'cancelled', 4: 'hiatus' }
  return map[code] || 'unknown'
}

export const comickSource: MangaSource = {
  id: 'comick',
  name: 'ComicK',
  type: 'api',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const params = new URLSearchParams()
      params.set('q', query)
      params.set('limit', String(limit))
      params.set('tachiyomi', 'true')

      const res = await fetch(`${BASE_URL}/v1.0/search?${params.toString()}`)
      if (!res.ok) return []
      const data = (await res.json()) as ComickSearchResult[]

      return data.map((item) => ({
        id: item.hid || String(item.id),
        title: item.title,
        cover: getCoverUrl(item),
        status: statusFromCode(item.status),
        year: item.year,
      }))
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const res = await fetch(`${BASE_URL}/comic/${mangaId}?tachiyomi=true`)
      if (!res.ok) return null
      const data = (await res.json()) as ComickComic
      const comic = data.comic

      const genres =
        comic.md_comic_md_genres?.map((g) => g.md_genres?.name).filter(Boolean) || []

      return {
        id: comic.hid || String(comic.id),
        title: comic.title,
        cover: getCoverUrl(comic),
        status: statusFromCode(comic.status),
        year: comic.year,
        description: comic.desc || '',
        authors: comic.authors || [],
        artists: comic.artists || [],
        genres,
        altTitles: [],
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(
    mangaId: string,
    limit = 100,
    offset = 0,
    lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('page', String(Math.floor(offset / limit) + 1))
      params.set('lang', lang)

      const res = await fetch(`${BASE_URL}/comic/${mangaId}/chapters?${params.toString()}`)
      if (!res.ok) return []
      const data = (await res.json()) as { chapters: ComickChapter[] }

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
      }))
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const res = await fetch(`${BASE_URL}/chapter/${chapterId}?tachiyomi=true`)
      if (!res.ok) return []
      const data = (await res.json()) as ComickChapterDetail

      const images = data.chapter?.md_images || []
      return images.map((img, index) => ({
        url: img.url || `${IMG_URL}/${img.name}`,
        index,
      }))
    } catch {
      return []
    }
  },
}
