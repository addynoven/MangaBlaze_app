import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://comikey.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Comikey fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Comikey fetch error: ${res.status} ${url}`)
  return res.json()
}

function extractIdFromUrl(url: string): { id: string; slug: string } | null {
  const match = url.match(/\/comics\/([^/]+)\/(\d+)\/?$/)
  if (!match) return null
  return { slug: match[1], id: match[2] }
}

function parseRSS(xml: string): SourceChapter[] {
  const chapters: SourceChapter[] = []
  const itemRegex = /<item>[\s\S]*?<\/item>/g
  let itemMatch
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const item = itemMatch[0]
    const titleMatch = item.match(/<title>([^<]*)<\/title>/)
    const linkMatch = item.match(/<link>([^<]*)<\/link>/)
    const pubDateMatch = item.match(/<pubDate>([^<]*)<\/pubDate>/)

    const title = titleMatch?.[1]?.trim() || ''
    const link = linkMatch?.[1]?.trim() || ''
    const pubDate = pubDateMatch?.[1]?.trim() || ''

    // Extract chapter ID from link like https://comikey.com/read/slug/EPIID/chapter-x/
    const idMatch = link.match(/\/read\/[^/]+\/([^/]+)\//)
    const id = idMatch?.[1] || link

    // Extract chapter number from title like "Chapter 4.2: END"
    const numMatch = title.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
    const chapterNumber = numMatch?.[1] || '?'

    chapters.push({
      id,
      chapterNumber,
      title,
      volume: null,
      language: 'en',
      pages: 0,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      readableAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      externalUrl: link,
      isUnavailable: false,
    })
  }
  return chapters
}

export const comikeySource: MangaSource = {
  id: 'comikey',
  name: 'Comikey',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/comics/suggestions.json?q=${encodeURIComponent(query)}`
      const data = await fetchJSON(url) as [string, string[], string[], string[], number[]]
      if (!Array.isArray(data) || data.length < 4) return []

      const titles = data[1] || []
      const descriptions = data[2] || []
      const urls = data[3] || []

      const results: SourceManga[] = []
      for (let i = 0; i < titles.length; i++) {
        const extracted = extractIdFromUrl(urls[i] || '')
        if (!extracted) continue

        const id = extracted.id
        if (results.some((r) => r.id === id)) continue

        results.push({
          id,
          title: titles[i],
          cover: '/images/placeholder.png',
          description: descriptions[i] || undefined,
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      // First try search to find the slug
      const searchUrl = `${BASE_URL}/comics/suggestions.json?q=${encodeURIComponent(mangaId)}`
      const searchData = await fetchJSON(searchUrl) as [string, string[], string[], string[], number[]]
      let slug = ''
      if (Array.isArray(searchData) && searchData.length >= 4) {
        const urls = searchData[3] || []
        for (const url of urls) {
          const extracted = extractIdFromUrl(url)
          if (extracted && extracted.id === mangaId) {
            slug = extracted.slug
            break
          }
        }
      }

      if (!slug) {
        // Fallback: try to find slug by browsing comics page
        const $browse = await fetchHTML(`${BASE_URL}/comics/`)
        $browse('a[href^="/comics/"]').each((_, el) => {
          const href = $browse(el).attr('href') || ''
          const extracted = extractIdFromUrl(`${BASE_URL}${href}`)
          if (extracted && extracted.id === mangaId) {
            slug = extracted.slug
          }
        })
      }

      if (!slug) return null

      const url = `${BASE_URL}/comics/${slug}/${mangaId}/`
      const $ = await fetchHTML(url)

      const comicScript = $('#comic').first().html()
      if (!comicScript) return null

      const comic = JSON.parse(comicScript)
      const title = comic.name || ''
      if (!title) return null

      const cover = comic.cover
        ? (comic.cover.startsWith('http') ? comic.cover : `${BASE_URL}${comic.cover}`)
        : '/images/placeholder.png'

      const description = comic.description || comic.excerpt || ''
      const genres: string[] = (comic.tags || []).map((t: { name: string }) => t.name)
      const authors: string[] = (comic.author || []).map((a: { name: string }) => a.name)
      const artists: string[] = (comic.artist || []).map((a: { name: string }) => a.name)

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: comic.alt ? [comic.alt] : [],
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
      const rssUrl = `${BASE_URL}/sapi/comics/${mangaId}/feed.rss`
      const res = await fetch(rssUrl, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      if (!res.ok) return []
      const xml = await res.text()
      const chapters = parseRSS(xml)
      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    // Comikey uses a proprietary reader (gate.epub.rocks) - pages are not scrapable
    return []
  },
}
