'use client'

import { useRouter } from 'next/navigation'
import appConfig from '@/configs/app.config'

const { authenticatedEntryPath } = appConfig

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const authenticated = true
  const router = useRouter()

  if (authenticated) {
    router.push(authenticatedEntryPath)
    return null
  }

  return <>{children}</>
}

export default PublicRoute
