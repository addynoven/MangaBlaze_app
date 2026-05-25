import { expect, test } from 'vitest'
import { formatDate, getMangaType } from '../Filter'

test('formatDate parses dates correctly into relative string representations', () => {
  expect(formatDate(null)).toBe('Unknown')
  expect(formatDate(undefined)).toBe('Unknown')

  const now = new Date()
  
  // Just now
  expect(formatDate(now.toISOString())).toBe('Just now')

  // Minutes ago
  const tenMinsAgo = new Date(now.getTime() - 10 * 60000)
  expect(formatDate(tenMinsAgo.toISOString())).toBe('10m ago')

  // Hours ago
  const threeHoursAgo = new Date(now.getTime() - 3 * 3600000)
  expect(formatDate(threeHoursAgo.toISOString())).toBe('3h ago')

  // Days ago
  const fourDaysAgo = new Date(now.getTime() - 4 * 86400000)
  expect(formatDate(fourDaysAgo.toISOString())).toBe('4d ago')
})

test('getMangaType correctly resolves categories from genre tags list', () => {
  expect(getMangaType()).toBe('Manga')
  expect(getMangaType([])).toBe('Manga')
  expect(getMangaType(['Action', 'Adventure'])).toBe('Manga')
  expect(getMangaType(['Drama', 'Manhua', 'Historical'])).toBe('Manhua')
  expect(getMangaType(['Manhwa', 'Webtoon'])).toBe('Manhwa')
  expect(getMangaType(['Comedy', 'One-Shot'])).toBe('One_shot')
})
