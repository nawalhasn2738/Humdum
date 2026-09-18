'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav } from '@/components/nav'

export default function ListPage() {
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)
  function submit(event: FormEvent) { event.preventDefault(); setSubmitted(true) }
  return <div className="min-h-screen bg-cream"><Nav /><main className="mx-auto max-w-2xl px-5 py-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">For hosts</p><h1 className="mt-2 font-display text-5xl">List your place</h1><p className="mt-3 text-muted-foreground">Tell students and working women why your space feels like home.</p>{submitted ? <div className="mt-8 rounded-2xl bg-sage p-8 text-white"><h2 className="font-display text-3xl">Thanks, we received it</h2><p className="mt-2 text-white/75">Our team will review your place before it goes live.</p><button onClick={() => router.push('/')} className="mt-6 rounded-full bg-white px-5 py-3 font-semibold text-sage">Back home</button></div> : <form onSubmit={submit} className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"><label className="text-sm font-medium">Property name<input required className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label><label className="text-sm font-medium">Area<input required placeholder="e.g. F-7, Islamabad" className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label><label className="text-sm font-medium">Monthly price<input required type="number" min="1" className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label><label className="text-sm font-medium">About your place<textarea required rows={4} className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label><button className="rounded-full bg-rose px-5 py-3 font-semibold text-white">Submit for review</button></form>}</main></div>
}
