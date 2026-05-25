import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hachirumi.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Hachirumi fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Hachirumi API error: ${res.status} ${url}`)
  return res.json() as Promise<T>
}

interface HachirumiChapter {
  volume: string
  title: string
  folder: string
  groups: Record<string, string[]>
  release_date: Record<string, number>
}

interface HachirumiSeries {
  slug: string
  title: string
  description: string
  author: string
  artist: string
  groups: Record<string, string>
  cover: string
  preferred_sort: string[]
  chapters: Record<string, HachirumiChapter>
}

export const hachirumiSource: MangaSource = {
  id: 'hachirumi',
  name: 'Hachirumi',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/series/`)
      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('a[href^="/read/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slug = href.replace('/read/manga/', '').replace(/\/$/, '')
        if (!slug || seen.has(slug)) return

        let title = link.text().trim()
        if (!title) {
          const img = link.find('img')
          const alt = img.attr('alt') || ''
          const match = alt.match(/Cover for (.+)/i)
          title = match?.[1] || alt
        }
        if (!title) return

        const cover =
          link.find('img').attr('src') ||
          link.find('img').attr('data-src') ||
          '/images/placeholder.png'

        seen.add(slug)
        results.push({ id: slug, title, cover })
      })

      const q = query.toLowerCase()
      const filtered = results.filter(
        (r) => r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
      )

      return filtered.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const data = await fetchJSON<HachirumiSeries>(`${BASE_URL}/api/series/${mangaId}/`)
      if (!data || !data.title) return null

      const cover = data.cover?.startsWith('/')
        ? `${BASE_URL}${data.cover}`
        : data.cover || '/images/placeholder.png'

      const genres: string[] = []

      return {
        id: mangaId,
        title: data.title,
        cover,
        status: undefined,
        year: null,
        description: data.description || '',
        authors: data.author ? [data.author] : [],
        artists: data.artist ? [data.artist] : [],
        genres: [...new Set(genres)],
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
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const data = await fetchJSON<HachirumiSeries>(`${BASE_URL}/api/series/${mangaId}/`)
      if (!data || !data.chapters) return []

      const chapters: SourceChapter[] = []
      const sortedKeys = Object.keys(data.chapters).sort(
        (a, b) => parseFloat(a) - parseFloat(b)
      )

      for (const key of sortedKeys) {
        const ch = data.chapters[key]
        const groupKeys = Object.keys(ch.groups)
        const groupId = groupKeys[0] || '1'
        const pages = ch.groups[groupId]?.length || 0
        const releaseTs = ch.release_date?.[groupId]
        const publishedAt = releaseTs
          ? new Date(releaseTs * 1000).toISOString()
          : new Date().toISOString()

        chapters.push({
          id: `${mangaId}/${key}`,
          chapterNumber: key,
          title: ch.title || `Chapter ${key}`,
          volume: ch.volume || null,
          language: 'en',
          pages,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: null,
          isUnavailable: false,
        })
      }

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const parts = chapterId.split('/')
      if (parts.length < 2) return []
      const mangaId = parts.slice(0, -1).join('/')
      const chapterNumber = parts[parts.length - 1]

      const data = await fetchJSON<HachirumiSeries>(`${BASE_URL}/api/series/${mangaId}/`)
      if (!data || !data.chapters) return []

      const ch = data.chapters[chapterNumber]
      if (!ch) return []

      const groupKeys = Object.keys(ch.groups)
      const groupId = groupKeys[0] || '1'
      const filenames = ch.groups[groupId] || []
      const folder = ch.folder

      const pages: SourcePage[] = []
      for (let i = 0; i < filenames.length; i++) {
        pages.push({
          url: `${BASE_URL}/media/manga/${mangaId}/chapters/${folder}/${groupId}/${filenames[i]}`,
          index: i,
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
