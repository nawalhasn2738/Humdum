'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { decideRouteAccess, homeForRole, type UserRole } from '@/lib/route-access'

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: readonly UserRole[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, status, authError, refreshIdentity } = useAuth()
  const decision = decideRouteAccess(status, user?.userType, allowedRoles)

  useEffect(() => {
    if (decision === 'unauthenticated') router.replace('/login?next=' + encodeURIComponent(pathname))
    else if (decision === 'forbidden' && user) router.replace(homeForRole(user.userType))
  }, [decision, pathname, router, user])

  if (decision === 'authorized') return children

  if (decision === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-cream px-4 text-center">
        <div>
          <p role="alert" className="text-sm font-semibold text-[#756960]">{authError || 'Humdum could not verify your account with the server.'}</p>
          <button type="button" onClick={() => void refreshIdentity()} className="mt-4 rounded-full bg-peach px-4 py-2 text-sm font-bold text-[#49362A]">Try again</button>
        </div>
      </main>
    )
  }

  const message = decision === 'loading' ? 'Verifying your secure session...' : decision === 'forbidden' ? 'Redirecting to your account...' : 'Redirecting to log in...'
  return <main className="grid min-h-screen place-items-center bg-cream px-4 text-center"><p role="status" className="text-sm font-semibold text-[#756960]">{message}</p></main>
}
