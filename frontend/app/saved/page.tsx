'use client'

import Link from 'next/link'
import { Nav } from '@/components/nav'

export default function SavedPage() {
  return <div className="min-h-screen bg-cream"><Nav /><main className="mx-auto max-w-4xl px-5 py-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">Your shortlist</p><h1 className="mt-2 font-display text-5xl">Saved places</h1><div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center"><h2 className="font-display text-2xl">Nothing saved yet</h2><p className="mt-2 text-muted-foreground">Tap the heart on any listing to save it here.</p><Link href="/#places" className="mt-6 inline-flex rounded-full bg-sage px-5 py-3 font-semibold text-white">Explore places</Link></div></main></div>
}
