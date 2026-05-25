import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { wuxiaworldSource } from '../wuxiaworld'

const mockSearchHTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="c-tabs-item__content">
    <div class="tab-thumb">
      <a href="https://wuxiaworld.site/novel/da-xuan-martial-saint/" title="Da Xuan Martial Saint">
        <img data-src="https://wuxiaworld.site/wp-content/uploads/cover.jpg" alt="cover"/>
      </a>
    </div>
    <div class="tab-summary">
      <div class="post-title">
        <h3><a href="https://wuxiaworld.site/novel/da-xuan-martial-saint/">Da Xuan Martial Saint</a></h3>
      </div>
    </div>
  </div>
</body>
</html>
`

const mockDetailHTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="post-title">
    <h1>Da Xuan Martial Saint</h1>
  </div>
  <div class="summary_image">
    <img data-src="https://wuxiaworld.site/wp-content/uploads/cover.jpg" alt="cover"/>
  </div>
  <div class="post-content_item">
    <div class="summary-heading">
      <h5>Author(s)</h5>
    </div>
    <div class="summary-content">
      <div class="author-content">
        <a href="https://wuxiaworld.site/manga-author/night-wind-listener/">Night Wind Listener</a>
      </div>
    </div>
  </div>
  <div class="post-content_item">
    <div class="summary-heading">
      <h5>Genre(s)</h5>
    </div>
    <div class="summary-content">
      <div class="genres-content">
        <a href="https://wuxiaworld.site/genre/action/">Action</a>
        <a href="https://wuxiaworld.site/genre/adventure/">Adventure</a>
      </div>
    </div>
  </div>
  <div class="post-content_item">
    <div class="summary-heading">
      <h5>Status</h5>
    </div>
    <div class="summary-content">OnGoing</div>
  </div>
  <div class="description-summary">
    <p>A great story about martial arts and cultivation.</p>
  </div>
</body>
</html>
`

const mockChaptersHTML = `
<div class="page-content-listing single-page">
  <div class="listing-chapters_wrap">
    <ul class="main version-chap">
      <li class="wp-manga-chapter">
        <a href="https://wuxiaworld.site/novel/da-xuan-martial-saint/chapter-968/">
          Chapter 968 - - 489: great wilderness secret technique!
        </a>
        <span class="chapter-release-date">
          <i>July 7, 2025</i>
        </span>
      </li>
      <li class="wp-manga-chapter">
        <a href="https://wuxiaworld.site/novel/da-xuan-martial-saint/chapter-967/">
          Chapter 967 - - 488: visit hehuan_3
        </a>
        <span class="chapter-release-date">
          <i>July 6, 2025</i>
        </span>
      </li>
    </ul>
  </div>
</div>
`

const mockChapterPagesHTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="reading-content">
    <img class="wp-manga-chapter-img" src="https://wuxiaworld.site/wp-content/uploads/page1.jpg"/>
    <img class="wp-manga-chapter-img" data-src="https://wuxiaworld.site/wp-content/uploads/page2.jpg"/>
  </div>
</body>
</html>
`

const server = setupServer(
  http.get('https://wuxiaworld.site/', ({ request }) => {
    const url = new URL(request.url)
    const s = url.searchParams.get('s')
    if (s === 'da-xuan') {
      return new HttpResponse(mockSearchHTML, {
        headers: { 'Content-Type': 'text/html' },
      })
    }
    return new HttpResponse('', { status: 404 })
  }),

  http.get('https://wuxiaworld.site/novel/da-xuan-martial-saint/', () => {
    return new HttpResponse(mockDetailHTML, {
      headers: { 'Content-Type': 'text/html' },
    })
  }),

  http.post('https://wuxiaworld.site/novel/da-xuan-martial-saint/ajax/chapters/', () => {
    return new HttpResponse(mockChaptersHTML, {
      headers: { 'Content-Type': 'text/html' },
    })
  }),

  http.get('https://wuxiaworld.site/novel/da-xuan-martial-saint/chapter-968/', () => {
    return new HttpResponse(mockChapterPagesHTML, {
      headers: { 'Content-Type': 'text/html' },
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('WuxiaWorld Scraper Source', () => {
  it('should search for series catalog successfully', async () => {
    const results = await wuxiaworldSource.search('da-xuan')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('da-xuan-martial-saint')
    expect(results[0].title).toBe('Da Xuan Martial Saint')
    expect(results[0].cover).toBe('https://wuxiaworld.site/wp-content/uploads/cover.jpg')
  })

  it('should get manga details successfully', async () => {
    const detail = await wuxiaworldSource.getManga('da-xuan-martial-saint')
    expect(detail).not.toBeNull()
    expect(detail?.title).toBe('Da Xuan Martial Saint')
    expect(detail?.cover).toBe('https://wuxiaworld.site/wp-content/uploads/cover.jpg')
    expect(detail?.description).toBe('A great story about martial arts and cultivation.')
    expect(detail?.authors).toEqual(['Night Wind Listener'])
    expect(detail?.artists).toEqual(['Night Wind Listener'])
    expect(detail?.status).toBe('ongoing')
    expect(detail?.genres).toEqual(['Action', 'Adventure'])
  })

  it('should get manga chapters successfully', async () => {
    const chapters = await wuxiaworldSource.getChapters('da-xuan-martial-saint')
    expect(chapters).toHaveLength(2)
    expect(chapters[0].id).toBe('da-xuan-martial-saint/chapter-968')
    expect(chapters[0].chapterNumber).toBe('968')
    expect(chapters[0].title).toBe('Chapter 968 - - 489: great wilderness secret technique!')
    expect(chapters[0].publishedAt).toBe(new Date('July 7, 2025').toISOString())
    expect(chapters[0].externalUrl).toBe('https://wuxiaworld.site/novel/da-xuan-martial-saint/chapter-968/')

    expect(chapters[1].id).toBe('da-xuan-martial-saint/chapter-967')
    expect(chapters[1].chapterNumber).toBe('967')
  })

  it('should get chapter page list successfully', async () => {
    const pages = await wuxiaworldSource.getChapterPages('da-xuan-martial-saint/chapter-968')
    expect(pages).toHaveLength(2)
    expect(pages[0].url).toBe('https://wuxiaworld.site/wp-content/uploads/page1.jpg')
    expect(pages[0].index).toBe(0)
    expect(pages[1].url).toBe('https://wuxiaworld.site/wp-content/uploads/page2.jpg')
    expect(pages[1].index).toBe(1)
  })
})
