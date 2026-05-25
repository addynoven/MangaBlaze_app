'use client'

import Header from '../template/Default/Header'
import Footer from '../template/Default/Footer'
import { usePathname } from 'next/navigation'
import classNames from 'classnames'

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  return (
    <>
      <span className="bg" />
      <div className="wrapper">
        <Header />
        <main className={classNames(pathname === '/' && 'index')}>
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}

export default MainLayout
