import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://en.to-corona-ex.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Corona EX fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractNextData($: cheerio.CheerioAPI): unknown {
  const script = $('#__NEXT_DATA__').first().html()
  if (!script) return null
  return JSON.parse(script)
}

interface CoronaComic {
  id: string
  title: string
  title_alphanumeric: string
  cover_image_url: string
  description: string
  description_tag: string
  authors: { name: string; role: string }[]
  latest_episode?: {
    id: string
    title: string
    episode_order: number
    episode_status: string
    published_at: string
  }
}

export const coronaexSource: MangaSource = {
  id: 'coronaex',
  name: 'Corona EX',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/comics`)
      const nextData = extractNextData($) as {
        props?: { pageProps?: { fallbackData?: { comics?: { resources: CoronaComic[] } } } }
      } | null

      const comics = nextData?.props?.pageProps?.fallbackData?.comics?.resources || []
      const q = query.toLowerCase()

      const results: SourceManga[] = []
      for (const comic of comics) {
        if (!comic.title.toLowerCase().includes(q) && !comic.title_alphanumeric.toLowerCase().includes(q)) {
          continue
        }
        if (results.some((r) => r.id === comic.id)) continue

        results.push({
          id: comic.id,
          title: comic.title,
          cover: comic.cover_image_url || '/images/placeholder.png',
          description: comic.description || undefined,
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/comics/${mangaId}`)
      const nextData = extractNextData($) as {
        props?: { pageProps?: { fallbackData?: { comic?: CoronaComic } } }
      } | null

      const comic = nextData?.props?.pageProps?.fallbackData?.comic
      if (!comic) return null

      const title = comic.title
      if (!title) return null

      const authors = comic.authors?.filter((a) => a.role === 'Manga' || a.role === 'Original Story').map((a) => a.name) || []

      return {
        id: mangaId,
        title,
        cover: comic.cover_image_url || '/images/placeholder.png',
        status: undefined,
        year: null,
        description: comic.description || '',
        authors: [...new Set(authors)],
        artists: [...new Set(authors)],
        genres: [],
        altTitles: [comic.title_alphanumeric],
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter: comic.latest_episode?.title || null,
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
      const $ = await fetchHTML(`${BASE_URL}/comics/${mangaId}`)
      const nextData = extractNextData($) as {
        props?: { pageProps?: { fallbackData?: { comic?: CoronaComic } } }
      } | null

      const latest = nextData?.props?.pageProps?.fallbackData?.comic?.latest_episode
      if (!latest) return []

      const chapters: SourceChapter[] = []
      const chapterNumber = String(latest.episode_order)
      chapters.push({
        id: latest.id,
        chapterNumber,
        title: latest.title || `Chapter ${chapterNumber}`,
        volume: null,
        language: 'en',
        pages: 0,
        publishedAt: latest.published_at ? new Date(latest.published_at).toISOString() : new Date().toISOString(),
        readableAt: latest.published_at ? new Date(latest.published_at).toISOString() : new Date().toISOString(),
        externalUrl: `${BASE_URL}/episodes/${latest.id}`,
        isUnavailable: latest.episode_status !== 'free_viewing',
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/episodes/${chapterId}`)
      const nextData = extractNextData($) as {
        props?: {
          pageProps?: {
            metaInfo?: {
              pages?: { id: string; page_image_url: string; episode_id: string }[]
            }
          }
        }
      } | null

      const pages = nextData?.props?.pageProps?.metaInfo?.pages || []
      return pages.map((p, index) => ({
        url: p.page_image_url,
        index,
      }))
    } catch {
      return []
    }
  },
}
