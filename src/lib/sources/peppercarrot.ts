import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.peppercarrot.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`PepperCarrot fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractEpisodeIdFromHref(href: string): string {
  const match = href.match(/\/webcomic\/(ep\d+_[^/]+)\.html/)
  return match?.[1] || ''
}

function extractEpisodeNumber(id: string): string {
  const match = id.match(/^ep(\d+)/)
  return match?.[1] || '?'
}

export const peppercarrotSource: MangaSource = {
  id: 'peppercarrot',
  name: 'Pepper&Carrot',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if (!q || 'pepper carrot'.includes(q) || q.includes('pepper') || q.includes('carrot')) {
        return [
          {
            id: 'peppercarrot',
            title: 'Pepper&Carrot',
            cover: 'https://www.peppercarrot.com/0_sources/0ther/artworks/low-res/2016-11-14_vertical-cover-book-two_screen_by-David-Revoy.jpg',
          },
        ]
      }
      return []
    } catch {
      return []
    }
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      return {
        id: 'peppercarrot',
        title: 'Pepper&Carrot',
        cover: 'https://www.peppercarrot.com/0_sources/0ther/artworks/low-res/2016-11-14_vertical-cover-book-two_screen_by-David-Revoy.jpg',
        status: 'ongoing',
        year: null,
        description:
          'A free (libre) and open-source webcomic about Pepper, a young witch and her cat, Carrot. They live in a fantasy universe of potions, magic, and creatures.',
        authors: ['David Revoy'],
        artists: ['David Revoy'],
        genres: ['Fantasy', 'Comedy', 'Adventure'],
        altTitles: [],
        originalLanguage: 'en',
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(
    _mangaId: string,
    limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/en/webcomics/peppercarrot.html`)
      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('a[href*="/webcomic/ep"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const id = extractEpisodeIdFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const episodeNum = extractEpisodeNumber(id)
        const titleRaw = id.replace(/^ep\d+_/, '').replace(/-/g, ' ')
        const title = titleRaw
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')

        chapters.push({
          id,
          chapterNumber: episodeNum,
          title: `Episode ${episodeNum}: ${title}`,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: `${BASE_URL}/en/webcomic/${id}.html`,
          isUnavailable: false,
        })
      })

      // Sort by episode number ascending
      chapters.sort((a, b) => parseInt(a.chapterNumber, 10) - parseInt(b.chapterNumber, 10))

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/en/webcomic/${chapterId}.html`)
      const src = $('img.comicpage').first().attr('src')?.trim()
      if (src) {
        return [{ url: src, index: 0 }]
      }
      return []
    } catch {
      return []
    }
  },
}
