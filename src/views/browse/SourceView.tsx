'use client'

import { useEffect } from 'react'
import { getSource } from '@/lib/sources'
import {
  Alert,
  MostViewed,
  NewRelease,
  RecentlyUpdated,
  TopTrending,
} from '@/views/home/components'

interface SourceViewProps {
  sourceId: string
}

const SourceView = ({ sourceId }: SourceViewProps) => {
  const source = getSource(sourceId)

  useEffect(() => {
    if (source) {
      document.title = `${source.name} - MangaBlaze`
    }
  }, [source])

  if (!source) {
    return (
      <div className="container py-5 text-center">
        <h2>Source not found</h2>
      </div>
    )
  }

  return (
    <>
      <div className="source-header bg-secondary-subtle py-4 mb-4">
        <div className="container">
          <div className="d-flex align-items-center">
             <i className="fa-regular fa-globe fa-2xl mr-3"></i>
             <div>
                <h2 className="mb-0">{source.name}</h2>
                <span className="badge bg-primary">{source.type}</span>
             </div>
          </div>
        </div>
      </div>
      
      <TopTrending sourceId={sourceId} />
      <div className="container">
        <Alert />
        <MostViewed sourceId={sourceId} />
        <RecentlyUpdated sourceId={sourceId} />
        <NewRelease sourceId={sourceId} />
      </div>
    </>
  )
}

export default SourceView
