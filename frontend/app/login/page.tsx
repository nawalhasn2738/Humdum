'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState<'seeker' | 'host'>('seeker')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!email || !password) return setError('Please enter your email and password.')
    await login(email, password, userType)
    const next = new URLSearchParams(window.location.search).get('next')
    router.push(next || '/profile')
  }

  return <div className="min-h-screen bg-cream"><Nav /><main className="mx-auto flex max-w-md flex-col px-5 py-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">Welcome back</p><h1 className="mt-2 font-display text-5xl">Log in to humdum</h1><p className="mt-3 text-muted-foreground">Keep your saved places and applications in one place.</p><form onSubmit={submit} className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="flex gap-2"><button type="button" onClick={() => setUserType('seeker')} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${userType === 'seeker' ? 'bg-sage text-white' : 'bg-sage-light text-sage'}`}>I&apos;m looking</button><button type="button" onClick={() => setUserType('host')} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${userType === 'host' ? 'bg-sage text-white' : 'bg-sage-light text-sage'}`}>I&apos;m listing</button></div><label className="text-sm font-medium">Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" placeholder="you@example.com" /></label><label className="text-sm font-medium">Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" placeholder="••••••••" /></label>{error && <p className="text-sm text-destructive">{error}</p>}<button disabled={isLoading} className="rounded-full bg-rose px-5 py-3 font-semibold text-white disabled:opacity-60">{isLoading ? 'Logging in...' : 'Log in'}</button><p className="text-center text-sm text-muted-foreground">New to humdum? <Link href="/signup" className="font-semibold text-sage">Create an account</Link></p></form></main></div>
}
