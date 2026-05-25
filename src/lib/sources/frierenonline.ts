import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.frieren.online'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const MANGA_ID = 'frieren'
const MANGA_TITLE = "Frieren: Beyond Journey's End"
const MANGA_COVER = 'https://www.frieren.online/wp-content/uploads/2022/01/Frieren-Beyond-Journeys-End-Manga.jpg'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Frieren Online fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

export const frierenonlineSource: MangaSource = {
  id: 'frierenonline',
  name: 'Frieren Online',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      // Single-manga site; return the one manga if query matches or is empty
      const q = query.toLowerCase()
      if (q && !q.includes('frieren') && !q.includes('sousou')) {
        return []
      }
      return [{ id: MANGA_ID, title: MANGA_TITLE, cover: MANGA_COVER }].slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const $ = await fetchHTML(BASE_URL)

      const title = $('h1, h2').filter((_, el) => $(el).text().includes('Frieren')).first().text().trim() || MANGA_TITLE

      const cover =
        $('.summary_image img, .profile-manga img').attr('data-src') ||
        $('.summary_image img, .profile-manga img').attr('src') ||
        MANGA_COVER

      const description = $('.synopsis p').first().text().trim()

      const genres: string[] = []
      $('a[href*="/manga-genre/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.post-status .summary-content, .mg_status .summary-content, .info .col-xl-3 h4').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
          status = text
        }
      })

      const authors: string[] = []
      $('a[href*="/manga-author/"]').each((_, el) => {
        authors.push($(el).text().trim())
      })

      const artists: string[] = []
      $('a[href*="/manga-artist/"]').each((_, el) => {
        artists.push($(el).text().trim())
      })

      return {
        id: MANGA_ID,
        title,
        cover,
        status,
        year: null,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: ['Sousou no Frieren'],
        originalLanguage: 'ja',
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
      const $ = await fetchHTML(BASE_URL)

      const chapters: SourceChapter[] = []
      $('.listing-chapters_wrap a[href*="/manga/sousou-no-frieren-chapter-"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const match = href.match(/\/manga\/(sousou-no-frieren-chapter-\d+)\/?$/)
        const id = match?.[1] || ''
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const numMatch = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = numMatch?.[1] || '?'

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
      const url = `${BASE_URL}/manga/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.wp-manga-chapter-img').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
