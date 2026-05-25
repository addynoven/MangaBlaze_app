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

  const [data, setData] = useState<Genre[]>([])
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
          setData([])
          setLoading(false)
          return
        }

        const items = res.data.map((manga: any): Genre | null => {
          if (!manga) return null
          const activeSource = manga.sources?.[0] || manga.source
          return {
            id: manga.id,
            image: manga.cover || '/images/placeholder.png',
            type: getMangaType(manga.genres),
            title: manga.title || 'Unknown',
            source: activeSource,
            chapters: [{
              info: manga.lastChapter ? `Chap ${manga.lastChapter}` : 'View details',
              date: formatDate(manga.year ? String(manga.year) : undefined),
              lang: null,
              chapterId: manga.id,
            }],
          }
        }).filter(Boolean) as Genre[]

        setData(items)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching search results:', err)
        setData([])
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
                <span className="badge bg-secondary">{data.length} results</span>
              </div>
              
              {data.length > 0 ? (
                <div className="original card-lg">
                  {data.map((item, index) => (
                    <Card key={`${item.source}-${item.id}`} item={item} index={index + 1} />
                  ))}
                </div>
              ) : (
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
