import { expect, test } from 'vitest'
import { GET } from '../route'

test('GET /api/manga returns normalized search results from MangaDex', async () => {
  const request = new Request('http://localhost:3000/api/manga?q=naruto&source=mangadex')
  const response = await GET(request)
  expect(response.status).toBe(200)

  const body = await response.json()
  expect(body.data).toBeInstanceOf(Array)
  expect(body.data.length).toBe(1)
  
  const manga = body.data[0]
  expect(manga.id).toBe('manga-1')
  expect(manga.title).toBe('Mocked Naruto')
  expect(manga.status).toBe('completed')
  expect(manga.year).toBe(1999)
  expect(manga.cover).toContain('naruto-cover')
})

test('GET /api/manga defaults to MangaDex source', async () => {
  const request = new Request('http://localhost:3000/api/manga?q=naruto')
  const response = await GET(request)
  expect(response.status).toBe(200)

  const body = await response.json()
  expect(body.source).toBe('mangadex')
})
