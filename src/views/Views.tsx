'use client'

import { Suspense } from 'react'
import Loading from '@/components/shared/Loading'

const Views = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense
      fallback={
        <div className="loading-center">
          <Loading loading={true} type="gif" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export default Views
