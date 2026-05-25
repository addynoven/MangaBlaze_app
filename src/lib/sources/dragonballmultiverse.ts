import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.dragonball-multiverse.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`DBMultiverse fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

async function getLastPageNumber(): Promise<number> {
  const $ = await fetchHTML(`${BASE_URL}/en/page-1.html`)
  const lastHref = $('link[rel="Last"]').attr('href') || ''
  const match = lastHref.match(/page-(\d+)\.html/)
  return match ? parseInt(match[1], 10) : 2690
}

export const dragonballmultiverseSource: MangaSource = {
  id: 'dragonballmultiverse',
  name: 'Dragon Ball Multiverse',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if (!q || 'dragon ball multiverse'.includes(q) || q.includes('dragon') || q.includes('ball') || q.includes('multiverse')) {
        return [
          {
            id: 'dbmultiverse',
            title: 'Dragon Ball Multiverse',
            cover: 'https://www.dragonball-multiverse.com/imgs/promos/logo-for-share4.jpg',
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
        id: 'dbmultiverse',
        title: 'Dragon Ball Multiverse',
        cover: 'https://www.dragonball-multiverse.com/imgs/promos/logo-for-share4.jpg',
        status: 'ongoing',
        year: null,
        description: 'An Online Comic: Dragon Ball Multiverse based on DBZ. A fan-made sequel exploring multiple universes.',
        authors: ['Salagir'],
        artists: [],
        genres: ['Action', 'Fantasy', 'Fan Comic'],
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
    offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const lastPage = await getLastPageNumber()
      const chapters: SourceChapter[] = []

      for (let page = 0; page <= lastPage; page++) {
        chapters.push({
          id: String(page),
          chapterNumber: String(page),
          title: `Page ${page}`,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: `${BASE_URL}/en/page-${page}.html`,
          isUnavailable: false,
        })
      }

      return chapters.slice(offset, offset + limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/en/page-${chapterId}.html`)
      const img = $('#balloonsimg img').first()
      const src = img.attr('src')?.trim()
      if (src && src.includes('image.php')) {
        return [{ url: `${BASE_URL}${src}`, index: 0 }]
      }
      return []
    } catch {
      return []
    }
  },
}
