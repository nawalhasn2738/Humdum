'use client'

import Link from 'next/link'
import { Nav } from '@/components/nav'
import { useAuth } from '@/lib/auth-context'

export default function ApplicationsPage() {
  const { applications } = useAuth()
  return <div className="min-h-screen bg-cream"><Nav /><main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-5 sm:py-16"><p className="text-xs font-bold uppercase tracking-[0.16em] text-rose">Your journey</p><h1 className="mt-2 break-words font-display text-4xl leading-tight sm:text-5xl">Applications</h1>{applications.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-6 text-center sm:p-12"><h2 className="font-display text-2xl">No applications yet</h2><p className="mt-2 text-muted-foreground">When you apply for a place, you will see its status here.</p><Link href="/#places" className="mt-6 inline-flex rounded-full bg-sage px-5 py-3 font-semibold text-white">Find a place</Link></div> : <div className="mt-8 grid gap-4">{applications.map(application => <article key={application.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-display text-2xl">{application.listingTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{application.area} · PKR {application.price.toLocaleString()} / month</p></div><span className="rounded-full bg-sage-light px-3 py-1 text-sm font-semibold text-sage">{application.status}</span></div><p className="mt-4 text-sm text-muted-foreground">Applied {new Date(application.appliedAt).toLocaleDateString()}</p><Link href={`/listing/${application.listingId}`} className="mt-4 inline-flex font-semibold text-rose">View place</Link></article>)}</div>}</main></div>
}
