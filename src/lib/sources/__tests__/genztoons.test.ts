import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { genztoonsSource } from '../genztoons'

const mockCatalogHTML = `
<button id="65255b946df" alt="I Alone Have an EX-Rank Summon" title="I Alone Have an EX-Rank Summon" tags='["Action","Adventure"]' data-type="manga" data-status="ongoing">
  <a href="/series/i-alone-have-an-ex-rank-summon/" alt="I Alone Have an EX-Rank Summon" title="I Alone Have an EX-Rank Summon">
    <div style="background-image:url(https://wsrv.nl/?url=cdn.meowing.org/uploads/cover1&amp;w=600)"></div>
  </a>
</button>
`

const mockDetailHTML = `
<!DOCTYPE html>
<html>
<body>
  <h1>I Alone Have an EX-Rank Summon</h1>
  <div class="flex xl:flex-row flex-col w-full sm:gap-10 gap-[4vw] relative">
    <div>
      <div style="--photoURL:url(https://wsrv.nl/?url=cdn.meowing.org/uploads/cover1&amp;w=1000)"></div>
    </div>
    <div>
      <div id="expand_content">
        <p>A standard webtoon details description.</p>
      </div>
      <div class="grid gap-2 h-fit">
        <div class="font-medium"><span>Author</span></div>
        <div>Lim Jeyeol</div>
      </div>
      <div class="grid gap-2 h-fit">
        <div class="font-medium"><span>Artist</span></div>
        <div>Studio Inus</div>
      </div>
      <div class="grid gap-2 h-fit">
        <div class="font-medium"><span>Status</span></div>
        <div>ongoing</div>
      </div>
      <div class="flex flex-wrap gap-1">
        <a href="/series/?genre=action">Action</a>
        <a href="/series/?genre=adventure">Adventure</a>
      </div>
    </div>
  </div>
  <div id="chapters">
    <a href="/chapter/chapter-25" text="Chapter 25" title="Chapter 25" d="6 days ago"></a>
  </div>
</body>
</html>
`

const mockChapterHTML = `
<!DOCTYPE html>
<html>
<body>
  <div id="pages">
    <img class="myImage" uid="page1">
    <img class="myImage" uid="page2">
  </div>
</body>
</html>
`

const server = setupServer(
  http.get('https://genztoons.org/search_series', () => {
    return new HttpResponse(mockCatalogHTML, {
      headers: { 'Content-Type': 'text/html' }
    })
  }),

  http.get('https://genztoons.org/series/i-alone-have-an-ex-rank-summon/', () => {
    return new HttpResponse(mockDetailHTML, {
      headers: { 'Content-Type': 'text/html' }
    })
  }),

  http.get('https://genztoons.org/chapter/chapter-25/', () => {
    return new HttpResponse(mockChapterHTML, {
      headers: { 'Content-Type': 'text/html' }
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('GenzToons Scraper Source', () => {
  it('should search for series catalog successfully', async () => {
    const results = await genztoonsSource.search('EX-Rank')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('i-alone-have-an-ex-rank-summon')
    expect(results[0].title).toBe('I Alone Have an EX-Rank Summon')
    expect(results[0].cover).toBe('https://wsrv.nl/?url=cdn.meowing.org/uploads/cover1&w=600')
    expect(results[0].status).toBe('ongoing')
  })

  it('should get manga details successfully', async () => {
    const detail = await genztoonsSource.getManga('i-alone-have-an-ex-rank-summon')
    expect(detail).not.toBeNull()
    expect(detail?.title).toBe('I Alone Have an EX-Rank Summon')
    expect(detail?.cover).toBe('https://wsrv.nl/?url=cdn.meowing.org/uploads/cover1&w=1000')
    expect(detail?.description).toBe('A standard webtoon details description.')
    expect(detail?.authors).toEqual(['Lim Jeyeol'])
    expect(detail?.artists).toEqual(['Studio Inus'])
    expect(detail?.status).toBe('ongoing')
    expect(detail?.genres).toEqual(['Action', 'Adventure'])
  })

  it('should get manga chapters successfully', async () => {
    const chapters = await genztoonsSource.getChapters('i-alone-have-an-ex-rank-summon')
    expect(chapters).toHaveLength(1)
    expect(chapters[0].id).toBe('chapter-25')
    expect(chapters[0].chapterNumber).toBe('25')
    expect(chapters[0].publishedAt).toBe('6 days ago')
  })

  it('should get chapter page list successfully', async () => {
    const pages = await genztoonsSource.getChapterPages('chapter-25')
    expect(pages).toHaveLength(2)
    expect(pages[0].url).toBe('https://wsrv.nl/?url=cdn.meowing.org/uploads/page1')
    expect(pages[0].index).toBe(0)
    expect(pages[1].url).toBe('https://wsrv.nl/?url=cdn.meowing.org/uploads/page2')
    expect(pages[1].index).toBe(1)
  })
})
