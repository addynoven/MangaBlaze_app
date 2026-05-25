import React, { useEffect, useRef, HTMLProps } from 'react'
import classNames from 'classnames'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CSSTransition } from 'react-transition-group'

type NavMobileProps = {
  openNav: boolean
  onCloseNav: () => void
}

const NavMobile = (props: NavMobileProps) => {
  const { openNav, onCloseNav } = props
  const pathname = usePathname()
  const nodeRef = useRef(null)

  useEffect(() => {
    onCloseNav()
  }, [pathname])

  return (
    <CSSTransition
      in={openNav}
      timeout={300}
      classNames="nav-menu"
      mountOnEnter
      unmountOnExit
      nodeRef={nodeRef}
    >
      <div
        ref={nodeRef}
        className={classNames('nav-mobile', openNav && 'open')}
        style={
          {
            '--width': '140px',
          } as React.CSSProperties
        }
      >
        <div className="content">
          <ul>
            <li>
              <Link href="/home">Library</Link>
            </li>
            <li>
              <Link href="/updates">Updates</Link>
            </li>
            <li>
              <Link href="/browse">Browse</Link>
            </li>
            <li>
              <Link href="/history">History</Link>
            </li>
            <li>
              <Link href="/random" title="Random Manga">
                <i className="mr-1 fa-regular fa-shuffle"></i> Random
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </CSSTransition>
  )
}
export default NavMobile

type UlWrapperProps = {
  children: React.ReactNode
  open: boolean
  className?: string
} & HTMLProps<HTMLUListElement>

const UlWrapper = (props: UlWrapperProps) => {
  const { children, open, className, ...rest } = props
  const nodeRef = useRef(null)
  return (
    <CSSTransition
      in={open}
      timeout={300}
      unmountOnExit
      mountOnEnter
      nodeRef={nodeRef}
      classNames="menu"
    >
      <ul ref={nodeRef} className={className} {...rest}>
        {children}
      </ul>
    </CSSTransition>
  )
}
