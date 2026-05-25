import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://readberserk.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ReadBerserk fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function titleCaseFromSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const readberserkSource: MangaSource = {
  id: 'readberserk',
  name: 'Read Berserk',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(BASE_URL)
      const q = query.toLowerCase()

      const known: { id: string; title: string; cover: string }[] = [
        { id: 'berserk', title: 'Berserk', cover: 'https://readberserk.com/wp-content/uploads/2017/06/berserk.jpg' },
      ]

      $("a[href^='https://readberserk.com/manga/']").each((_, el) => {
        const href = $(el).attr('href') || ''
        const id = href.replace(`${BASE_URL}/manga/`, '').replace(/\/$/, '')
        const title = $(el).text().trim()
        if (id && title && !known.some((k) => k.id === id)) {
          known.push({ id, title, cover: '/images/placeholder.png' })
        }
      })

      const results = known
        .filter((k) => k.title.toLowerCase().includes(q) || k.id.toLowerCase().includes(q))
        .map((k) => ({ id: k.id, title: k.title, cover: k.cover }))

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title =
        $('h2.mb-0 span').first().text().trim() ||
        $('h1').first().text().trim() ||
        titleCaseFromSlug(mangaId)
      if (!title) return null

      const cover =
        $('meta[property="og:image"]').attr('content') ||
        $('.card-img-right').attr('src') ||
        '/images/placeholder.png'

      const description = $('.card-text p').first().text().trim()

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
        artists: [],
        genres: [],
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('table tr, .card').each((_, el) => {
        const link = $(el).find('a[href*="/chapter/"]').first()
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/chapter\/(.+)\/$/)
        const id = idMatch?.[1] || ''
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText =
          $(el).find('td').first().text().trim() ||
          $(el).find('.card-title').text().trim() ||
          link.text().trim()

        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || id.match(/chapter-(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/chapter/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.pages__img').each((index, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src')
        if (src && !src.includes('data:image') && !src.includes('base64')) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
