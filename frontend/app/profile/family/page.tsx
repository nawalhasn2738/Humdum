'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import {
  BellRing,
  Check,
  Map,
  MessageCircle,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react'

type CheckInStatus = 'Confirmed' | 'Missed — guardian notified' | 'Pending'

type CheckIn = {
  id: number
  timestamp: string
  status: CheckInStatus
}

const initialCheckIns: CheckIn[] = [
  { id: 1, timestamp: 'Today, 10:05 PM', status: 'Confirmed' },
  { id: 2, timestamp: 'Yesterday, 10:02 PM', status: 'Confirmed' },
  { id: 3, timestamp: 'Tue, 10:11 PM', status: 'Missed — guardian notified' },
  { id: 4, timestamp: 'Mon, 9:58 PM', status: 'Confirmed' },
  { id: 5, timestamp: 'Tonight, 10:00 PM', status: 'Pending' },
]

const statusStyles: Record<CheckInStatus, string> = {
  Confirmed: 'bg-sage/55 text-[#555139]',
  'Missed — guardian notified': 'bg-blush text-[#774947]',
  Pending: 'bg-peach/55 text-[#765532]',
}

const fieldClass =
  'mt-1.5 h-11 w-full rounded-xl border border-[#DDD2C7] bg-[#F6EDE4] px-3.5 text-sm text-[#443A34] outline-none transition placeholder:text-[#ADA39A] focus:border-terracotta focus:bg-white focus:ring-3 focus:ring-blush/40'

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-1.5 font-heading text-xl font-semibold text-[#3E332D]">
      <span aria-hidden="true" className="size-6 rounded-lg bg-gradient-to-br from-terracotta to-peach" />
      Humdum
    </Link>
  )
}

export default function FamilySafetyPage() {
  const [checkIns, setCheckIns] = useState(initialCheckIns)
  const [guardianNotice, setGuardianNotice] = useState('')
  const [sosSent, setSosSent] = useState(false)

  function saveGuardian(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const guardianName = String(data.get('guardianName') || '').trim()

    if (!guardianName) {
      setGuardianNotice('Please add your guardian name.')
      return
    }

    setGuardianNotice('Guardian details saved securely.')
  }

  function sendCheckIn() {
    const now = new Date()
    const timestamp =
      'Now, ' +
      now.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })

    setCheckIns((current) => [
      { id: Date.now(), timestamp, status: 'Confirmed' },
      ...current.filter((item) => item.status !== 'Pending'),
    ])
  }

  function sendSos() {
    setSosSent(true)
  }

  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="sticky top-0 z-30 border-b border-[#E5DBD1] bg-cream/95 backdrop-blur">
        <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6">
          <div className="w-auto shrink-0 lg:w-[220px]">
            <Brand />
          </div>

          <label className="relative mx-auto hidden w-full max-w-lg md:block">
            <span className="sr-only">Search listings by location</span>
            <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#81756C]" />
            <input
              type="search"
              placeholder="Search F-7, Bahria Town, G-9..."
              className="h-10 w-full rounded-full border border-[#DDD2C7] bg-[#F6EDE4] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#83776E] focus:border-terracotta focus:bg-white focus:ring-3 focus:ring-blush/40"
            />
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-[#DDD2C7] bg-[#F5ECE3] px-3 py-1 text-xs font-bold text-[#6C6058] sm:inline">
              Tenant
            </span>
            <Link
              href="/profile"
              aria-label="Open profile"
              className="grid size-9 place-items-center rounded-full bg-peach font-heading text-sm font-bold text-[#4B3B2D]"
            >
              A
            </Link>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-[#E5DBD1] px-4 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <nav aria-label="Dashboard navigation" className="flex gap-2 overflow-x-auto lg:flex-col">
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
            <Link
              href="/profile/family"
              aria-current="page"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold text-[#40362F] shadow-[0_6px_18px_rgba(87,64,50,0.06)]"
            >
              <Users className="size-4 text-[#77734E]" />
              Family safety
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1080px]">
            <h1 className="max-w-3xl font-heading text-3xl leading-tight text-[#40362F] sm:text-4xl">
              Family safety &amp; emergency profile
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7A6E65]">
              Keep a guardian in the loop without ever sharing your live location publicly.
            </p>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div className="space-y-5">
                <section className="rounded-2xl border border-terracotta/50 bg-gradient-to-br from-blush to-terracotta/80 p-6 text-center shadow-[0_12px_28px_rgba(190,103,104,0.12)] sm:p-7">
                  <ShieldAlert className="mx-auto size-7 text-[#7D4645]" />
                  <h2 className="mx-auto mt-3 max-w-sm text-sm font-bold leading-5 text-[#613B39] sm:text-base">
                    In an emergency, one tap alerts your guardian and Humdum support
                  </h2>
                  <button
                    type="button"
                    onClick={sendSos}
                    disabled={sosSent}
                    className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-terracotta px-7 text-sm font-bold text-white shadow-[0_8px_18px_rgba(145,66,67,0.18)] transition hover:brightness-105 disabled:cursor-default disabled:bg-[#A77A78]"
                  >
                    {sosSent ? <Check className="size-4" /> : <BellRing className="size-4" />}
                    {sosSent ? 'SOS alert sent' : 'Send SOS alert'}
                  </button>
                  {sosSent && (
                    <p aria-live="assertive" className="mt-3 text-xs font-semibold text-[#694240]">
                      Your guardian and Humdum support have been notified.
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-[#E3D9CF] bg-white p-5 shadow-[0_12px_30px_rgba(88,67,52,0.07)] sm:p-6">
                  <h2 className="font-heading text-xl text-[#40362F]">Guardian contact</h2>
                  <form onSubmit={saveGuardian} className="mt-4 space-y-3.5">
                    <label className="block text-xs font-bold text-[#62564E]">
                      Guardian name
                      <input
                        name="guardianName"
                        autoComplete="name"
                        placeholder="Fatima Khan"
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-xs font-bold text-[#62564E]">
                      Relationship
                      <input name="relationship" placeholder="Mother" className={fieldClass} />
                    </label>
                    <label className="block text-xs font-bold text-[#62564E]">
                      Phone number
                      <input
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="03xx-xxxxxxx"
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-xs font-bold text-[#62564E]">
                      Email
                      <input
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="guardian@example.com"
                        className={fieldClass}
                      />
                    </label>
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#8F8A5D] px-6 text-sm font-bold text-white transition hover:bg-[#7E7950]"
                    >
                      Save guardian details
                    </button>
                    <p aria-live="polite" className="min-h-4 text-xs font-semibold text-[#686344]">
                      {guardianNotice}
                    </p>
                  </form>
                </section>
              </div>

              <section className="rounded-2xl border border-[#E3D9CF] bg-white p-5 shadow-[0_12px_30px_rgba(88,67,52,0.07)] sm:p-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-heading text-2xl text-[#40362F]">Safety check-ins</h2>
                    <p className="mt-2 text-sm leading-6 text-[#7A6E65]">
                      Automatic prompts confirm you&apos;re safe at curfew each night.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={sendCheckIn}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-peach-deep px-5 text-xs font-bold text-[#49362A] shadow-[0_6px_16px_rgba(231,151,150,0.2)] transition hover:bg-peach"
                  >
                    Send check-in now
                  </button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[470px] border-collapse text-left text-sm">
                    <thead className="sr-only">
                      <tr>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6DDD5]">
                      {checkIns.map((checkIn) => (
                        <tr key={checkIn.id}>
                          <td className="py-3 pr-4 text-[#62564E]">{checkIn.timestamp}</td>
                          <td className="py-3 text-right">
                            <span className={'inline-flex rounded-full px-3 py-1 text-[11px] font-bold ' + statusStyles[checkIn.status]}>
                              {checkIn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl bg-sage/25 p-4 text-xs leading-5 text-[#686344]">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                  Check-in history is only visible to you, your linked guardian, and authorized Humdum safety staff.
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
