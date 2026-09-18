'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { useAuth } from '@/lib/auth-context'

export default function SignupPage() {
  const router = useRouter()
  const { signup, isLoading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState<'seeker' | 'host'>('seeker')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name || !email || password.length < 6) return
    await signup(email, password, name, userType)
    router.push('/profile')
  }

  return <div className="min-h-screen bg-cream"><Nav /><main className="mx-auto flex max-w-md flex-col px-5 py-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">Start your next chapter</p><h1 className="mt-2 font-display text-5xl">Join humdum</h1><form onSubmit={submit} className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="flex gap-2"><button type="button" onClick={() => setUserType('seeker')} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${userType === 'seeker' ? 'bg-sage text-white' : 'bg-sage-light text-sage'}`}>Find a place</button><button type="button" onClick={() => setUserType('host')} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${userType === 'host' ? 'bg-sage text-white' : 'bg-sage-light text-sage'}`}>List a place</button></div><label className="text-sm font-medium">Full name<input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" required /></label><label className="text-sm font-medium">Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" required /></label><label className="text-sm font-medium">Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" minLength={6} className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" required /></label><button disabled={isLoading} className="rounded-full bg-rose px-5 py-3 font-semibold text-white disabled:opacity-60">{isLoading ? 'Creating account...' : 'Create account'}</button><p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-sage">Log in</Link></p></form></main></div>
}
