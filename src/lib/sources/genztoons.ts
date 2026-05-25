import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://genztoons.org'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`GenzToons fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

export const genztoonsSource: MangaSource = {
  id: 'genztoons',
  name: 'GenzToons',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/search_series`)
      const results: SourceManga[] = []
      const lowerQuery = query.toLowerCase()

      $('button').each((_, el) => {
        const btn = $(el)
        const title = btn.attr('title')?.trim() || btn.attr('alt')?.trim() || ''
        
        if (title.toLowerCase().includes(lowerQuery)) {
          const a = btn.find('a').first()
          const href = a.attr('href') || ''
          const id = href.replace(/^\/series\//, '').replace(/\/$/, '')

          // Extract cover image from style attribute
          const coverDiv = a.find('[style*="background-image"]').first()
          const style = coverDiv.attr('style') || ''
          const match = style.match(/url\((.*?)\)/)
          let cover = match ? match[1] : '/images/placeholder.png'
          cover = cover.replace(/&amp;/g, '&')

          const status = btn.attr('data-status') || undefined

          if (id && title) {
            results.push({ id, title, cover, status })
          }
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/series/${mangaId}/`)
      const title = $('h1').text().trim()
      if (!title) return null

      // Extract cover image from custom --photoURL style attribute
      const coverDiv = $('.xl\\:flex-row, [class*="xl:flex-row"]').first().children().eq(0).find('[style*="--photoURL"]').first()
      const styleAttr = coverDiv.attr('style') || ''
      const match = styleAttr.match(/--photoURL\s*:\s*url\((.*?)\)/)
      let cover = match ? match[1] : '/images/placeholder.png'
      cover = cover.replace(/&amp;/g, '&')

      const description = $('#expand_content p').text().trim() || $('#expand_content').text().trim()

      const authors: string[] = []
      const artists: string[] = []
      let status: string | undefined

      $('div.font-medium').each((_, el) => {
        const label = $(el).find('span').text().trim().toLowerCase()
        const value = $(el).next().text().trim()
        if (label === 'author') authors.push(value)
        if (label === 'artist') artists.push(value)
        if (label === 'status') status = value.toLowerCase()
      })

      const genres: string[] = []
      $('a[href*="genre="]').each((_, el) => {
        genres.push($(el).text().replace(/,/g, '').trim())
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors,
        artists: artists.length > 0 ? artists : authors,
        genres,
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
      const $ = await fetchHTML(`${BASE_URL}/series/${mangaId}/`)
      const chapters: SourceChapter[] = []

      $('a[href*="/chapter/"]').each((_, el) => {
        const a = $(el)
        const text = a.text().trim()
        if (text !== 'Start Reading') {
          const href = a.attr('href') || ''
          const id = href.replace(/^\/chapter\//, '').replace(/\/$/, '')
          const alt = a.attr('alt') || ''
          const titleAttr = a.attr('title') || ''

          const match = titleAttr.match(/Chapter\s+(\d+(?:\.\d+)?)[\s:]?(.*)/i) || alt.match(/Chapter\s+(\d+(?:\.\d+)?)[\s:]?(.*)/i)
          const chapterNumber = match?.[1] || '0'
          const title = match?.[2]?.trim() || null

          const dateText = a.attr('d') || ''

          if (id) {
            chapters.push({
              id,
              chapterNumber,
              title,
              volume: null,
              language: 'en',
              pages: 0,
              publishedAt: dateText || new Date().toISOString(),
              readableAt: dateText || new Date().toISOString(),
              externalUrl: null,
              isUnavailable: false,
            })
          }
        }
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/chapter/${chapterId}/`)
      const pages: SourcePage[] = []

      $('.myImage').each((index, el) => {
        const uid = $(el).attr('uid')
        if (uid) {
          pages.push({
            url: `https://wsrv.nl/?url=cdn.meowing.org/uploads/${uid}`,
            index,
          })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
