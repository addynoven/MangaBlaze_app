import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://nhentai.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface NHComic {
  id: number
  linkcode: string
  title: string
  alternative_title: string | null
  slug: string
  description: string | null
  rewritten: boolean
  translated: boolean
  speechless: boolean
  uploaded_at: string | null
  pages: number
  favorites: number
  status: string | null
  chapters_count: number
  thumb_url: string
  image_url: string
  short_url: string
  premium: boolean
  category: {
    id: number
    name: string
    slug: string
    description: string | null
  }
  language: {
    id: number
    name: string
    slug: string
    description: string | null
    icon_url: string
  }
  tags: Array<{
    id: number
    name: string
    slug: string
    description: string | null
    seo_description: string | null
    color: string
    comics_count: number
  }>
  artists?: Array<{
    id: number
    name: string
    slug: string
  }>
  authors?: Array<{
    id: number
    name: string
    slug: string
  }>
  groups?: Array<{
    id: number
    name: string
    slug: string
  }>
  parodies?: Array<{
    id: number
    name: string
    slug: string
  }>
  characters?: Array<{
    id: number
    name: string
    slug: string
  }>
  relationships?: Array<{
    id: number
    name: string
    slug: string
  }>
}

interface NHSearchResponse {
  current_page: number
  data: NHComic[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

interface NHImagesResponse {
  comic: NHComic
  chapter: unknown
  next_chapter: unknown
  images: Array<{
    id: number
    page: number
    source_url: string
    thumbnail_url: string
  }>
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`nHentai.com fetch error: ${res.status} ${url}`)
  return res.json() as Promise<T>
}

function langSlugToCode(slug: string): string {
  const map: Record<string, string> = {
    english: 'en',
    chinese: 'zh',
    japanese: 'ja',
    korean: 'ko',
    spanish: 'es',
    french: 'fr',
    german: 'de',
    italian: 'it',
    portuguese: 'pt',
    russian: 'ru',
    thai: 'th',
    vietnamese: 'vi',
    polish: 'pl',
    indonesian: 'id',
    hindi: 'hi',
    arabic: 'ar',
  }
  return map[slug] || slug
}

export const nhentaicomSource: MangaSource = {
  id: 'nhentaicom',
  name: 'nHentai.com',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('per_page', String(Math.min(limit, 50)))
      if (query) params.set('q', query)

      const url = `${BASE_URL}/api/comics?${params.toString()}`
      const data = await fetchJSON<NHSearchResponse>(url)

      return (data.data || []).map((comic) => ({
        id: String(comic.id),
        title: comic.title,
        cover: comic.thumb_url || '/images/placeholder.png',
        status: comic.status || undefined,
        year: null,
        contentRating: 'pornographic',
        genres: comic.tags?.map((t) => t.name) || [],
        description: comic.description || '',
        lastChapter: null,
        lastVolume: null,
      }))
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/api/comics/${mangaId}`
      const comic = await fetchJSON<NHComic>(url)

      if (!comic || !comic.id) return null

      const genres: string[] = []
      if (comic.category?.name) genres.push(comic.category.name)
      comic.tags?.forEach((t) => {
        if (t.name) genres.push(t.name)
      })

      const authors: string[] = []
      comic.authors?.forEach((a) => {
        if (a.name) authors.push(a.name)
      })
      comic.groups?.forEach((g) => {
        if (g.name) authors.push(g.name)
      })

      const artists: string[] = []
      comic.artists?.forEach((a) => {
        if (a.name) artists.push(a.name)
      })

      const altTitles: string[] = []
      if (comic.alternative_title) altTitles.push(comic.alternative_title)

      return {
        id: String(comic.id),
        title: comic.title,
        cover: comic.thumb_url || '/images/placeholder.png',
        status: comic.status || undefined,
        year: null,
        contentRating: 'pornographic',
        genres: [...new Set(genres)],
        description: comic.description || '',
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        altTitles,
        originalLanguage: langSlugToCode(comic.language?.slug || ''),
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
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/api/comics/${mangaId}`
      const comic = await fetchJSON<NHComic>(url)

      if (!comic || !comic.id) return []

      const publishedAt = comic.uploaded_at
        ? new Date(comic.uploaded_at).toISOString()
        : new Date().toISOString()

      const chapters: SourceChapter[] = [
        {
          id: String(comic.id),
          chapterNumber: '1',
          title: comic.title,
          volume: null,
          language: langSlugToCode(comic.language?.slug || ''),
          pages: comic.pages || 0,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: null,
          isUnavailable: false,
        },
      ]

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/api/comics/${chapterId}/images`
      const data = await fetchJSON<NHImagesResponse>(url)

      const images = data.images || []
      return images.map((img) => ({
        url: img.source_url,
        index: img.page - 1,
      }))
    } catch {
      return []
    }
  },
}
