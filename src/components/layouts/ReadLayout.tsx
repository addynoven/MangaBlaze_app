'use client'

import { useEffect, useState, useCallback } from 'react'
import classNames from 'classnames'
import { toast } from 'react-hot-toast'
import { isMobile } from 'react-device-detect'
import {
  setActiveSwiper,
  setPageIndex,
  setShowHeader,
  setShowMenu,
  setShowSubPanel,
  useAppDispatch,
  useAppSelector,
} from '@/store'
import Toast from '../ui/Toast'
import Header from '../template/Read/Header'
import ControlMenu from './components/ControlMenu'
import ProgressBar from './components/ProgressBar'
import { useWindowDimensions } from '@/utils/hooks'
import {
  SubPanelChapter,
  SubPanelComment,
  SubPanelPage,
} from './components/SubPanel'
import { PAGE_ENUM } from '@/constants/page.constant'
import scrollToPage from '@/utils/scrollToPage'

const ReadLayout = ({ children }: { children: React.ReactNode }) => {
  const {
    pageType,
    isShowMenu,
    isShowHeader,
    pageIndex,
    activeSwiper,
    isSwiping,
    totalPages,
  } = useAppSelector((state) => state.theme)
  const [isClickable, setIsClickable] = useState(true)
  const dispatch = useAppDispatch()
  const { height } = useWindowDimensions()

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'm':
          dispatch(setShowMenu(!isShowMenu))
          return
        case 'h':
          dispatch(setShowHeader(!isShowHeader))
          return
        case 'n':
          return
        case 'b':
          return
        case 'ArrowLeft':
          if (pageIndex > 1) {
            dispatch(setPageIndex(pageIndex - 1))
            dispatch(setActiveSwiper(activeSwiper - 1))
            scrollToPage(pageIndex - 1)
          }
          return
        case 'ArrowRight':
          if (pageIndex < totalPages && pageIndex >= 1) {
            dispatch(setPageIndex(pageIndex + 1))
            dispatch(setActiveSwiper(activeSwiper + 1))
            scrollToPage(pageIndex + 1)
          }
          return
        default:
          return
      }
    },
    [dispatch, isShowMenu, isShowHeader, pageIndex, activeSwiper, totalPages]
  )

  useEffect(() => {
    if (!isShowHeader && !isShowMenu) {
      let content = 'Press H or move your mouse to the top to show header'
      if (isMobile) {
        content = 'Double tap to show header'
      }
      toast.custom((t) => <Toast t={t} title={content} />)
    }
  }, [isShowMenu, isShowHeader])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keyup', handleKeyPress)
    }
    return () => {
      window.removeEventListener('keyup', handleKeyPress)
    }
  }, [handleKeyPress])

  function handleDoubleClick() {
    if (!isMobile) return
    if (!isClickable) return
    setIsClickable(false)
    dispatch(setShowHeader(!isShowHeader))
    setTimeout(() => setIsClickable(true), 1500)
  }

  function handleCloseControl() {
    if (!isMobile) {
      dispatch(setShowSubPanel(null))
    } else {
      dispatch(setShowMenu(false))
      dispatch(setShowSubPanel(null))
    }
  }

  const styleMaxHeight =
    pageType === PAGE_ENUM.SINGLE && isMobile
      ? { maxHeight: height }
      : {}

  return (
    <>
      <span className="bg" />
      <div className="wrapper" onDoubleClick={handleDoubleClick}>
        <Header />
        <main className={pageType} style={styleMaxHeight}>
          <div className="m-content">
            <div
              id="page-wrapper"
              className={classNames(
                !isMobile && pageIndex === totalPages && !isSwiping && 'on-last-page'
              )}
              onClick={handleCloseControl}
            >
              {children}
            </div>
            <ProgressBar />
            <SubPanelChapter />
            <SubPanelPage />
            <SubPanelComment />
          </div>
          <ControlMenu />
        </main>
      </div>
    </>
  )
}

export default ReadLayout
