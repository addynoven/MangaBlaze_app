import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://jolleycomics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`The Property of Hate fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const thepropertyofhateSource: MangaSource = {
  id: 'thepropertyofhate',
  name: 'The Property of Hate',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if (
        !'the property of hate tpoh jolley comics'.includes(q) &&
        !q.includes('property') &&
        !q.includes('hate') &&
        !q.includes('tpoh') &&
        !q.includes('jolley')
      ) {
        return []
      }
      return [
        {
          id: 'tpoh',
          title: 'The Property of Hate',
          cover: `${BASE_URL}/images/Index/tpoh.png`,
        },
      ].slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      if (mangaId !== 'tpoh') return null
      const $ = await fetchHTML(`${BASE_URL}/TPoH/`)
      const cover = $('meta[property="og:image"]').attr('content') || `${BASE_URL}/images/Index/tpoh.png`
      const description = $('meta[name="Description"]').attr('content')?.trim() ||
        'The wonderful world of Sarah Jolley!'

      return {
        id: mangaId,
        title: 'The Property of Hate',
        cover,
        status: 'ongoing',
        year: 2012,
        description,
        authors: ['Sarah Jolley'],
        artists: ['Sarah Jolley'],
        genres: ['Fantasy', 'Adventure'],
        altTitles: ['TPoH'],
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
      if (mangaId !== 'tpoh') return []
      // Fetch any TPoH page to get the full jumpbox
      const $ = await fetchHTML(`${BASE_URL}/TPoH/The_Hook/1`)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('.jumpbox option[value^="/TPoH/"]').each((_, el) => {
        const href = $(el).attr('value') || ''
        const id = href.replace('/TPoH/', '').replace(/^\/|\/$/g, '')
        if (!id || seen.has(id)) return
        seen.add(id)

        const title = $(el).text().trim() || id
        // Extract page number for chapterNumber
        const numMatch = title.match(/Page\s+(\d+)/i)
        const chapterNumber = numMatch?.[1] || id

        chapters.push({
          id,
          chapterNumber,
          title,
          volume: null,
          language: 'en',
          pages: 1,
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
      const url = `${BASE_URL}/TPoH/${chapterId}`
      const $ = await fetchHTML(url)

      let src = ''
      $('.comic_comic img').each((_, el) => {
        const s = $(el).attr('src') || ''
        if (s.includes('/comics/')) {
          src = s
          return false
        }
      })

      if (!src) {
        $('img').each((_, el) => {
          const s = $(el).attr('src') || ''
          if (s.includes('/comics/')) {
            src = s
            return false
          }
        })
      }

      if (!src) return []
      if (!src.startsWith('http')) {
        src = src.startsWith('//') ? `https:${src}` : `${BASE_URL}${src}`
      }
      return [{ url: src, index: 0 }]
    } catch {
      return []
    }
  },
}
