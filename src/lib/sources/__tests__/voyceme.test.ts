import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { voycemeSource } from '../voyceme'

const mockSeriesJson = {
  v: '1.0',
  data: [
    {
      id: 376,
      slug: 'god-game',
      title: 'God Game',
      thumbnail: 'series_cover/wr9AIuORV0ZcVjMkj89qlATbvkLk5sdLdvonyq6t.jpeg',
      short_desc: 'Reiyan Asura, if that is his real name, awakens in a void...',
      author: {
        username: 'inspired.author',
        first_name: 'Brandon',
        last_name: 'Chen'
      },
      genres: ['Action'],
      status: 'ongoing',
      keyword: 'god game',
      chapters_count: 135
    }
  ]
}

const mockHtml = `
<!DOCTYPE html>
<html>
  <body>
    <script id="__NEXT_DATA__" type="application/json">
      {
        "props": {
          "pageProps": {
            "series": {
              "id": 376,
              "slug": "god-game",
              "title": "God Game",
              "thumbnail": "series_cover/wr9AIuORV0ZcVjMkj89qlATbvkLk5sdLdvonyq6t.jpeg",
              "description": "<p>Reiyan Asura, if that is his real name, awakens in a void, bound by chains.</p>",
              "author": {
                "username": "inspired.author",
                "first_name": "Brandon",
                "last_name": "Chen"
              },
              "genres": ["Action"],
              "status": "ongoing"
            }
          }
        }
      }
    </script>
  </body>
</html>
`

const mockChaptersResponse = {
  data: {
    voyce_chapters: [
      {
        id: 1552,
        title: 'Episode 1 - Survive',
        thumbnail: '',
        created_at: '2021-04-15T17:33:17',
        publish_date: '2021-04-15T17:33:17+00:00'
      }
    ]
  }
}

const mockImagesResponse = {
  data: {
    voyce_chapter_images: [
      {
        id: 427004,
        image: 'chapter_panels/1552_pG5F8cyZW7DFXkZtFzKqFLBOqJYmMWumK9j2k0q3.jpeg',
        chapter_id: 1552,
        sort_order: 0
      }
    ]
  }
}

const server = setupServer(
  http.get('https://dlkfxmdtxtzpb.cloudfront.net/system/json/series.json', () => {
    return HttpResponse.json(mockSeriesJson)
  }),

  http.get('https://www.voyce.me/series/god-game', () => {
    return new HttpResponse(mockHtml, {
      headers: {
        'Content-Type': 'text/html'
      }
    })
  }),

  http.post('https://graphql.voyce.me/v1/graphql/', async ({ request }) => {
    const clone = request.clone()
    const body = (await clone.json()) as any
    if (body.query && body.query.includes('ChaptersBySeriesSlug')) {
      return HttpResponse.json(mockChaptersResponse)
    }
    if (body.query && body.query.includes('ChapterImagesById')) {
      return HttpResponse.json(mockImagesResponse)
    }
    return HttpResponse.json({ data: {} })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('VoyceMe Scraper Source', () => {
  it('should search for series catalog successfully', async () => {
    const results = await voycemeSource.search('god')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('god-game')
    expect(results[0].title).toBe('God Game')
    expect(results[0].cover).toBe('https://dlkfxmdtxtzpb.cloudfront.net/series_cover/wr9AIuORV0ZcVjMkj89qlATbvkLk5sdLdvonyq6t.jpeg')
    expect(results[0].status).toBe('ongoing')
    expect(results[0].genres).toEqual(['Action'])
  })

  it('should get manga details successfully', async () => {
    const detail = await voycemeSource.getManga('god-game')
    expect(detail).not.toBeNull()
    expect(detail?.title).toBe('God Game')
    expect(detail?.cover).toBe('https://dlkfxmdtxtzpb.cloudfront.net/series_cover/wr9AIuORV0ZcVjMkj89qlATbvkLk5sdLdvonyq6t.jpeg')
    expect(detail?.description).toBe('Reiyan Asura, if that is his real name, awakens in a void, bound by chains.')
    expect(detail?.authors).toEqual(['Brandon Chen'])
    expect(detail?.artists).toEqual(['Brandon Chen'])
    expect(detail?.status).toBe('ongoing')
    expect(detail?.genres).toEqual(['Action'])
    expect(detail?.originalLanguage).toBe('en')
  })

  it('should get manga chapters successfully', async () => {
    const chapters = await voycemeSource.getChapters('god-game')
    expect(chapters).toHaveLength(1)
    expect(chapters[0].id).toBe('1552')
    expect(chapters[0].chapterNumber).toBe('1')
    expect(chapters[0].title).toBe('Episode 1 - Survive')
    expect(chapters[0].publishedAt).toBe('2021-04-15T17:33:17+00:00')
  })

  it('should get chapter page list successfully', async () => {
    const pages = await voycemeSource.getChapterPages('1552')
    expect(pages).toHaveLength(1)
    expect(pages[0].url).toBe('https://dlkfxmdtxtzpb.cloudfront.net/chapter_panels/1552_pG5F8cyZW7DFXkZtFzKqFLBOqJYmMWumK9j2k0q3.jpeg')
    expect(pages[0].index).toBe(0)
  })
})
