'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Check,
  LayoutDashboard,
  Map,
  MessageCircle,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'

type Verification = {
  id: number
  subject: string
  detail: string
}

const initialVerifications: Verification[] = [
  { id: 1, subject: 'Model Town Annex', detail: 'landlord CNIC + NOC' },
  { id: 2, subject: 'F-10 Studio Flat', detail: 'updated safety photos' },
  { id: 3, subject: 'New host: Sana R.', detail: 'ID verification' },
]

const anomalyData = [
  { day: 'Thu', value: 3 },
  { day: 'Fri', value: 5 },
  { day: 'Sat', value: 2 },
  { day: 'Sun', value: 9 },
  { day: 'Mon', value: 4 },
  { day: 'Tue', value: 7 },
  { day: 'Wed', value: 4 },
]

const auditRows = [
  {
    timestamp: '2026-09-18 21:02:11',
    actor: 'admin_hina',
    action: 'listing.approve #A1092',
    hash: '0x8fa3…c21e',
  },
  {
    timestamp: '2026-09-18 20:47:03',
    actor: 'system',
    action: 'safety_score.recalc #A1077',
    hash: '0x2b90…7f41',
  },
  {
    timestamp: '2026-09-18 19:12:55',
    actor: 'admin_bilal',
    action: 'user.suspend #U0442',
    hash: '0x77ac…dd02',
  },
  {
    timestamp: '2026-09-18 18:30:41',
    actor: 'system',
    action: 'report.flag #R0038',
    hash: '0x1e4f…99b6',
  },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-1.5 font-heading text-xl font-semibold text-[#3E332D]">
      <span aria-hidden="true" className="size-6 rounded-lg bg-gradient-to-br from-terracotta to-peach" />
      Humdum
    </Link>
  )
}

export default function AdminPage() {
  const [verifications, setVerifications] = useState(initialVerifications)
  const [reviewNotice, setReviewNotice] = useState('')
  const pendingCount = 9 + verifications.length

  function review(item: Verification, decision: 'approved' | 'rejected') {
    setVerifications((current) => current.filter((verification) => verification.id !== item.id))
    setReviewNotice(item.subject + ' was ' + decision + '.')
  }

  const metrics = [
    { value: '7', label: 'Flagged listings', color: 'bg-blush/45' },
    { value: '3', label: 'Reported users', color: 'bg-terracotta/20' },
    { value: String(pendingCount), label: 'Pending verifications', color: 'bg-peach/30' },
    { value: '99.4%', label: 'Audit log integrity', color: 'bg-sage/40' },
  ]

  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="sticky top-0 z-30 border-b border-[#E5DBD1] bg-cream/95 backdrop-blur">
        <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6">
          <div className="w-auto shrink-0 lg:w-[200px]">
            <Brand />
          </div>

          <label className="relative mx-auto hidden w-full max-w-md md:block">
            <span className="sr-only">Search the admin console</span>
            <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#81756C]" />
            <input
              type="search"
              placeholder="Search F-7, Bahria Town, G-9..."
              className="h-10 w-full rounded-full border border-[#DDD2C7] bg-[#F6EDE4] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#83776E] focus:border-terracotta focus:bg-white focus:ring-3 focus:ring-blush/40"
            />
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-[#DDD2C7] bg-[#F5ECE3] px-3 py-1 text-xs font-bold text-[#6C6058] sm:inline">
              Admin
            </span>
            <Link
              href="/profile"
              aria-label="Open admin profile"
              className="grid size-9 place-items-center rounded-full bg-peach font-heading text-sm font-bold text-[#4B3B2D]"
            >
              H
            </Link>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="border-b border-[#E5DBD1] px-4 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <nav aria-label="Admin navigation" className="flex gap-2 overflow-x-auto lg:flex-col">
            <Link
              href="/admin"
              aria-current="page"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold text-[#40362F] shadow-[0_6px_18px_rgba(87,64,50,0.06)]"
            >
              <LayoutDashboard className="size-4 text-[#77734E]" />
              Admin console
            </Link>
            <Link
              href="/listings"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960] transition hover:bg-white/70 hover:text-[#40362F]"
            >
              <Map className="size-4 text-[#999268]" />
              Listings &amp; map
            </Link>
            <Link
              href="/messages"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960] transition hover:bg-white/70 hover:text-[#40362F]"
            >
              <MessageCircle className="size-4 text-[#999268]" />
              Messages
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1080px]">
            <h1 className="max-w-4xl font-heading text-3xl leading-tight text-[#40362F] sm:text-4xl">
              Admin moderation &amp; audit console
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7A6E65]">
              Tamper-evident logs, abuse signals, and compliance verification in one place.
            </p>

            <section aria-label="Platform health metrics" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <article
                  key={metric.label}
                  className={'rounded-2xl border border-[#E3D9CF] p-4 shadow-[0_9px_22px_rgba(88,67,52,0.06)] ' + metric.color}
                >
                  <strong className="font-heading text-3xl leading-none text-[#40362F]">{metric.value}</strong>
                  <p className="mt-2 text-xs font-semibold text-[#70645C]">{metric.label}</p>
                </article>
              ))}
            </section>

            <section className="mt-5 rounded-2xl border border-[#E3D9CF] bg-white p-5 shadow-[0_12px_30px_rgba(88,67,52,0.07)] sm:p-6">
              <h2 className="font-heading text-xl text-[#40362F]">Anomaly reports, last 7 days</h2>
              <p className="mt-2 text-xs leading-5 text-[#7A6E65]">
                Spikes may indicate coordinated fake listings or messaging abuse.
              </p>

              <div className="mt-6 flex h-32 items-end gap-2 border-b border-[#DED4CA] px-1 sm:gap-3" aria-label="Seven-day anomaly report chart">
                {anomalyData.map((item) => (
                  <div key={item.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] font-bold text-[#645F41] opacity-0 transition group-hover:opacity-100">
                      {item.value}
                    </span>
                    <div
                      role="img"
                      aria-label={item.day + ': ' + item.value + ' anomaly reports'}
                      className={'w-full rounded-t-lg transition hover:bg-terracotta ' +
                        (item.value === 9 ? 'bg-terracotta/75' : 'bg-[#9A966E]')}
                      style={{ height: item.value * 9 + 'px' }}
                    />
                    <span className="pb-2 text-[10px] font-semibold text-[#81756C]">{item.day}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-[#E3D9CF] bg-white p-5 shadow-[0_12px_30px_rgba(88,67,52,0.07)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-xl text-[#40362F]">Compliance verification queue</h2>
                <p aria-live="polite" className="text-xs font-semibold text-[#696444]">{reviewNotice}</p>
              </div>

              <div className="mt-4 divide-y divide-[#E6DDD5] border-y border-[#E6DDD5]">
                {verifications.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-[#5E534B]">
                      <strong className="font-semibold text-[#40362F]">{item.subject}</strong>
                      <span> — {item.detail}</span>
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => review(item, 'approved')}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#8F8A5D] px-4 text-xs font-bold text-white transition hover:bg-[#7E7950]"
                      >
                        <Check className="size-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => review(item, 'rejected')}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#DDD2C7] bg-white px-4 text-xs font-bold text-[#5F534B] transition hover:bg-blush"
                      >
                        <X className="size-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}

                {verifications.length === 0 && (
                  <div className="py-8 text-center">
                    <ShieldCheck className="mx-auto size-7 text-[#77734E]" />
                    <p className="mt-2 text-sm font-semibold text-[#696057]">Verification queue cleared.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="mb-12 mt-5 rounded-2xl border border-[#E3D9CF] bg-white p-5 shadow-[0_12px_30px_rgba(88,67,52,0.07)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl text-[#40362F]">Tamper-evident audit trail</h2>
                  <p className="mt-1 text-xs text-[#7A6E65]">Append-only records verified against the previous log hash.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/45 px-3 py-1.5 text-[10px] font-bold text-[#555139]">
                  <ShieldCheck className="size-3.5" />
                  Chain verified
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#DED4CA] text-[#776B63]">
                      <th className="px-2 py-3 font-bold">Timestamp</th>
                      <th className="px-2 py-3 font-bold">Actor</th>
                      <th className="px-2 py-3 font-bold">Action</th>
                      <th className="px-2 py-3 font-bold">Record hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7DED6]">
                    {auditRows.map((row) => (
                      <tr key={row.hash} className="transition hover:bg-cream/70">
                        <td className="whitespace-nowrap px-2 py-3 font-mono text-[11px] text-[#62564E]">{row.timestamp}</td>
                        <td className="px-2 py-3 font-mono text-[11px] text-[#62564E]">{row.actor}</td>
                        <td className="px-2 py-3 font-mono text-[11px] font-semibold text-[#494039]">{row.action}</td>
                        <td className="px-2 py-3 font-mono text-[11px] text-[#62564E]">{row.hash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
