import Link from 'next/link'
import { ShieldCheck, LockKeyhole, PhoneCall, ArrowLeft } from 'lucide-react'
import { Nav } from '@/components/nav'

const checks = [
  ['Identity and ownership', 'We confirm the host or manager has the right to offer the space and keep contact details current.'],
  ['Physical safety', 'Our checklist covers secure entry, lighting, emergency exits, fire equipment, locks, and common areas.'],
  ['Clear information', 'Prices, house rules, facilities, location, and availability are shown before you contact a host.'],
  ['Support when you need it', 'You can report an issue, ask questions, and reach the humdum team through the support channel.'],
]

export default function SafetyPage() {
  return <div className="min-h-screen bg-cream"><Nav /><main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16"><Link href="/#safety" className="inline-flex items-center gap-2 text-sm font-semibold text-sage"><ArrowLeft className="size-4" /> Back to home</Link><div className="mt-8 max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-rose">Safety at humdum</p><h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">A safer way to find your next home</h1><p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">We make it easier to compare spaces with practical safety information, clear expectations, and people you can reach.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2">{checks.map(([title, body]) => <article key={title} className="rounded-2xl border border-border bg-card p-5 sm:p-6"><ShieldCheck className="size-7 text-sage" /><h2 className="mt-5 font-display text-2xl">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></article>)}</div><div className="mt-8 grid gap-4 rounded-2xl bg-sage p-6 text-white sm:grid-cols-[auto_1fr] sm:items-center sm:p-8"><LockKeyhole className="size-8 text-rose" /><div><h2 className="font-display text-2xl">See something that feels wrong</h2><p className="mt-1 text-sm leading-6 text-white/75">Pause your conversation and contact our support team so we can review it.</p></div></div></main></div>
}
