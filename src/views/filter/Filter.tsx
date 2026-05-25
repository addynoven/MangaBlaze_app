'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

import { Filter, Head } from './components'

import { Card, Loading } from '@/components/shared'
import { Genre } from '@/@types/common'
import { formatDate, getMangaType } from '@/utils/manga'

const FilterPage = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [results, setResults] = useState<{ source: string, data: Genre[] }[]>([])
  const [loading, setLoading] = useState(true)

  const source = searchParams.get('source') || 'mangadex'
  const keyword = searchParams.get('keyword')

  useEffect(() => {
    document.title = keyword ? `Search results for "${keyword}" - MangaBlaze` : 'Filter - MangaBlaze'
  }, [keyword])

  useEffect(() => {
    const query = keyword || ''
    setLoading(true)
    
    fetch(`/api/manga?q=${encodeURIComponent(query)}&source=${source}&limit=20`)
      .then((res) => res.json())
      .then((res) => {
        if (!res.data) {
          setResults([])
          setLoading(false)
          return
        }

        const groupedResults = res.data.map((sourceRes: any) => ({
          source: sourceRes.source,
          data: (sourceRes.data || [])
            .map((manga: any): Genre | null => {
              if (!manga) return null
              return {
                id: manga.id,
                image: manga.cover || '/images/placeholder.png',
                type: getMangaType(manga.genres),
                title: manga.title || 'Unknown',
                source: sourceRes.source,
                chapters: [{
                  info: manga.lastChapter ? `Chap ${manga.lastChapter}` : 'View details',
                  date: formatDate(manga.year ? String(manga.year) : undefined),
                  lang: null,
                  chapterId: manga.id,
                }],
              }
            })
            .filter(Boolean) as Genre[]
        }))

        setResults(groupedResults)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching search results:', err)
        setResults([])
        setLoading(false)
      })
  }, [keyword, source])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const keyword = formData.get('keyword') || ''
    const sources = formData.getAll('source[]') as string[]
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('keyword', keyword.toString())
    if (sources.length > 0) {
      params.set('source', sources.join(','))
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="container">
      <section className="mt-5">
        <Head />
        <div className="row">
          <div className="col-lg-3 d-none d-lg-block">
            <Filter handleSubmit={handleSubmit} />
          </div>
          <div className="col-lg-9">
            <Loading loading={loading} type="gif">
              <div className="mb-3 d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  {keyword ? `Search results for "${keyword}"` : 'All Manga'}
                </h4>
                <span className="badge bg-secondary">{results.reduce((acc, r) => acc + r.data.length, 0)} results</span>
              </div>
              
              {results.map((group) => (
                <div key={group.source} className="mb-5">
                  <div className="d-flex align-items-center mb-3">
                    <h4 className="mb-0 mr-2 text-primary">{group.source.toUpperCase()}</h4>
                    <span className="badge bg-secondary">{group.data.length} results</span>
                  </div>
                  {group.data.length > 0 ? (
                    <div className="original card-lg">
                      {group.data.map((item, index) => (
                        <Card key={item.id || index} item={item} index={index + 1} />
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 text-muted">No results found for this source.</div>
                  )}
                </div>
              ))}

              {results.length === 0 && !loading && (
                <div className="text-center py-5 text-muted">
                  No manga found matching your query.
                </div>
              )}
            </Loading>
          </div>
        </div>
      </section>
    </div>
  )
}

export default FilterPage
