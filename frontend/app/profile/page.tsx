'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getAuthErrorMessage } from '@/lib/supabase'

function roleHome(role: string) {
  if (role === 'landlord') return '/landlord/dashboard'
  if (role === 'admin') return '/admin'
  return '/listings'
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, status, authError, refreshIdentity, logout } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?next=/profile')
    else if (status === 'authenticated' && user?.userType !== 'tenant') router.replace(roleHome(user?.userType || ''))
  }, [router, status, user])

  async function signOut() {
    setError('')
    try {
      await logout()
      router.replace('/')
    } catch (logoutError) {
      setError(getAuthErrorMessage(logoutError))
    }
  }

  if (status === 'error') {
    return <main className="grid min-h-screen place-items-center bg-cream px-4 text-center"><div><p role="alert" className="text-sm font-semibold text-[#756960]">{authError}</p><button type="button" onClick={() => void refreshIdentity()} className="mt-4 rounded-full bg-peach px-4 py-2 text-sm font-bold">Try again</button></div></main>
  }

  if (status !== 'authenticated' || !user || user.userType !== 'tenant') {
    return <main className="grid min-h-screen place-items-center bg-cream"><p role="status" className="text-sm font-semibold text-[#756960]">Restoring your secure session...</p></main>
  }

  return <ProfileDetails user={user} error={error} onLogout={signOut} />
}

function ProfileDetails({
  user,
  error,
  onLogout,
}: {
  user: { id: string; name: string; email: string; userType: string }
  error: string
  onLogout: () => Promise<void>
}) {
  return (
    <div className="min-h-screen bg-cream px-4 py-12 text-[#443A34]">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#E3D9CF] bg-white shadow-[0_18px_45px_rgba(89,64,48,0.09)]">
        <div className="bg-gradient-to-r from-blush/70 to-sage/45 p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#81756D]">
            Your profile
          </p>
          <h1 className="mt-2 font-heading text-4xl">{user.name}</h1>
          <p className="mt-2 text-sm text-[#6E625A]">{user.email}</p>
        </div>

        <dl className="divide-y divide-[#E9E1D9] p-6">
          <Detail label="Role" value={user.userType} />
          <Detail label="Email" value={user.email} />
          <Detail label="Supabase user ID" value={user.id} />
        </dl>

        <div className="flex flex-wrap items-center gap-4 border-t border-[#E9E1D9] bg-[#FCF9F5] p-6">
          <Link href="/listings" className="text-sm font-bold text-[#77734E]">Listings</Link>
          <Link href="/messages" className="text-sm font-bold text-[#77734E]">Messages</Link>
          <Link href="/profile/family" className="text-sm font-bold text-[#77734E]">Family safety</Link>
          <button
            type="button"
            onClick={onLogout}
            className="ml-auto rounded-full border border-[#DDD2C7] bg-white px-5 py-2 text-sm font-bold"
          >
            Log out
          </button>
        </div>
        {error && (
          <p role="alert" className="px-6 pb-5 text-xs font-semibold text-[#B54B4B]">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr]">
      <dt className="text-xs font-bold uppercase text-[#857970]">{label}</dt>
      <dd className="break-all text-sm font-semibold">{value}</dd>
    </div>
  )
}
