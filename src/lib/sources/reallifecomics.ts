import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.reallifecomics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Real Life Comics fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

const MANGA_ID = 'reallife'

function slugToTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const reallifecomicsSource: MangaSource = {
  id: 'reallifecomics',
  name: 'Real Life Comics',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      const keywords = ['real life comics', 'real life', 'reallife']
      if (!keywords.some((k) => k.includes(q) || q.includes(k))) return []
      return [
        {
          id: MANGA_ID,
          title: 'Real Life Comics',
          cover: `${BASE_URL}/images/mobile/Logo.png`,
        },
      ]
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      if (mangaId !== MANGA_ID) return null
      return {
        id: MANGA_ID,
        title: 'Real Life Comics',
        cover: `${BASE_URL}/images/mobile/Logo.png`,
        description: 'A daily online comic about the normal lives of some abnormal people.',
        authors: ['Mae Dean'],
        artists: ['Mae Dean'],
        genres: ['Comedy', 'Slice of Life'],
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
      if (mangaId !== MANGA_ID) return []
      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      // Archive page lists year links; fetch most recent years first
      const archive$ = await fetchHTML(`${BASE_URL}/archive-mobile.php`)
      const years: number[] = []
      archive$('a[href*="archivepage-mobile.php?year="]').each((_, el) => {
        const href = archive$(el).attr('href') || ''
        const match = href.match(/year=(\d{4})/)
        if (match) years.push(parseInt(match[1]))
      })

      // Sort descending (newest first) and deduplicate
      const uniqueYears = [...new Set(years)].sort((a, b) => b - a)

      for (const year of uniqueYears) {
        if (chapters.length >= limit) break
        const year$ = await fetchHTML(`${BASE_URL}/archivepage-mobile.php?year=${year}`)

        year$('a[href*="/comic-mobile.php?comic="]').each((_, el) => {
          const href = year$(el).attr('href') || ''
          const match = href.match(/comic-mobile\.php\?comic=([^&"]+)/)
          const slug = match?.[1] || ''
          if (!slug || seen.has(slug)) return

          seen.add(slug)
          chapters.push({
            id: slug,
            chapterNumber: String(chapters.length + 1),
            title: slugToTitle(slug),
            volume: null,
            language: 'en',
            pages: 1,
            publishedAt: new Date().toISOString(),
            readableAt: new Date().toISOString(),
            externalUrl: null,
            isUnavailable: false,
          })
        })
      }

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/comic-mobile.php?comic=${chapterId}`)
      const pages: SourcePage[] = []
      const seen = new Set<string>()

      $('#comic img').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && !seen.has(src) && !src.includes('/images/mobile/') && !src.includes('/images/nav_')) {
          seen.add(src)
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
