import type {
  MangaSource,
  SourceManga,
  SourceMangaDetail,
  SourceChapter,
  SourcePage,
} from './types'

const BASE_URL = 'https://api.mangadex.org'
const COVER_URL = 'https://uploads.mangadex.org/covers'

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchMD<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const cacheKey = endpoint + JSON.stringify(options?.body || '')
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.data as T
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(`MangaDex API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL })
  return data as T
}

// Raw MangaDex types
interface MDManga {
  id: string
  type: 'manga'
  attributes: {
    title: Record<string, string>
    description: Record<string, string>
    status: string
    year: number | null
    contentRating: string
    originalLanguage: string
    lastVolume: string | null
    lastChapter: string | null
    tags: Array<{
      id: string
      attributes: { name: Record<string, string> }
    }>
    createdAt: string
    updatedAt: string
  }
  relationships: Array<{
    id: string
    type: string
    attributes?: Record<string, unknown>
  }>
}

interface MDChapter {
  id: string
  type: 'chapter'
  attributes: {
    title: string | null
    volume: string | null
    chapter: string | null
    pages: number
    translatedLanguage: string
    externalUrl: string | null
    isUnavailable: boolean
    publishAt: string
    readableAt: string
    createdAt: string
    updatedAt: string
  }
  relationships: Array<{
    id: string
    type: string
  }>
}

interface MDListResponse<T> {
  result: string
  response: string
  data: T[]
  limit: number
  offset: number
  total: number
}

interface MDResponse<T> {
  result: string
  response: string
  data: T
}

// Helpers
function getCoverFileName(manga: MDManga): string | undefined {
  const coverRel = manga.relationships?.find((r) => r.type === 'cover_art')
  return coverRel?.attributes?.fileName as string | undefined
}

function getCoverUrl(
  mangaId: string,
  coverFileName: string | undefined,
  size: '256' | '512' = '512'
): string {
  if (!coverFileName) return '/images/placeholder.png'
  return `${COVER_URL}/${mangaId}/${coverFileName}.${size}.jpg`
}

function getMangaTitle(manga: MDManga): string {
  return (
    manga.attributes.title.en ||
    manga.attributes.title[manga.attributes.originalLanguage] ||
    Object.values(manga.attributes.title)[0] ||
    'Unknown Title'
  )
}

function normalizeManga(manga: MDManga): SourceManga {
  const fileName = getCoverFileName(manga)
  const genres = manga.attributes.tags
    ?.map((t) => t.attributes.name.en)
    ?.filter(Boolean) || []
  return {
    id: manga.id,
    title: getMangaTitle(manga),
    cover: getCoverUrl(manga.id, fileName, '512'),
    status: manga.attributes.status,
    year: manga.attributes.year,
    contentRating: manga.attributes.contentRating,
    genres,
    description: manga.attributes.description.en || Object.values(manga.attributes.description)[0] || '',
    lastChapter: manga.attributes.lastChapter,
    lastVolume: manga.attributes.lastVolume,
  }
}

function normalizeMangaDetail(manga: MDManga): SourceMangaDetail {
  const base = normalizeManga(manga)
  const authors = manga.relationships
    ?.filter((r) => r.type === 'author')
    ?.map((r) => r.attributes?.name as string)
    ?.filter(Boolean) || []
  const artists = manga.relationships
    ?.filter((r) => r.type === 'artist')
    ?.map((r) => r.attributes?.name as string)
    ?.filter(Boolean) || []
  const genres = manga.attributes.tags
    ?.map((t) => t.attributes.name.en)
    ?.filter(Boolean) || []
  const altTitles = Object.values(manga.attributes.title).filter(
    (t) => t !== base.title
  )

  return {
    ...base,
    description:
      manga.attributes.description.en ||
      Object.values(manga.attributes.description)[0] ||
      '',
    authors,
    artists,
    genres,
    altTitles,
    originalLanguage: manga.attributes.originalLanguage,
    lastVolume: manga.attributes.lastVolume,
    lastChapter: manga.attributes.lastChapter,
  }
}

function normalizeChapter(ch: MDChapter): SourceChapter {
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
  }
}

// Source implementation
export const mangadexSource: MangaSource = {
  id: 'mangadex',
  name: 'MangaDex',
  type: 'api',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', '0')
    params.set('includes[]', 'cover_art')
    if (query) params.set('title', query)
    params.append('contentRating[]', 'safe')
    params.append('contentRating[]', 'suggestive')
    params.set('order[relevance]', 'desc')

    const res = await fetchMD<MDListResponse<MDManga>>(`/manga?${params.toString()}`)
    return res.data.map(normalizeManga)
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    const res = await fetchMD<MDResponse<MDManga>>(
      `/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`
    )
    if (!res.data) return null
    return normalizeMangaDetail(res.data)
  },

  async getChapters(
    mangaId: string,
    limit = 100,
    offset = 0,
    lang = 'en'
  ): Promise<SourceChapter[]> {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    params.set('translatedLanguage[]', lang)
    params.set('order[chapter]', 'desc')

    const res = await fetchMD<MDListResponse<MDChapter>>(
      `/manga/${mangaId}/feed?${params.toString()}`
    )
    return res.data.map(normalizeChapter)
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    const res = await fetchMD<{
      result: string
      baseUrl: string
      chapter: { hash: string; data: string[]; dataSaver: string[] }
    }>(`/at-home/server/${chapterId}`)

    const { baseUrl, chapter } = res
    return chapter.data.map((file, index) => ({
      url: `${baseUrl}/data/${chapter.hash}/${file}`,
      index,
    }))
  },
}
