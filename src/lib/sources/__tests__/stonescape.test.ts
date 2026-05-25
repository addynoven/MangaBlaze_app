import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { stonescapeSource } from '../stonescape'

const mockSearchJson = {
  data: [
    {
      seriesId: 'c253cf93-5d05-4a0e-a001-16f66fa22fa4',
      title: 'You’re the Only One I Can See',
      slug: 'only-see-you',
      coverUrl: '/pub/covers/77a55c9a-22d7-45dc-92b6-fce6aaa68dc7.webp',
      publicationStatus: 'ongoing',
      genres: ['comedy', 'romance', 'schoollife', 'webtoons'],
      author: 'Chaegun',
      artist: 'Dodge',
      description: 'Following the advice of his imaginary friend Jason...'
    }
  ],
  pagination: {
    totalPages: 1,
    currentPage: 1
  }
}

const mockDetailJson = {
  seriesId: 'c253cf93-5d05-4a0e-a001-16f66fa22fa4',
  title: 'You’re the Only One I Can See',
  slug: 'only-see-you',
  coverUrl: '/pub/covers/77a55c9a-22d7-45dc-92b6-fce6aaa68dc7.webp',
  description: 'Following the advice of his imaginary friend Jason...',
  publicationStatus: 'ongoing',
  genres: ['comedy', 'romance', 'schoollife', 'webtoons'],
  author: 'Chaegun',
  artist: 'Dodge',
  countryOfOrigin: 'kr'
}

const mockChaptersJson = {
  chapters: [
    {
      chapterId: '74c9977e-1fef-4b90-bf61-a2b4e3fb9d44',
      chapterNumber: '1.00',
      title: 'Introduction',
      releaseDate: null,
      createdAt: '2026-04-04T15:53:40.648Z'
    }
  ]
}

const mockPagesJson = {
  pages: [
    {
      pageId: '56b52721-f73d-4e25-866c-438b69678a35',
      pageNumber: 1,
      url: '/pub/manhwa/c253cf93-5d05-4a0e-a001-16f66fa22fa4/74c9977e-1fef-4b90-bf61-a2b4e3fb9d44/a5cdc992-1213-42e6-b6fd-d9e53528c655.webp',
      width: 690,
      height: 8325
    }
  ],
  noteBeforeHtml: null,
  noteAfterHtml: null
}

const server = setupServer(
  http.get('https://stonescape.xyz/api/series', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    if (search === 'stone') {
      return HttpResponse.json(mockSearchJson)
    }
    return HttpResponse.json({ data: [], pagination: { totalPages: 0, currentPage: 1 } })
  }),

  http.get('https://stonescape.xyz/api/series/by-slug/only-see-you', () => {
    return HttpResponse.json(mockDetailJson)
  }),

  http.get('https://stonescape.xyz/api/series/by-slug/only-see-you/chapters', () => {
    return HttpResponse.json(mockChaptersJson)
  }),

  http.get('https://stonescape.xyz/api/chapters/74c9977e-1fef-4b90-bf61-a2b4e3fb9d44/pages', () => {
    return HttpResponse.json(mockPagesJson)
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('StoneScape Scraper Source', () => {
  it('should search for series catalog successfully', async () => {
    const results = await stonescapeSource.search('stone')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('only-see-you')
    expect(results[0].title).toBe('You’re the Only One I Can See')
    expect(results[0].cover).toBe('https://stonescape.xyz/pub/covers/77a55c9a-22d7-45dc-92b6-fce6aaa68dc7.webp')
    expect(results[0].status).toBe('ongoing')
    expect(results[0].genres).toEqual(['comedy', 'romance', 'schoollife', 'webtoons'])
  })

  it('should get manga details successfully', async () => {
    const detail = await stonescapeSource.getManga('only-see-you')
    expect(detail).not.toBeNull()
    expect(detail?.title).toBe('You’re the Only One I Can See')
    expect(detail?.cover).toBe('https://stonescape.xyz/pub/covers/77a55c9a-22d7-45dc-92b6-fce6aaa68dc7.webp')
    expect(detail?.description).toBe('Following the advice of his imaginary friend Jason...')
    expect(detail?.authors).toEqual(['Chaegun'])
    expect(detail?.artists).toEqual(['Dodge'])
    expect(detail?.status).toBe('ongoing')
    expect(detail?.genres).toEqual(['comedy', 'romance', 'schoollife', 'webtoons'])
    expect(detail?.originalLanguage).toBe('kr')
  })

  it('should get manga chapters successfully', async () => {
    const chapters = await stonescapeSource.getChapters('only-see-you')
    expect(chapters).toHaveLength(1)
    expect(chapters[0].id).toBe('74c9977e-1fef-4b90-bf61-a2b4e3fb9d44')
    expect(chapters[0].chapterNumber).toBe('1') // Float parsed formatted string
    expect(chapters[0].title).toBe('Introduction')
    expect(chapters[0].publishedAt).toBe('2026-04-04T15:53:40.648Z')
  })

  it('should get chapter page list successfully', async () => {
    const pages = await stonescapeSource.getChapterPages('74c9977e-1fef-4b90-bf61-a2b4e3fb9d44')
    expect(pages).toHaveLength(1)
    expect(pages[0].url).toBe('https://stonescape.xyz/pub/manhwa/c253cf93-5d05-4a0e-a001-16f66fa22fa4/74c9977e-1fef-4b90-bf61-a2b4e3fb9d44/a5cdc992-1213-42e6-b6fd-d9e53528c655.webp')
    expect(pages[0].index).toBe(0)
  })
})
