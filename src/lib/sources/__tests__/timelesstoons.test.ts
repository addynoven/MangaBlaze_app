import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { timelesstoonsSource } from '../timelesstoons'

const mockCatalogHTML = `
<button id="65255b946df" alt="Immune to Magic Eyes" title="Immune to Magic Eyes" tags='["Isekai","Fantasy"]' data-type="manga" data-status="ongoing">
  <a href="/series/immune-to-magic-eyes/" alt="Immune to Magic Eyes" title="Immune to Magic Eyes">
    <div style="background-image:url(https://wsrv.nl/?url=cdn.meowing.org/uploads/cover1&amp;w=600)"></div>
  </a>
</button>
<button id="65255b946dg" alt="Severe Section Manager" title="Severe Section Manager" tags='["Adventure","Comedy"]' data-type="manga" data-status="ongoing">
  <a href="/series/severe-section-manager/" alt="Severe Section Manager" title="Severe Section Manager">
    <div style="background-image:url(https://wsrv.nl/?url=cdn.meowing.org/uploads/cover2&amp;w=600)"></div>
  </a>
</button>
`

const mockDetailHTML = `
<!DOCTYPE html>
<html>
<body>
  <h1>Severe Section Manager</h1>
  <div class="flex xl:flex-row flex-col w-full sm:gap-10 gap-[4vw] relative">
    <div>
      <div style="--photoURL:url(https://wsrv.nl/?url=cdn.meowing.org/uploads/cover2&amp;w=1000)"></div>
    </div>
    <div>
      <div id="expand_content">
        <p>This is a hilarious story about a manager who acts tough about eating spicy food.</p>
      </div>
      <div class="grid gap-2 h-fit">
        <div class="font-medium"><span>Author</span></div>
        <div>MAEDA Yuu</div>
      </div>
      <div class="grid gap-2 h-fit">
        <div class="font-medium"><span>Artist</span></div>
        <div>MAEDA Yuu</div>
      </div>
      <div class="grid gap-2 h-fit">
        <div class="font-medium"><span>Status</span></div>
        <div>ongoing</div>
      </div>
      <div class="flex flex-wrap gap-1">
        <a href="/series/?genre=adventure">Adventure</a>
        <a href="/series/?genre=comedy">Comedy</a>
      </div>
    </div>
  </div>
  <div id="chapters">
    <a href="/chapter/chapter-0" text="Chapter 0" title="Chapter 0" d="6 days ago"></a>
    <a href="/chapter/chapter-1" text="Chapter 1" title="Chapter 1" d="5 days ago"></a>
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
    <img class="myImage" uid="page3">
  </div>
</body>
</html>
`

const server = setupServer(
  http.get('https://timelesstoons.org/search_series', () => {
    return new HttpResponse(mockCatalogHTML, {
      headers: { 'Content-Type': 'text/html' }
    })
  }),

  http.get('https://timelesstoons.org/series/severe-section-manager/', () => {
    return new HttpResponse(mockDetailHTML, {
      headers: { 'Content-Type': 'text/html' }
    })
  }),

  http.get('https://timelesstoons.org/chapter/chapter-1/', () => {
    return new HttpResponse(mockChapterHTML, {
      headers: { 'Content-Type': 'text/html' }
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('TimelessToons Scraper Source', () => {
  it('should search for series catalog successfully', async () => {
    const results = await timelesstoonsSource.search('severe')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('severe-section-manager')
    expect(results[0].title).toBe('Severe Section Manager')
    expect(results[0].cover).toBe('https://wsrv.nl/?url=cdn.meowing.org/uploads/cover2&w=600')
    expect(results[0].status).toBe('ongoing')
  })

  it('should get manga details successfully', async () => {
    const detail = await timelesstoonsSource.getManga('severe-section-manager')
    expect(detail).not.toBeNull()
    expect(detail?.title).toBe('Severe Section Manager')
    expect(detail?.cover).toBe('https://wsrv.nl/?url=cdn.meowing.org/uploads/cover2&w=1000')
    expect(detail?.description).toBe('This is a hilarious story about a manager who acts tough about eating spicy food.')
    expect(detail?.authors).toEqual(['MAEDA Yuu'])
    expect(detail?.artists).toEqual(['MAEDA Yuu'])
    expect(detail?.status).toBe('ongoing')
    expect(detail?.genres).toEqual(['Adventure', 'Comedy'])
  })

  it('should get manga chapters successfully', async () => {
    const chapters = await timelesstoonsSource.getChapters('severe-section-manager')
    // Note: in detail HTML there are 2 chapters: chapter-0 and chapter-1
    expect(chapters).toHaveLength(2)
    expect(chapters[0].id).toBe('chapter-0')
    expect(chapters[0].chapterNumber).toBe('0')
    expect(chapters[0].publishedAt).toBe('6 days ago')

    expect(chapters[1].id).toBe('chapter-1')
    expect(chapters[1].chapterNumber).toBe('1')
    expect(chapters[1].publishedAt).toBe('5 days ago')
  })

  it('should get chapter page list successfully', async () => {
    const pages = await timelesstoonsSource.getChapterPages('chapter-1')
    expect(pages).toHaveLength(3)
    expect(pages[0].url).toBe('https://wsrv.nl/?url=cdn.meowing.org/uploads/page1')
    expect(pages[0].index).toBe(0)
    expect(pages[1].url).toBe('https://wsrv.nl/?url=cdn.meowing.org/uploads/page2')
    expect(pages[1].index).toBe(1)
    expect(pages[2].url).toBe('https://wsrv.nl/?url=cdn.meowing.org/uploads/page3')
    expect(pages[2].index).toBe(2)
  })
})
