import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://kuramanga.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`KuraManga fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/https:\/\/kuramanga\.com\/([a-z0-9-]+)/)
  return match?.[1] || ''
}

export const kuramangaSource: MangaSource = {
  id: 'kuramanga',
  name: 'KuraManga',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(BASE_URL)
      const html = await fetch(BASE_URL, {
        headers: { 'User-Agent': USER_AGENT },
      }).then((r) => r.text())

      // Extract JSON-LD ItemList from homepage
      const results: SourceManga[] = []
      const match = html.match(/"itemListElement":\s*(\[[^\]]+\])/)
      if (match) {
        let items: { url?: string; name?: string }[] = []
        try {
          items = JSON.parse(match[1])
        } catch {
          // fallback manual extraction
          const urlMatches = match[1].match(/"url":"https:\/\/kuramanga\.com\/[^"]+","name":"[^"]+"/g)
          if (urlMatches) {
            items = urlMatches.map((m) => {
              const url = m.match(/"url":"([^"]+)"/)?.[1] || ''
              const name = m.match(/"name":"([^"]+)"/)?.[1] || ''
              return { url, name }
            })
          }
        }

        const lowerQuery = query.toLowerCase()
        for (const item of items) {
          if (!item.url || !item.name) continue
          const slug = extractSlugFromUrl(item.url)
          if (!slug || results.some((r) => r.id === slug)) continue
          if (item.name.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: slug,
              title: item.name,
              cover: '/images/placeholder.png',
            })
          }
        }
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/${mangaId}`
      const html = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      }).then((r) => r.text())
      const $ = cheerio.load(html)

      // Title from <title> tag: "Name – Read Online | KuraManga"
      const titleMatch = html.match(/<title>([^<]+)\s+–\s+Read Online\s+\|\s+KuraManga<\/title>/)
      const title = titleMatch?.[1]?.trim() || ''
      if (!title) return null

      // Cover from preload link
      const coverMatch = html.match(/<link rel="preload" as="image" href="([^"]+)"/)
      const cover = coverMatch?.[1] || '/images/placeholder.png'

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description: '',
        authors: [],
        artists: [],
        genres: [],
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
      const $ = await fetchHTML(`${BASE_URL}/${mangaId}`)

      const chapters: SourceChapter[] = []
      $('a[href^="/' + mangaId + '/chapter-"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const match = href.match(/chapter-(\d+)/)
        const chapterNum = match?.[1] || ''
        if (!chapterNum || chapters.some((c) => c.id === `${mangaId}/chapter-${chapterNum}`)) return

        chapters.push({
          id: `${mangaId}/chapter-${chapterNum}`,
          chapterNumber: chapterNum,
          title: `Chapter ${chapterNum}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      // Sort by chapter number descending (newest first) then reverse
      chapters.sort((a, b) => parseFloat(b.chapterNumber) - parseFloat(a.chapterNumber))

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/${chapterId}`)

      const pages: SourcePage[] = []
      $('img').each((index, el) => {
        const src = $(el).attr('src')
        if (src && src.includes('shadowabyss.com')) {
          pages.push({ url: src, index })
        }
      })

      // Deduplicate by URL
      const seen = new Set<string>()
      return pages.filter((p) => {
        if (seen.has(p.url)) return false
        seen.add(p.url)
        return true
      })
    } catch {
      return []
    }
  },
}
