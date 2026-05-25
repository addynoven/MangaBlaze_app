'use client'

import { usePathname } from 'next/navigation'
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'

const { unAuthenticatedEntryPath } = appConfig

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const authenticated = true
  const pathname = usePathname()

  if (!authenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = `${unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${pathname}`
    }
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute
