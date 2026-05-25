import { useState } from 'react'
import classNames from 'classnames'
import { setReaderMode, setTheme, setShowHeader, useAppDispatch, useAppSelector } from '@/store'
import { Direction, ImageFit, PageType, Progress } from './Buttons'
import Modal, { AdvancedModal } from '@/components/ui/Modal'

const Bottom = () => {
  const [openSettings, setOpenSettings] = useState(false)
  const dispatch = useAppDispatch()
  const { isShowHeader, readerMode, activeTheme } = useAppSelector((state) => state.theme)

  const onToggleHeader = () => {
    dispatch(setShowHeader(!isShowHeader))
  }

  const onToggleReaderMode = () => {
    dispatch(setReaderMode(!readerMode))
  }

  const handleOpenSettings = () => setOpenSettings(true)
  const handleCloseSettings = () => setOpenSettings(false)

  const themes = [
    { id: 'dark', label: 'Dark', icon: 'fa-moon' },
    { id: 'light', label: 'Light', icon: 'fa-sun' },
    { id: 'sepia', label: 'Sepia', icon: 'fa-book-open' },
    { id: 'oled', label: 'OLED', icon: 'fa-star' },
  ]

  return (
    <>
      <div className="btn-options mb-2">
        <div className="d-block mb-2">
          <button className="justify-content-between" onClick={onToggleReaderMode}>
            <span>{readerMode ? 'Reader Mode ON' : 'Reader Mode OFF'}</span>
            <i className={classNames("fa-light fa-lg", readerMode ? "fa-eye-slash" : "fa-eye")}></i>
          </button>
        </div>
        <div data-value="sticky" className="d-block mb-2">
          <button className="justify-content-between" onClick={onToggleHeader}>
            <span>{isShowHeader ? 'Header Sticky' : 'Header Hidden'}</span>
            {isShowHeader ? (
              <i className="fa-light fa-window-maximize fa-lg"></i>
            ) : (
              <i className="fa-light fa-square fa-lg"></i>
            )}
          </button>
        </div>
      </div>

      <div className="text-muted small mb-2 uppercase fw-bold">Reading Theme</div>
      <div className="d-flex flex-wrap gap-1 mb-3">
        {themes.map(t => (
          <button 
            key={t.id}
            className={classNames("btn btn-sm flex-grow-1", activeTheme === t.id ? "btn-primary" : "btn-secondary1")}
            onClick={() => dispatch(setTheme(t.id as any))}
            style={{ fontSize: 11, padding: '6px 4px' }}
          >
            <i className={classNames("fa-solid mr-1", t.icon)}></i>
            {t.label}
          </button>
        ))}
      </div>

      <PageType />
      <ImageFit />
      <Direction />
      <Progress />
      <button className="jb-btn" onClick={handleOpenSettings}>
        <span>Advanced Settings</span>
        <i className="fa-light fa-sliders fa-lg"></i>
      </button>
      <Modal
        open={openSettings}
        onClose={handleCloseSettings}
        className="advanced-settings"
      >
        <AdvancedModal />
      </Modal>
    </>
  )
}

export default Bottom
