'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth, type UserRole } from '@/lib/auth-context'

type AuthMode = 'login' | 'signup'
type DisplayRole = 'Tenant' | 'Landlord' | 'Admin'

const roles: DisplayRole[] = ['Tenant', 'Landlord', 'Admin']

const roleMap: Record<DisplayRole, UserRole> = {
  Tenant: 'seeker',
  Landlord: 'host',
  Admin: 'admin',
}

const fieldClass =
  'mt-1.5 h-11 w-full rounded-xl border border-[#DDD2C8] bg-[#F6EDE4] px-3.5 text-sm text-[#443A34] outline-none transition placeholder:text-[#B0A79F] focus:border-terracotta focus:bg-white focus:ring-3 focus:ring-blush/45'

export function AuthScreen({ initialMode }: { initialMode: AuthMode }) {
  const router = useRouter()
  const { login, signup, isLoading } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [role, setRole] = useState<DisplayRole>('Tenant')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError('')
    const url = new URL(window.location.href)
    url.pathname = nextMode === 'login' ? '/login' : '/signup'
    window.history.replaceState(null, '', url.pathname + url.search)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    if (mode === 'signup' && (!name.trim() || !phone.trim())) {
      setError('Please enter your full name and private phone number.')
      return
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    const userRole = roleMap[role]
    try {
      if (mode === 'signup') {
        await signup(email.trim(), password, name.trim(), userRole, phone.trim())
      } else {
        await login(email.trim(), password, userRole, phone.trim() || undefined)
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to continue.')
      return
    }

    const next = new URLSearchParams(window.location.search).get('next')
    router.push(next || '/profile')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-8 text-[#4B4039] sm:py-12">
      <section
        aria-labelledby="auth-heading"
        className="w-full max-w-[380px] rounded-2xl border border-[#E2DAD2] bg-white px-6 py-7 shadow-[0_18px_45px_rgba(89,64,48,0.10)] sm:px-8 sm:py-8"
      >
        <Link
          href="/"
          className="mx-auto flex w-fit items-center gap-1.5 font-heading text-2xl font-semibold text-[#3E332D]"
        >
          <span
            aria-hidden="true"
            className="size-7 rounded-lg bg-gradient-to-br from-terracotta to-peach"
          />
          Humdum
        </Link>

        <h1 id="auth-heading" className="sr-only">
          {mode === 'login' ? 'Log in to Humdum' : 'Sign up for Humdum'}
        </h1>

        <div className="mt-5 flex border-b border-[#E9E1D9]" role="tablist" aria-label="Authentication mode">
          {(['login', 'signup'] as AuthMode[]).map((item) => {
            const active = mode === item
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchMode(item)}
                className={'relative min-h-10 flex-1 pb-2 text-sm font-bold transition ' +
                  (active ? 'text-[#443A34]' : 'text-[#857970] hover:text-[#5E5149]')}
              >
                {item === 'login' ? 'Log in' : 'Sign up'}
                {active && <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-terracotta" />}
              </button>
            )
          })}
        </div>

        <div className="mt-6 grid grid-cols-3 rounded-full bg-[#F3E9DF] p-1" aria-label="Select account role">
          {roles.map((item) => {
            const active = role === item
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => setRole(item)}
                className={'min-h-9 rounded-full px-2 text-xs font-bold transition sm:text-sm ' +
                  (active
                    ? 'bg-white text-[#433831] shadow-[0_3px_10px_rgba(92,68,52,0.12)]'
                    : 'text-[#70645C] hover:text-[#443A34]')}
              >
                {item}
              </button>
            )
          })}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3.5" noValidate>
          <label className="block text-xs font-bold text-[#62564E]">
            Full name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="Ayesha Khan"
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-bold text-[#62564E]">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-bold text-[#62564E]">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="********"
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-bold text-[#62564E]">
            Phone <span className="font-semibold text-[#857970]">(kept private)</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="03xx-xxxxxxx"
              className={fieldClass}
            />
          </label>

          <div aria-live="polite" className="min-h-5">
            {error && <p className="text-xs font-semibold text-[#B54B4B]">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-peach to-peach-deep px-5 text-sm font-bold text-[#49362A] shadow-[0_7px_18px_rgba(231,151,150,0.24)] transition hover:brightness-[1.02] disabled:cursor-wait disabled:opacity-65"
          >
            {isLoading
              ? mode === 'login' ? 'Logging in...' : 'Creating account...'
              : mode === 'login' ? 'Log in' : 'Sign up as ' + role}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-5 text-[#81756D]">
          This is a prototype - any details will sign you in.
        </p>
      </section>
    </main>
  )
}
