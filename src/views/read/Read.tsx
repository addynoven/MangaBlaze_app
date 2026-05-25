import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import classNames from 'classnames'
import { SwiperRef } from 'swiper/react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { FIT_ENUM } from '@/constants/fit.constant'
import { PAGE_ENUM } from '@/constants/page.constant'
import {
  setActiveSwiper,
  setPageIndex,
  setTotalPages,
  toggleShowMenu,
  useAppDispatch,
  useAppSelector,
} from '@/store'
import { getSelectedSource } from '@/lib/sourceStorage'
import type { SourceChapter } from '@/lib/sources'
import { DoubleImage, LongStripImage, Single } from './components'
import ChapterSidebar from './components/ChapterSidebar'
import { reportSourceHealth } from '@/utils/health'
import { updateProgressLocal } from '@/store/slices/library/librarySlice'

export const fitClassName = {
  [FIT_ENUM.FIT_WIDTH]: 'fit-w',
  [FIT_ENUM.FIT_HEIGHT]: 'fit-h',
  [FIT_ENUM.FIT_BOTH]: 'fit-w fit-h',
  [FIT_ENUM.FIT_NO_LIMIT]: '',
}

type ReadProps = {
  slug: string
  lang?: string
  chapter?: string
}

const Read = ({ slug, lang = 'en', chapter }: ReadProps) => {
  const swiperRef = useRef<SwiperRef>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const sourceId = searchParams.get('source') || getSelectedSource()
  
  const [isClickable, setIsClickable] = useState(true)
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(!!chapter)
  const [chapters, setChapters] = useState<SourceChapter[]>([])
  const [showSidebar, setShowSidebar] = useState(false)
  const [nextChapterPages, setNextChapterPages] = useState<string[]>([])

  const dispatch = useAppDispatch()
  const signedIn = useAppSelector((state) => state.auth.session.signedIn)
  const { pageType, pageIndex, fitType, activeSwiper, isSwiping, readerMode, activeTheme } =
    useAppSelector((state) => state.theme)

  // Memoize readable chapters and navigation
  const readableChapters = useMemo(() => chapters.filter(
    (c) => !c.externalUrl && !c.isUnavailable
  ), [chapters])

  const currentChapterIdx = useMemo(() => readableChapters.findIndex((c) => c.id === chapter), [readableChapters, chapter])

  const prevChapter = useMemo(() => (
    currentChapterIdx !== -1 && currentChapterIdx < readableChapters.length - 1
      ? readableChapters[currentChapterIdx + 1]
      : null
  ), [currentChapterIdx, readableChapters])

  const nextChapter = useMemo(() => (
    currentChapterIdx !== -1 && currentChapterIdx > 0
      ? readableChapters[currentChapterIdx - 1]
      : null
  ), [currentChapterIdx, readableChapters])

  const sourceParam = useMemo(() => sourceId ? `?source=${sourceId}` : '', [sourceId])

  useEffect(() => {
    if (!slug) return
    const start = Date.now()
    fetch(`/api/manga/detail/feed?id=${slug}&limit=500&source=${sourceId}`)
      .then((r) => r.json())
      .then((res) => {
        const latency = Date.now() - start
        reportSourceHealth(sourceId, !!res.data, latency)
        setChapters(res.data || [])
      })
      .catch(() => {
        const latency = Date.now() - start
        reportSourceHealth(sourceId, false, latency, 'Network error')
      })
  }, [slug, sourceId])

  // Track Progress
  useEffect(() => {
    if (!slug || !chapter || !sourceId) return
    
    // Find current chapter info for number
    const currentChap = chapters.find(c => c.id === chapter)
    
    const saveProgress = async () => {
      // Local update (Redux) - Always do this for guest support and instant UI
      if (currentChap) {
        dispatch(updateProgressLocal({
          id: slug,
          source: sourceId,
          title: slug, // Title might be unknown here
          cover: '', 
          lastReadChapter: currentChap.chapterNumber || '?',
          lastReadChapterId: chapter,
          updatedAt: new Date().toISOString()
        }))
      }

      if (signedIn) {
        try {
          await fetch('/api/user/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mangaId: slug,
              sourceId: sourceId,
              chapterId: chapter,
              chapterNumber: currentChap?.chapterNumber || '?',
              pageIndex: pageIndex
            })
          })

          // Tracker Sync
          if (pageIndex >= pages.length - 1 && pages.length > 0 && currentChap?.chapterNumber) {
            fetch('/api/user/tracker/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mangaTitle: slug,
                chapterNumber: currentChap.chapterNumber,
                type: 'manga'
              })
            }).catch(() => {})
          }
        } catch (e) {}
      }
    }

    const timer = setTimeout(saveProgress, 2000)
    return () => clearTimeout(timer)
  }, [slug, chapter, sourceId, pageIndex, chapters, pages.length, signedIn, dispatch])

  // Fetch chapter pages
  useEffect(() => {
    if (!chapter) return

    let active = true
    Promise.resolve().then(() => {
      if (active) setLoading(true)
    })

    const start = Date.now()
    fetch(`/api/chapter/pages?id=${chapter}&source=${sourceId}&mangaId=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const latency = Date.now() - start
        
        let imageUrls: string[] = []
        // MangaDex format: baseUrl + hash + file names
        const hash = data.chapter?.hash || data.hash
        const files = data.chapter?.data || data.data || []
        if (data.baseUrl && hash && files.length) {
          imageUrls = files.map(
            (file: string) => `${data.baseUrl}/data/${hash}/${file}`
          )
        } else if (Array.isArray(data.pages) && data.pages.length) {
          // Normalized format with {url, index} objects
          imageUrls = data.pages.map((p: { url: string }) => p.url)
        } else if (files.length && typeof files[0] === 'string' && files[0].startsWith('http')) {
          // Array of full URLs
          imageUrls = files
        }
        
        reportSourceHealth(sourceId, imageUrls.length > 0, latency)

        if (imageUrls.length) {
          setPages(imageUrls)
          dispatch(setTotalPages(imageUrls.length))
        }
        setLoading(false)
      })
      .catch(() => {
        const latency = Date.now() - start
        reportSourceHealth(sourceId, false, latency, 'Network error')
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [chapter, dispatch, sourceId, slug])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'Escape') {
        dispatch(toggleShowMenu())
      }
      if (e.key === 'ArrowLeft') {
        if (pageIndex > 1) {
          dispatch(setPageIndex(pageIndex - 1))
          dispatch(setActiveSwiper(activeSwiper - 1))
          if (isSwiping) swiperRef.current?.swiper.slidePrev()
        } else if (prevChapter) {
          router.push(`/read/${slug}/${lang}/${prevChapter.id}${sourceParam}`)
        }
      }
      if (e.key === 'ArrowRight') {
        if (pageIndex < pages.length) {
          dispatch(setPageIndex(pageIndex + 1))
          dispatch(setActiveSwiper(activeSwiper + 1))
          if (isSwiping) swiperRef.current?.swiper.slideNext()
        } else if (nextChapter) {
          router.push(`/read/${slug}/${lang}/${nextChapter.id}${sourceParam}`)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pageIndex, pages.length, prevChapter, nextChapter, dispatch, activeSwiper, isSwiping, router, slug, lang, sourceParam])

  // Prefetch Next Chapter
  useEffect(() => {
    if (pageIndex >= pages.length - 2 && nextChapter && nextChapterPages.length === 0) {
      fetch(`/api/chapter/pages?id=${nextChapter.id}&source=${sourceId}&mangaId=${slug}`)
        .then((r) => r.json())
        .then((data) => {
          let imageUrls: string[] = []
          const hash = data.chapter?.hash || data.hash
          const files = data.chapter?.data || data.data || []
          if (data.baseUrl && hash && files.length) {
            imageUrls = files.map((file: string) => `${data.baseUrl}/data/${hash}/${file}`)
          } else if (Array.isArray(data.pages) && data.pages.length) {
            imageUrls = data.pages.map((p: { url: string }) => p.url)
          } else if (files.length && typeof files[0] === 'string') {
            imageUrls = files
          }
          
          if (imageUrls.length) {
            setNextChapterPages(imageUrls)
            imageUrls.slice(0, 3).forEach(src => {
              const img = new Image()
              img.src = src
            })
          }
        })
        .catch(() => {})
    }
  }, [pageIndex, pages.length, nextChapter, sourceId, nextChapterPages.length, slug])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) setNextChapterPages([])
    })
    return () => { active = false }
  }, [chapter])

  // Prefetch Current Chapter Pages
  useEffect(() => {
    if (pages.length > 0 && pageIndex < pages.length) {
      const nextPages = pages.slice(pageIndex, pageIndex + 2)
      nextPages.forEach(src => {
        const img = new Image()
        img.src = src
      })
    }
  }, [pageIndex, pages])

  const handleChangePage = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (!isClickable) return
    if (!['singlepage', 'doublepage'].includes(pageType)) return
    const clickX =
      e.clientX - (e.target as HTMLDivElement).getBoundingClientRect().left
    const divWidth = (e.target as HTMLDivElement).offsetWidth
    const leftPercentage = (clickX / divWidth) * 100
    const rightPercentage = 100 - leftPercentage
    
    setIsClickable(false)

    // Center click toggles menu
    if (leftPercentage > 30 && rightPercentage > 30) {
      dispatch(toggleShowMenu())
      setTimeout(() => setIsClickable(true), 300)
      return
    }

    if (leftPercentage <= 30 && pageIndex > 1) {
      dispatch(setPageIndex(pageIndex - 1))
      dispatch(setActiveSwiper(activeSwiper - 1))
      if (isSwiping) swiperRef.current?.swiper.slidePrev()
    }
    if (rightPercentage <= 30 && pageIndex < pages.length && pageIndex >= 1) {
      dispatch(setPageIndex(pageIndex + 1))
      dispatch(setActiveSwiper(activeSwiper + 1))
      if (isSwiping) swiperRef.current?.swiper.slideNext()
    }
    setTimeout(() => setIsClickable(true), isSwiping ? 300 : 0)
  }, [isClickable, pageType, dispatch, pageIndex, activeSwiper, isSwiping, pages.length])

  if (loading) {
    return (
      <div className="pages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading chapter...</span>
        </div>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className="pages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
        <h3>No chapter selected or chapter not found</h3>
        <Link href={`/manga/${slug}${sourceParam}`} className="btn btn-primary">Back to Manga</Link>
      </div>
    )
  }

  return (
    <div
      className={classNames(
        'pages',
        pageType,
        `theme-${activeTheme}`,
        pageType === PAGE_ENUM.SINGLE && isSwiping && 'swiper'
      )}
      dir="ltr"
      onClick={handleChangePage}
    >
      {/* Floating Navigation Controls */}
      {!readerMode && (
        <>
          <div className="fixed top-4 left-4 z-[500] d-flex flex-column gap-2">
            <Link href="/home" className="reader-floating-btn" title="Home">
              <i className="fa-solid fa-house fa-lg"></i>
            </Link>
            <Link href={`/manga/${slug}${sourceParam}`} className="reader-floating-btn" title="Back to Manga">
              <i className="fa-solid fa-book fa-lg"></i>
            </Link>
          </div>

          <div className="fixed top-4 right-4 z-[500]">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowSidebar(true); }}
              className="reader-floating-btn primary" 
              title="Chapters"
            >
              <i className="fa-solid fa-list-ul fa-xl"></i>
            </button>
          </div>
        </>
      )}

      <ChapterSidebar 
        open={showSidebar} 
        onClose={() => setShowSidebar(false)}
        chapters={chapters}
        currentChapterId={chapter}
        mangaId={slug}
        sourceId={sourceId}
      />

      {pageType === PAGE_ENUM.LONG_STRIP && (
        <>
          {pages.map((src, index) => (
            <LongStripImage key={index} src={src} index={index} />
          ))}
        </>
      )}
      <Single swiperRef={swiperRef} pages={pages} />
      {pageType === PAGE_ENUM.DOUBLE && (
        <div className={classNames('page', fitClassName[fitType])}>
          {pages.map((src, index) => (
            <DoubleImage key={index} src={src} index={index + 1} />
          ))}
        </div>
      )}

      <div
        className={classNames(
          'number-nav ltr',
          pageType !== PAGE_ENUM.LONG_STRIP && 'abs show'
        )}
      >
        {prevChapter ? (
          <Link href={`/read/${slug}/${lang}/${prevChapter.id}${sourceParam}`} className="prev">
            <i className="ltr-icon fa-solid fa-arrow-left mr-1"></i>
            Previous chapter
          </Link>
        ) : (
          <span className="prev disabled" style={{ opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}>
            <i className="ltr-icon fa-solid fa-arrow-left mr-1"></i>
            Previous chapter
          </span>
        )}
        {nextChapter ? (
          <Link href={`/read/${slug}/${lang}/${nextChapter.id}${sourceParam}`} className="next">
            Next chapter
            <i className="fa-solid fa-arrow-right ml-1"></i>
          </Link>
        ) : (
          <span className="next disabled" style={{ opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}>
            Next chapter
            <i className="fa-solid fa-arrow-right ml-1"></i>
          </span>
        )}
      </div>
    </div>
  )
}

export default Read
