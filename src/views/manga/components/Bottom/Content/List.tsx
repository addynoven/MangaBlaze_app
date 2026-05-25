'use client'

import { ENUM_READ_BY } from '@/@types/common'
import Link from 'next/link'
import type { SourceMangaDetail, SourceChapter } from '@/lib/sources'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { getSelectedSource } from '@/lib/sourceStorage'
import classNames from 'classnames'

type ChapterListProps = {
  tab: ENUM_READ_BY
  manga: SourceMangaDetail
  chapters: SourceChapter[]
}

type ItemProps = {
  time: string
  chapNumber: string
  title: string
  chapterId: string
  mangaId: string
  externalUrl: string | null
  sourceId: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Item(props: ItemProps) {
  const { time, chapNumber, title, chapterId, mangaId, externalUrl, sourceId } = props
  const [downloading, setDownloading] = useState(false)
  
  const href = externalUrl || `/read/${mangaId}/en/${chapterId}?source=${sourceId}`
  const target = externalUrl ? '_blank' : undefined
  const rel = externalUrl ? 'noopener noreferrer' : undefined

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (externalUrl) {
      toast.error('Cannot download external chapters')
      return
    }

    setDownloading(true)
    try {
      const res = await fetch(`/api/chapter/pages?id=${chapterId}&source=${sourceId}`)
      const data = await res.json()
      
      let imageUrls: string[] = []
      const hash = data.chapter?.hash || data.hash
      const files = data.chapter?.data || data.data || []
      
      if (data.baseUrl && hash && files.length) {
        imageUrls = files.map((file: string) => `${data.baseUrl}/data/${hash}/${file}`)
      } else if (Array.isArray(data.pages)) {
        imageUrls = data.pages.map((p: { url: string }) => p.url)
      } else if (files.length && typeof files[0] === 'string') {
        imageUrls = files
      }

      if (imageUrls.length > 0 && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_URLS',
          payload: imageUrls
        })
        toast.success(`Chapter ${chapNumber} downloaded!`)
      } else {
        toast.error('Failed to prepare download')
      }
    } catch (err) {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <li className="item" data-number={chapNumber}>
      <div className="d-flex align-items-center justify-content-between w-100 pr-3">
        <Link href={href} target={target} rel={rel} title={chapNumber} className="flex-grow-1 text-decoration-none">
          <span>
            Chapter {chapNumber}: {title} {externalUrl && <span className="badge badge-secondary ml-1" style={{ fontSize: '10px', verticalAlign: 'middle', background: '#343a40', color: '#fff', padding: '2px 4px', borderRadius: '3px' }}>External</span>}
          </span>
          <span>{formatDate(time)}</span>
        </Link>
        {!externalUrl && (
          <button 
            className={classNames("btn btn-sm btn-link p-0", downloading ? "text-primary" : "text-muted")} 
            onClick={handleDownload}
            disabled={downloading}
            title="Download for offline"
            style={{ fontSize: 16 }}
          >
            <i className={classNames("fa-solid", downloading ? "fa-spinner fa-spin" : "fa-cloud-arrow-down")}></i>
          </button>
        )}
      </div>
    </li>
  )
}

const ChapterList = ({ tab, manga, chapters }: ChapterListProps) => {
  const activeSourceId = (manga as { sourceId?: string }).sourceId || getSelectedSource()
  
  // Only show chapters that are not marked unavailable
  const readableChapters = chapters.filter(
    (c) => !c.isUnavailable
  )

  return (
    <div className="list-body">
      {tab === ENUM_READ_BY.CHAPTER && (
        <ul className="scroll-sm">
          {readableChapters.map((item) => (
            <Item
              time={item.publishedAt || item.readableAt || new Date().toISOString()}
              title={item.title || `Chapter ${item.chapterNumber || '?'}`}
              key={item.id}
              chapNumber={item.chapterNumber || '?'}
              chapterId={item.id}
              mangaId={manga.id}
              externalUrl={item.externalUrl}
              sourceId={activeSourceId}
            />
          ))}
        </ul>
      )}

      {tab === ENUM_READ_BY.VOLUME && (
        <div className="card-md vol-list scroll-sm">
          <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
            Volume view not available
          </div>
        </div>
      )}
    </div>
  )
}

export default ChapterList
