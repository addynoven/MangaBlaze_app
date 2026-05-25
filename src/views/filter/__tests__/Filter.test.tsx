import { expect, test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import FilterPage from '../Filter'

test('FilterPage renders search elements and performs dynamic fetching', async () => {
  render(<FilterPage />)

  // 1. Verify layout elements are present
  expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument()

  // 2. Wait for MSW mock handlers to deliver data and render the card
  await waitFor(() => {
    expect(screen.getByText('Mock Naruto')).toBeInTheDocument()
  })

  // 3. Verify card elements and type mapping (Action genre maps to Manga)
  expect(screen.getByText('Manga')).toBeInTheDocument()
  expect(screen.getByText('Chap 700')).toBeInTheDocument()
})
