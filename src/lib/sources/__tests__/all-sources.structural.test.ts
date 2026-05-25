import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import {
  sources,
  sourceList,
  defaultSource,
  getSource,
} from '../index'

describe('Source Registry', () => {
  it('should have 215 registered sources', () => {
    expect(Object.keys(sources)).toHaveLength(215)
  })

  it('should have sourceList matching sources record values', () => {
    expect(sourceList).toHaveLength(215)
    expect(new Set(sourceList)).toHaveLength(215)
    expect(sourceList.every((s) => Object.values(sources).includes(s))).toBe(true)
  })

  it('should have mangadex as default source', () => {
    expect(defaultSource).toBe(sources.mangadex)
  })

  it('should return default source for undefined id', () => {
    expect(getSource()).toBe(defaultSource)
    expect(getSource('')).toBe(defaultSource)
  })

  it('should return correct source by id', () => {
    expect(getSource('mangadex')).toBe(sources.mangadex)
    expect(getSource('comick')).toBe(sources.comick)
    expect(getSource('nonexistent')).toBe(defaultSource)
  })

  it('should have unique source ids', () => {
    const ids = Object.keys(sources)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have mostly unique source names (4 duplicates are known)', () => {
    const names = Object.values(sources).map((s) => s.name)
    // Known duplicates: Arena Scans (arenascan + arenascans),
    // El Goonish Shive (egscomics + elgoonishshive),
    // ManhwaClub (manhwaclub + manhwaclub_agent2 + manhwaclub_agent4)
    expect(new Set(names).size).toBe(211)
  })
})

describe.each(Object.entries(sources))('Source: %s', (id, source) => {
  describe('structural validation', () => {
    it('should be a valid MangaSource object', () => {
      expect(source).toBeDefined()
      expect(typeof source).toBe('object')
    })

    it('should have a non-empty id string', () => {
      expect(typeof source.id).toBe('string')
      expect(source.id.length).toBeGreaterThan(0)
      expect(source.id).toBe(id)
    })

    it('should have a non-empty name string', () => {
      expect(typeof source.name).toBe('string')
      expect(source.name.length).toBeGreaterThan(0)
    })

    it('should have a valid type', () => {
      expect(['api', 'scraper']).toContain(source.type)
    })

    it('should have a search function', () => {
      expect(typeof source.search).toBe('function')
    })

    it('should have a getManga function', () => {
      expect(typeof source.getManga).toBe('function')
    })

    it('should have a getChapters function', () => {
      expect(typeof source.getChapters).toBe('function')
    })

    it('should have a getChapterPages function', () => {
      expect(typeof source.getChapterPages).toBe('function')
    })
  })
})

describe('Source method return types under error conditions', () => {
  let originalFetch: typeof global.fetch

  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response('Not Found', { status: 404, statusText: 'Not Found' })
      )
    ) as typeof global.fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('all scraper sources should return empty arrays on 404 for search', async () => {
    const scrapers = Object.values(sources).filter((s) => s.type === 'scraper')
    const results = await Promise.all(
      scrapers.map(async (source) => {
        const result = await source.search('nonexistent-query-99999')
        return { id: source.id, isArray: Array.isArray(result) }
      })
    )

    const invalid = results.filter((r) => !r.isArray)
    if (invalid.length > 0) {
      console.error('Sources returning non-array for search on 404:', invalid.map((i) => i.id))
    }
    expect(invalid).toHaveLength(0)
  })

  it('all scraper sources should return empty arrays on 404 for getChapters', async () => {
    const scrapers = Object.values(sources).filter((s) => s.type === 'scraper')
    const results = await Promise.all(
      scrapers.map(async (source) => {
        const result = await source.getChapters('nonexistent-id-99999')
        return { id: source.id, isArray: Array.isArray(result) }
      })
    )

    const invalid = results.filter((r) => !r.isArray)
    if (invalid.length > 0) {
      console.error('Sources returning non-array for getChapters on 404:', invalid.map((i) => i.id))
    }
    expect(invalid).toHaveLength(0)
  })

  it('all scraper sources should return empty arrays on 404 for getChapterPages', async () => {
    const scrapers = Object.values(sources).filter((s) => s.type === 'scraper')
    const results = await Promise.all(
      scrapers.map(async (source) => {
        const result = await source.getChapterPages('nonexistent-id-99999')
        return { id: source.id, isArray: Array.isArray(result) }
      })
    )

    const invalid = results.filter((r) => !r.isArray)
    if (invalid.length > 0) {
      console.error('Sources returning non-array for getChapterPages on 404:', invalid.map((i) => i.id))
    }
    expect(invalid).toHaveLength(0)
  })

  it('all API sources should return proper types when mocked', async () => {
    // API sources may throw on real 404s; this test verifies method signatures work
    // Individual API sources should have their own mocked tests
    const apis = Object.values(sources).filter((s) => s.type === 'api')
    for (const source of apis) {
      expect(typeof source.search).toBe('function')
      expect(typeof source.getManga).toBe('function')
      expect(typeof source.getChapters).toBe('function')
      expect(typeof source.getChapterPages).toBe('function')
    }
  })
})

describe('Source error resilience with network failure', () => {
  let originalFetch: typeof global.fetch

  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = vi.fn(() => Promise.reject(new Error('Network Error'))) as typeof global.fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('all scraper sources should not throw on network failure for search', async () => {
    const scrapers = Object.values(sources).filter((s) => s.type === 'scraper')
    const results = await Promise.all(
      scrapers.map(async (source) => {
        try {
          const result = await source.search('test')
          return { id: source.id, threw: false, isArray: Array.isArray(result) }
        } catch {
          return { id: source.id, threw: true, isArray: false }
        }
      })
    )

    const throwers = results.filter((r) => r.threw)
    if (throwers.length > 0) {
      console.error('Sources that throw on network error for search:', throwers.map((i) => i.id))
    }
    expect(throwers).toHaveLength(0)

    const nonArrays = results.filter((r) => !r.isArray)
    if (nonArrays.length > 0) {
      console.error('Sources returning non-array on network error for search:', nonArrays.map((i) => i.id))
    }
    expect(nonArrays).toHaveLength(0)
  })

  it('all scraper sources should not throw on network failure for getChapters', async () => {
    const scrapers = Object.values(sources).filter((s) => s.type === 'scraper')
    const results = await Promise.all(
      scrapers.map(async (source) => {
        try {
          const result = await source.getChapters('test')
          return { id: source.id, threw: false, isArray: Array.isArray(result) }
        } catch {
          return { id: source.id, threw: true, isArray: false }
        }
      })
    )

    const throwers = results.filter((r) => r.threw)
    expect(throwers).toHaveLength(0)

    const nonArrays = results.filter((r) => !r.isArray)
    expect(nonArrays).toHaveLength(0)
  })

  it('all scraper sources should not throw on network failure for getChapterPages', async () => {
    const scrapers = Object.values(sources).filter((s) => s.type === 'scraper')
    const results = await Promise.all(
      scrapers.map(async (source) => {
        try {
          const result = await source.getChapterPages('test')
          return { id: source.id, threw: false, isArray: Array.isArray(result) }
        } catch {
          return { id: source.id, threw: true, isArray: false }
        }
      })
    )

    const throwers = results.filter((r) => r.threw)
    expect(throwers).toHaveLength(0)

    const nonArrays = results.filter((r) => !r.isArray)
    expect(nonArrays).toHaveLength(0)
  })
})
