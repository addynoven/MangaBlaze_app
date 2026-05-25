import { http, HttpResponse } from 'msw'

export const handlers = [
  // Intercept MangaDex search requests
  http.get('https://api.mangadex.org/manga', () => {
    return HttpResponse.json({
      result: 'ok',
      response: 'collection',
      data: [
        {
          id: 'manga-1',
          type: 'manga',
          attributes: {
            title: { en: 'Mocked Naruto' },
            description: { en: 'Naruto ninja adventure description.' },
            status: 'completed',
            year: 1999,
            contentRating: 'safe',
            originalLanguage: 'ja',
            lastVolume: '72',
            lastChapter: '700',
            tags: [
              {
                id: 'tag-1',
                attributes: { name: { en: 'Ninja' } },
              },
            ],
          },
          relationships: [
            {
              id: 'cover-1',
              type: 'cover_art',
              attributes: { fileName: 'naruto-cover.jpg' },
            },
          ],
        },
      ],
      limit: 20,
      offset: 0,
      total: 1,
    })
  }),

  // Intercept relative internal API requests from the frontend
  http.get('/api/manga', ({ request }) => {
    const url = new URL(request.url, 'http://localhost:3000')
    const q = url.searchParams.get('q') || ''
    
    if (q === 'empty') {
      return HttpResponse.json({ data: [], source: 'mangadex' })
    }

    return HttpResponse.json({
      source: 'mangadex',
      data: [
        {
          id: 'manga-123',
          title: 'Mock Naruto',
          cover: 'http://uploads.mangadex.org/covers/123.jpg',
          genres: ['Action', 'Ninja'],
          status: 'completed',
          year: 1999,
          lastChapter: '700',
        },
      ],
    })
  }),
]
