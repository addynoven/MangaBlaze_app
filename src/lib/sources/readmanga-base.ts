import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface ReadMangaConfig {
  id: string
  name: string
  baseUrl: string
}

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function normalizeUrl(href: string, baseUrl: string): string {
  if (href.startsWith('http')) return href
  if (href.startsWith('//')) return `https:${href}`
  return `${baseUrl}${href}`
}

function sameDomain(href: string, baseUrl: string): boolean {
  try {
    const url = new URL(href, baseUrl)
    const base = new URL(baseUrl)
    return url.hostname === base.hostname
  } catch {
    return false
  }
}

function extractMangaSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function extractChapterSlugFromHref(href: string): string {
  const match = href.match(/\/chapter\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export function createReadMangaSource(config: ReadMangaConfig): MangaSource {
  const { id, name, baseUrl } = config

  return {
    id,
    name,
    type: 'scraper',

    async search(query: string, limit = 20): Promise<SourceManga[]> {
      try {
        const $ = await fetchHTML(baseUrl + '/')
        const slugs: string[] = []
        const seen = new Set<string>()

        $('a[href*="/manga/"]').each((_, el) => {
          const href = $(el).attr('href') || ''
          const absolute = normalizeUrl(href, baseUrl)
          if (!sameDomain(absolute, baseUrl)) return

          const slug = extractMangaSlugFromHref(absolute)
          if (!slug || seen.has(slug)) return
          seen.add(slug)
          slugs.push(slug)
        })

        // Enrich first 'limit * 3' slugs from detail pages so we have real titles
        const toEnrich = slugs.slice(0, limit * 3)
        const results: SourceManga[] = []

        await Promise.all(
          toEnrich.map(async (slug) => {
            try {
              const manga$ = await fetchHTML(`${baseUrl}/manga/${slug}/`)
              const pageTitle = manga$('h1.my-3.font-bold').first().text().trim()
              if (!pageTitle) return
              const cover =
                manga$('meta[property="og:image"]').attr('content') ||
                manga$('img[style*="width: 300px"]').attr('src') ||
                '/images/placeholder.png'
              results.push({ id: slug, title: pageTitle, cover })
            } catch {
              // skip
            }
          })
        )

        const filtered = results.filter(
          (r) => !query || r.title.toLowerCase().includes(query.toLowerCase())
        )
        return filtered.slice(0, limit)
      } catch {
        return []
      }
    },

    async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
      try {
        const url = `${baseUrl}/manga/${mangaId}/`
        const $ = await fetchHTML(url)

        const title = $('h1.my-3.font-bold').first().text().trim()
        if (!title) return null

        const cover =
          $('img[style*="width: 300px"]').attr('src') ||
          $('meta[property="og:image"]').attr('content') ||
          '/images/placeholder.png'

        let description = $('div.text-text-muted').first().text().trim()
        // If the first match is too short it's probably a chapter title, not a synopsis
        if (!description || description.length < 30) {
          const metaDesc = $('meta[property="og:description"]').attr('content') || ''
          if (metaDesc.length > description.length) description = metaDesc
        }

        return {
          id: mangaId,
          title,
          cover,
          status: undefined,
          year: null,
          description: description || '',
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
        const url = `${baseUrl}/manga/${mangaId}/`
        const $ = await fetchHTML(url)

        const chapters: SourceChapter[] = []
        const seen = new Set<string>()

        $('a[href*="/chapter/"]').each((_, el) => {
          const link = $(el)
          const href = link.attr('href') || ''
          const absolute = normalizeUrl(href, baseUrl)
          if (!sameDomain(absolute, baseUrl)) return

          const slug = extractChapterSlugFromHref(absolute)
          if (!slug || seen.has(slug)) return
          seen.add(slug)

          const titleText = link.text().trim()
          const match = titleText.match(/Chapter\s+([\d.]+)/i)
          const chapterNumber = match?.[1] || '?'

          chapters.push({
            id: slug,
            chapterNumber,
            title: titleText,
            volume: null,
            language: 'en',
            pages: 0,
            publishedAt: new Date().toISOString(),
            readableAt: new Date().toISOString(),
            externalUrl: absolute,
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
        const url = `${baseUrl}/chapter/${chapterId}/`
        const $ = await fetchHTML(url)

        const pages: SourcePage[] = []
        $('img.js-page').each((index, el) => {
          let src = $(el).attr('data-src') || $(el).attr('src') || ''
          if (src.startsWith('data:')) {
            src = $(el).attr('src') || ''
            if (src.startsWith('data:')) src = ''
          }
          if (
            src &&
            (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))
          ) {
            pages.push({ url: src.trim(), index })
          }
        })

        pages.sort((a, b) => a.index - b.index)
        return pages.map((p, i) => ({ ...p, index: i }))
      } catch {
        return []
      }
    },
  }
}
