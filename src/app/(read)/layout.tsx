'use client'

import ReadLayout from '@/components/layouts/ReadLayout'

export default function ReadLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <ReadLayout>{children}</ReadLayout>
}
