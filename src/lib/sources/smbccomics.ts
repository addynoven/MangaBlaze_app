import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.smbc-comics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`SMBC fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const smbccomicsSource: MangaSource = {
  id: 'smbccomics',
  name: 'Saturday Morning Breakfast Cereal',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if (!'smbc saturday morning breakfast cereal'.includes(q) && !q.includes('smbc') && !q.includes('breakfast')) {
        return []
      }
      return [{ id: 'smbc', title: 'Saturday Morning Breakfast Cereal', cover: `${BASE_URL}/images/moblogo.webp` }].slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      if (mangaId !== 'smbc') return null
      const $ = await fetchHTML(BASE_URL)
      const cover = $('meta[property="og:image"]').attr('content') || `${BASE_URL}/images/moblogo.webp`
      const description = $('meta[name="description"]').attr('content')?.trim() ||
        'SMBC is a daily comic strip about life, philosophy, science, mathematics, and dirty jokes.'

      return {
        id: mangaId,
        title: 'Saturday Morning Breakfast Cereal',
        cover,
        status: 'ongoing',
        year: 2002,
        description,
        authors: ['Zach Weinersmith'],
        artists: ['Zach Weinersmith'],
        genres: ['Comedy', 'Slice of Life'],
        altTitles: ['SMBC'],
        originalLanguage: 'en',
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
      if (mangaId !== 'smbc') return []
      // The archive page is huge and sometimes returns 500; use RSS feed instead
      const res = await fetch(`${BASE_URL}/comic/rss`, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      if (!res.ok) throw new Error(`SMBC RSS fetch error: ${res.status}`)
      const xml = await res.text()
      const $ = cheerio.load(xml, { xmlMode: true })

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('item').each((_, el) => {
        const link = $(el).find('link').text().trim()
        const guid = $(el).find('guid').text().trim()
        const title = $(el).find('title').text().trim().replace(/^Saturday Morning Breakfast Cereal -\s*/i, '')
        const pubDate = $(el).find('pubDate').text().trim()

        const id = link.replace(`${BASE_URL}/comic/`, '').replace(/\/$/, '')
        if (!id || seen.has(id)) return
        seen.add(id)

        const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()

        chapters.push({
          id,
          chapterNumber: id,
          title: title || id,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: null,
          isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/comic/${chapterId}`)
      const img = $('#comic img').first()
      let src = img.attr('src')
      if (!src) {
        // Fallback: look for any comic image
        $('img').each((_, el) => {
          const s = $(el).attr('src')
          if (s && s.includes('/comics/')) {
            src = s
            return false
          }
        })
      }
      if (!src) return []
      return [{ url: src.startsWith('//') ? `https:${src}` : src, index: 0 }]
    } catch {
      return []
    }
  },
}
