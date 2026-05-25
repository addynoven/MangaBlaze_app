import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://rcostation.xyz'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ReadComicOnline fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/Comic\/([^/?]+)/)
  return match?.[1] || ''
}

function extractIssueIdFromHref(href: string): string {
  const match = href.match(/\/Comic\/[^/]+\/([^?]+)\?id=(\d+)/)
  return match ? `${match[1]}?id=${match[2]}` : ''
}

export const readcomiconlineSource: MangaSource = {
  id: 'readcomiconline',
  name: 'ReadComicOnline',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const res = await fetch(`${BASE_URL}/Search/Comic`, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `keyword=${encodeURIComponent(query)}`,
        next: { revalidate: 300 },
      })
      if (!res.ok) return []
      const $ = cheerio.load(await res.text())

      const results: SourceManga[] = []
      $('.item-list .section.group.list').each((_, el) => {
        const item = $(el)
        const link = item.find('.col.cover a[href^="/Comic/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id || results.some((r) => r.id === id)) return

        const title = item.find('.col.info p a').first().text().trim()
        const cover = link.find('img').attr('src') || '/images/placeholder.png'

        if (title) {
          results.push({ id, title, cover })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/Comic/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('.content.space-top').first().find('.heading h3').text().trim()
      if (!title) return null

      const cover = $('link[rel="image_src"]').attr('href') ||
        $('.content.space-top').first().find('.col.cover img').attr('src') ||
        '/images/placeholder.png'

      // Description is in a <p><p style="text-align: justify;">...</p></p> block
      const description = $('.content.space-top .section.group p p[style*="justify"]').text().trim() ||
        $('.content.space-top .section.group p').text().trim() || ''

      const genres: string[] = []
      $('.content.space-top').first().find('.col.info a[href^="/Genre/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      const statusText = $('.content.space-top').first().find('.col.info span:contains("Status:")').parent().text()
      const statusMatch = statusText.match(/Status:\s*(\w+)/i)
      if (statusMatch) {
        const raw = statusMatch[1].toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(raw)) {
          status = raw
        }
      }

      // Extract writers as authors
      const authors: string[] = []
      $('.content.space-top').first().find('.col.info a[href^="/Writer/"]').each((_, el) => {
        authors.push($(el).text().trim())
      })

      // Extract artists
      const artists: string[] = []
      $('.content.space-top').first().find('.col.info a[href^="/Artist/"]').each((_, el) => {
        artists.push($(el).text().trim())
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
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
      const url = `${BASE_URL}/Comic/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []

      // Find the Issue(s) section
      let issueSection = $('div.heading:has(h3:contains("Issue(s)"))').closest('.content.space-top')
      if (!issueSection.length) {
        issueSection = $('h3:contains("Issue(s)"), h3:contains("Chapter(s)")').closest('.content.space-top')
      }

      issueSection.find('ul.list li').each((_, el) => {
        const li = $(el)
        const link = li.find('a[href^="/Comic/"]').first()
        const href = link.attr('href') || ''
        const id = extractIssueIdFromHref(href)
        if (!id || chapters.some((c) => c.id === id)) return

        const titleText = link.find('span').text().trim() || link.text().trim()
        const match = titleText.match(/Issue\s*#?\s*(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || titleText

        const dateText = li.find('.col-2 span').text().trim()
        const publishedAt = dateText ? new Date(dateText).toISOString() : new Date().toISOString()

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: `${BASE_URL}/Comic/${mangaId}/${id}`,
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
      const url = `${BASE_URL}/Comic/${chapterId}`
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      if (!res.ok) return []
      const html = await res.text()

      // Extract image URLs from obfuscated JavaScript
      const pages: SourcePage[] = []
      const seen = new Set<string>()

      // Match blogspot image URLs embedded in JS push() calls
      const regex = /https:\/\/2\.bp\.blogspot\.com\/[^'"\s)]+=s1600/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(html)) !== null) {
        let imageUrl = match[0]
        // Decode obfuscation: kv__WYemU7_ → d
        imageUrl = imageUrl.replace(/kv__WYemU7_/g, 'd')
        if (!seen.has(imageUrl)) {
          seen.add(imageUrl)
          pages.push({ url: imageUrl, index: pages.length })
        }
      }

      return pages
    } catch {
      return []
    }
  },
}
