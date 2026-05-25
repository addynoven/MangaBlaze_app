import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://readbagabondo.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

export const readvagabondSource: MangaSource = {
  id: 'readvagabond',
  name: 'Read Vagabond Manga',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    if (!query || query.toLowerCase().includes('vagabond')) {
      return [
        {
          id: 'vagabond',
          title: 'Vagabond',
          cover: `${BASE_URL}/Musashi_Eating.webp`,
        },
      ]
    }
    return []
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    if (mangaId !== 'vagabond') return null
    try {
      const $ = await fetchHTML(BASE_URL + '/')
      const title = 'Vagabond'
      const cover = `${BASE_URL}/Musashi_Eating.webp`
      const description = $('p.text-gray-500.dark\\:text-neutral-400').first().text().trim()

      return {
        id: mangaId,
        title,
        cover,
        status: 'completed',
        year: 1998,
        description: description || 'Takehiko Inoue\'s masterpiece.',
        authors: ['Takehiko Inoue'],
        artists: ['Takehiko Inoue'],
        genres: ['Action', 'Adventure', 'Drama', 'Historical', 'Samurai', 'Seinen'],
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
    if (mangaId !== 'vagabond') return []
    try {
      const $ = await fetchHTML(BASE_URL + '/')
      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      const volumeLinks: string[] = []
      $('a[href^="/volume-"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (href && !volumeLinks.includes(href)) volumeLinks.push(href)
      })

      await Promise.all(
        volumeLinks.map(async (volHref) => {
          try {
            const vol$ = await fetchHTML(`${BASE_URL}${volHref}`)
            vol$(`a[href^="${volHref}/chapter-"]`).each((_, el) => {
              const href = vol$(el).attr('href') || ''
              const id = href.replace(/^\//, '')
              if (!id || seen.has(id)) return
              seen.add(id)

              const text = vol$(el).text().trim()
              const numMatch = text.match(/Ch\.?\s*(\d+)/i) || id.match(/chapter-(\d+)/i)
              const chapterNumber = numMatch?.[1] || '?'

              chapters.push({
                id,
                chapterNumber,
                title: text || `Chapter ${chapterNumber}`,
                volume: null,
                language: 'en',
                pages: 0,
                publishedAt: new Date().toISOString(),
                readableAt: new Date().toISOString(),
                externalUrl: `${BASE_URL}${href}`,
                isUnavailable: false,
              })
            })
          } catch {
            // ignore volume fetch errors
          }
        })
      )

      chapters.sort((a, b) => {
        const na = parseFloat(a.chapterNumber) || 0
        const nb = parseFloat(b.chapterNumber) || 0
        return na - nb
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('main img').each((index, el) => {
        const src = $(el).attr('src')
        if (src && src.includes('bucket.readbagabondo.com')) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages.map((p, i) => ({ ...p, index: i }))
    } catch {
      return []
    }
  },
}
