'use client'

import { PropsWithChildren } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthority } from '@/utils/hooks'

type AuthorityGuardProps = PropsWithChildren<{
  userAuthority?: string[]
  authority?: string[]
}>

const AuthorityGuard = (props: AuthorityGuardProps) => {
  const { userAuthority = [], authority = [], children } = props
  const router = useRouter()

  const roleMatched = useAuthority(userAuthority, authority)

  if (!roleMatched) {
    router.push('/sign-in')
    return null
  }

  return <>{children}</>
}

export default AuthorityGuard
