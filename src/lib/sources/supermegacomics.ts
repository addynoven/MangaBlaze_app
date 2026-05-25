import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.supermegacomics.com'
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
  if (!res.ok) throw new Error(`SUPER MEGA fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const supermegacomicsSource: MangaSource = {
  id: 'supermegacomics',
  name: 'SUPER MEGA',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if (!'super mega'.includes(q) && !q.includes('super') && !q.includes('mega')) {
        return []
      }
      return [{ id: 'supermega', title: 'SUPER MEGA', cover: `${BASE_URL}/SuperMegaBanner.png` }].slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      if (mangaId !== 'supermega') return null
      return {
        id: mangaId,
        title: 'SUPER MEGA',
        cover: `${BASE_URL}/SuperMegaBanner.png`,
        status: 'ongoing',
        year: null,
        description: 'SUPER MEGA comics by JohnnySmash.',
        authors: ['JohnnySmash'],
        artists: ['JohnnySmash'],
        genres: ['Comedy'],
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
    mangaId: string,
    limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      if (mangaId !== 'supermega') return []
      const $ = await fetchHTML(`${BASE_URL}/archive.html`)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      // Parse archive links like index.php?i=424
      $('a[href^="index.php?i="]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const match = href.match(/i=(\d+)/)
        const num = match?.[1]
        if (!num || seen.has(num)) return
        seen.add(num)

        chapters.push({
          id: num,
          chapterNumber: num,
          title: `Comic #${num}`,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      // Also include the latest from homepage if archive is incomplete
      if (chapters.length > 0) {
        const maxNum = Math.max(...chapters.map((c) => parseInt(c.id)))
        const homepage$ = await fetchHTML(`${BASE_URL}/index.php`)
        homepage$('img[src*="/images/"]').each((_, el) => {
          const src = homepage$(el).attr('src') || ''
          const imgMatch = src.match(/images\/(\d+)\.png/)
          if (imgMatch) {
            const num = imgMatch[1]
            if (!seen.has(num)) {
              seen.add(num)
              chapters.push({
                id: num,
                chapterNumber: num,
                title: `Comic #${num}`,
                volume: null,
                language: 'en',
                pages: 1,
                publishedAt: new Date().toISOString(),
                readableAt: new Date().toISOString(),
                externalUrl: null,
                isUnavailable: false,
              })
            }
          }
        })
      }

      return chapters.sort((a, b) => parseInt(b.id) - parseInt(a.id)).slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/index.php?i=${chapterId}`
      const $ = await fetchHTML(url)

      let src = ''
      $('img').each((_, el) => {
        const s = $(el).attr('src') || ''
        if (s.includes(`/images/${chapterId}.png`) || s.includes(`/images/${chapterId}.`)) {
          src = s
          return false
        }
      })

      if (!src) {
        // Fallback: look for any image that looks like a comic
        $('img').each((_, el) => {
          const s = $(el).attr('src') || ''
          if (s.includes('images/') && !s.includes('button') && !s.includes('banner') && !s.includes('divider')) {
            src = s
            return false
          }
        })
      }

      if (!src) return []
      if (!src.startsWith('http')) {
        src = src.startsWith('//') ? `https:${src}` : `${BASE_URL}/${src.replace(/^\//, '')}`
      }
      return [{ url: src, index: 0 }]
    } catch {
      return []
    }
  },
}
