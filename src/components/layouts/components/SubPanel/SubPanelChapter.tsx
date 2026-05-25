import { useState, useEffect } from 'react'
import classNames from 'classnames'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { isMobile } from 'react-device-detect'
import { useWindowDimensions } from '@/utils/hooks'
import { SUB_PANEL_ENUM } from '@/constants/panel.constant'
import { setShowSubPanel, useAppDispatch, useAppSelector } from '@/store'
import { getSelectedSource } from '@/lib/sourceStorage'

import type { SourceChapter } from '@/lib/sources'

const SubPanelChapter = () => {
  const { isShowSubPanel } = useAppSelector((state) => state.theme)
  const dispatch = useAppDispatch()
  const { height } = useWindowDimensions()
  const [chapters, setChapters] = useState<SourceChapter[]>([])
  const [search, setSearch] = useState('')

  const params = useParams()
  const slugParams = params?.params
  const slug = Array.isArray(slugParams) ? slugParams[0] : slugParams
  const lang = Array.isArray(slugParams) ? slugParams[1] : 'en'
  const currentChapterId = Array.isArray(slugParams) ? slugParams[2] : undefined

  const handleClosePanel = () => dispatch(setShowSubPanel(null))

  useEffect(() => {
    if (!slug) return
    const source = getSelectedSource()
    fetch(`/api/manga/detail/feed?id=${slug}&limit=100&source=${source}`)
      .then((r) => r.json())
      .then((res) => {
        setChapters(res.data || [])
      })
      .catch(() => {})
  }, [slug])

  const readableChapters = chapters.filter(
    (c) => !c.externalUrl && !c.isUnavailable
  )

  const filteredChapters = readableChapters.filter((ch) => {
    const term = search.toLowerCase()
    return (
      (ch.chapterNumber || '').toLowerCase().includes(term) ||
      (ch.title || '').toLowerCase().includes(term)
    )
  })

  return (
    <div
      className={classNames(
        'sub-panel scroll-sm',
        isShowSubPanel === SUB_PANEL_ENUM.PANEL_CHAPTER && 'active'
      )}
      id="number-panel"
      style={isMobile ? { maxHeight: height, position: 'fixed' } : {}}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="head">
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <i className="fa-regular fa-magnifying-glass" />
            <input
              type="text"
              className="form-control"
              placeholder="Find number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>
        <button
          className="close-primary btn btn-secondary1"
          id="number-close"
          onClick={handleClosePanel}
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
      <ul>
        {filteredChapters.map((chapter) => (
          <li key={chapter.id}>
            <Link
              href={`/read/${slug}/${lang}/${chapter.id}`}
              title={chapter.title || `Chapter ${chapter.chapterNumber}`}
              className={classNames(chapter.id === currentChapterId && 'active')}
              onClick={handleClosePanel}
            >
              <span>
                {chapter.chapterNumber}. {chapter.title || `Chapter ${chapter.chapterNumber}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SubPanelChapter
