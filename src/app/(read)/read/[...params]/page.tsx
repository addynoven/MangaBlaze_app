'use client'

import { useParams } from 'next/navigation'
import Read from '@/views/read'

export default function ReadPage() {
  const params = useParams()
  const { params: slugParams } = params
  const slug = Array.isArray(slugParams) ? slugParams[0] : slugParams
  const lang = Array.isArray(slugParams) ? slugParams[1] : undefined
  const chapter = Array.isArray(slugParams) ? slugParams[2] : undefined

  return (
    <Read
      slug={slug as string}
      lang={lang as string}
      chapter={chapter as string}
    />
  )
}
