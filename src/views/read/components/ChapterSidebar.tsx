'use client'

import classNames from 'classnames'
import Link from 'next/link'
import { SourceChapter } from '@/lib/sources'

interface ChapterSidebarProps {
  open: boolean
  onClose: () => void
  chapters: SourceChapter[]
  currentChapterId?: string
  mangaId: string
  sourceId: string
}

const ChapterSidebar = ({ open, onClose, chapters, currentChapterId, mangaId, sourceId }: ChapterSidebarProps) => {
  const sourceParam = sourceId ? `?source=${sourceId}` : ''

  return (
    <>
      <div 
        className={classNames("reader-sidebar-overlay", open && "active")}
        onClick={onClose}
      />
      
      <div className={classNames("reader-sidebar glass-panel", open && "open")} style={{ borderRadius: '0' }}>
        <div className="p-4 border-bottom border-white/10 d-flex justify-content-between align-items-center bg-transparent">
          <h5 className="mb-0 text-white fw-bold">Chapter List</h5>
          <button className="btn btn-sm btn-link text-white p-0 hover-scale" onClick={onClose}>
            <i className="fa-solid fa-xmark fa-xl"></i>
          </button>
        </div>
        
        <div className="chapter-list">
          {chapters.map((chap) => (
            <Link
              key={chap.id}
              href={`/read/${mangaId}/en/${chap.id}${sourceParam}`}
              className={classNames(
                "chapter-list-item",
                currentChapterId === chap.id && "active"
              )}
              onClick={onClose}
            >
              <div className="text-truncate">
                <span className="fw-bold">Ch. {chap.chapterNumber}</span>
                {chap.title && <span className="text-muted ml-2 small">- {chap.title}</span>}
              </div>
              {currentChapterId === chap.id && <i className="fa-solid fa-play text-primary fa-xs"></i>}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

export default ChapterSidebar
