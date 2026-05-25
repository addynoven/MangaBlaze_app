import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  setActiveSwiper,
  setPageIndex,
  setShowMenu,
  setShowSubPanel,
  useAppDispatch,
  useAppSelector,
} from '@/store'
import { SubPanelType } from '@/@types/theme'
import { SUB_PANEL_ENUM } from '@/constants/panel.constant'
import { ChapVolSwitch, LangSwitch } from './Buttons'
import scrollToPage from '@/utils/scrollToPage'
import { getSelectedSource } from '@/lib/sourceStorage'

import type { SourceMangaDetail, SourceChapter } from '@/lib/sources'

const Top = () => {
  const dispatch = useAppDispatch()
  const { isShowMenu, pageIndex, isShowSubPanel, activeSwiper, totalPages } =
    useAppSelector((state) => state.theme)

  const params = useParams()
  const slugParams = params?.params
  const slug = Array.isArray(slugParams) ? slugParams[0] : slugParams
  const lang = Array.isArray(slugParams) ? slugParams[1] : 'en'
  const chapter = Array.isArray(slugParams) ? slugParams[2] : undefined

  const [manga, setManga] = useState<SourceMangaDetail | null>(null)
  const [chapters, setChapters] = useState<SourceChapter[]>([])

  useEffect(() => {
    if (!slug) return
    const source = getSelectedSource()
    Promise.all([
      fetch(`/api/manga/detail?id=${slug}&source=${source}`).then((r) => r.json()),
      fetch(`/api/manga/detail/feed?id=${slug}&limit=100&source=${source}`).then((r) => r.json()),
    ])
      .then(([mangaRes, feedRes]) => {
        setManga(mangaRes || null)
        setChapters(feedRes.data || [])
      })
      .catch(() => {})
  }, [slug])

  const readableChapters = chapters.filter(
    (c) => !c.externalUrl && !c.isUnavailable
  )
  const currentChapterIdx = readableChapters.findIndex((c) => c.id === chapter)
  const currentChapter = readableChapters[currentChapterIdx]
  const chapterNumber = currentChapter?.chapterNumber || '?'

  const prevChapter =
    currentChapterIdx !== -1 && currentChapterIdx < readableChapters.length - 1
      ? readableChapters[currentChapterIdx + 1]
      : null
  const nextChapter =
    currentChapterIdx !== -1 && currentChapterIdx > 0
      ? readableChapters[currentChapterIdx - 1]
      : null

  const onToggleMenu = () => {
    dispatch(setShowMenu(!isShowMenu))
  }

  const handlePrevPage = () => {
    if (pageIndex > 1) {
      dispatch(setPageIndex(pageIndex - 1))
      dispatch(setActiveSwiper(activeSwiper - 1))
      scrollToPage(pageIndex - 1)
    }
  }

  const handleNextPage = () => {
    if (pageIndex < totalPages && pageIndex >= 1) {
      dispatch(setPageIndex(pageIndex + 1))
      dispatch(setActiveSwiper(activeSwiper + 1))
      scrollToPage(pageIndex + 1)
    }
  }

  const handleTogglePanel = (type: SubPanelType) => {
    dispatch(setShowSubPanel(type === isShowSubPanel ? null : type))
  }

  return (
    <>
      <div className="head">
        <Link href={`/manga/${slug}`}>{manga?.title || slug}</Link>
        <div
          onClick={onToggleMenu}
          className="close-primary btn btn-secondary1 tooltipz"
          id="ctrl-menu-close"
          title="Use M button to toggle"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </div>
      </div>
      <ChapVolSwitch />
      <LangSwitch />

      {/* Page */}
      <nav>
        <button className="page-btn" id="page-go-left" onClick={handlePrevPage}>
          <i className="fa-regular fa-chevron-left"></i>
        </button>
        <button
          className="page-toggler"
          onClick={() => handleTogglePanel(SUB_PANEL_ENUM.PANEL_PAGE)}
        >
          <b>
            Page <span className="current-page">{pageIndex}</span>
          </b>
          <i className="fa-solid fa-sort fa-sm"></i>
        </button>
        <button
          className="page-btn"
          id="page-go-right"
          onClick={handleNextPage}
        >
          <i className="fa-regular fa-chevron-right"></i>
        </button>
      </nav>
      {/* Chapter */}
      <nav>
        {prevChapter ? (
          <Link href={`/read/${slug}/${lang}/${prevChapter.id}`} id="number-go-left" className="d-flex align-items-center justify-content-center">
            <i className="fa-regular fa-chevron-left"></i>
          </Link>
        ) : (
          <button id="number-go-left" style={{ opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}>
            <i className="fa-regular fa-chevron-left"></i>
          </button>
        )}
        <button
          className="number-toggler"
          onClick={() => handleTogglePanel(SUB_PANEL_ENUM.PANEL_CHAPTER)}
        >
          <b className="current-type-number text-title">chapter {chapterNumber}</b>
          <i className="fa-solid fa-sort fa-sm"></i>
        </button>
        {nextChapter ? (
          <Link href={`/read/${slug}/${lang}/${nextChapter.id}`} id="number-go-right" className="d-flex align-items-center justify-content-center">
            <i className="fa-regular fa-chevron-right"></i>
          </Link>
        ) : (
          <button id="number-go-right" style={{ opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}>
            <i className="fa-regular fa-chevron-right"></i>
          </button>
        )}
      </nav>
      {/* Comment */}
      <button
        id="comment-toggler"
        className="jb-btn"
        onClick={() => handleTogglePanel(SUB_PANEL_ENUM.PANEL_COMMENT)}
      >
        <i className="fa-light fa-message-dots fa-flip-horizontal fa-lg"></i>
        <span>
          <span className="current-type-number text-title">chapter {chapterNumber} </span>
          Comment
        </span>
      </button>
      {/* Bookmark */}
      <div className="dropdown favourite" data-id="26256" data-fetch="true">
        <button className="jb-btn">
          <i className="fa-light fa-folder-bookmark fa-lg"></i>
          <span>Bookmark</span>
        </button>
        <div className="dropdown-menu dropdown-menu-right w-100 folders"></div>
      </div>

      <Link href={`/manga/${slug}`} className="jb-btn">
        <i className="fa-light fa-lg fa-circle-info"></i>
        <span>Manga Detail</span>
      </Link>
      <button className="jb-btn" data-toggle="modal" data-target="#report">
        <i className="fa-light fa-lg fa-triangle-exclamation"></i>
        <span>Report Error</span>
      </button>
    </>
  )
}

export default Top
