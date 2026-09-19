'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCheck,
  LockKeyhole,
  Map,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react'

type Message = {
  id: number
  body: string
  mine: boolean
  delivered?: boolean
}

type Thread = {
  id: number
  title: string
  shortTitle: string
  initials: string
  preview: string
  unread?: boolean
  messages: Message[]
}

const initialThreads: Thread[] = [
  {
    id: 1,
    title: 'Landlord · Margalla View Residency',
    shortTitle: 'Margalla View Residency',
    initials: 'M',
    preview: 'Gate code sent for tomorrow',
    messages: [
      {
        id: 1,
        body: "Hi! Thanks for your interest in the shared room - it's still available.",
        mine: false,
      },
      {
        id: 2,
        body: 'Great, is the 10 PM curfew strict on weekends too?',
        mine: true,
        delivered: true,
      },
      {
        id: 3,
        body: 'Yes, same on weekends, but guests can sign in until 9 with front desk ID check.',
        mine: false,
      },
      {
        id: 4,
        body: 'Perfect, that works for me. Can I schedule a viewing?',
        mine: true,
        delivered: true,
      },
      {
        id: 5,
        body: 'Gate code sent for tomorrow - see you at 4 PM.',
        mine: false,
      },
    ],
  },
  {
    id: 2,
    title: 'Landlord · Willow Hostel',
    shortTitle: 'Willow Hostel',
    initials: 'W',
    preview: 'Room available from the 1st',
    unread: true,
    messages: [
      {
        id: 1,
        body: 'Hello Ayesha, the private room is available from the 1st of next month.',
        mine: false,
      },
      {
        id: 2,
        body: 'Thank you. Does the monthly rent include electricity?',
        mine: true,
        delivered: true,
      },
    ],
  },
  {
    id: 3,
    title: 'Humdum Support',
    shortTitle: 'Humdum Support',
    initials: 'H',
    preview: 'Your verification is complete',
    messages: [
      {
        id: 1,
        body: 'Your tenant profile verification is complete. You can now request property viewings.',
        mine: false,
      },
    ],
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

function maskContactDetails(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}/gi, '[email masked]')
    .replace(/[+0-9][0-9 ().-]{6,}[0-9]/g, '[phone masked]')
}

export default function MessagesPage() {
  const [threads, setThreads] = useState(initialThreads)
  const [activeId, setActiveId] = useState(1)
  const [draft, setDraft] = useState('')

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeId) ?? threads[0],
    [activeId, threads],
  )

  function selectThread(id: number) {
    setActiveId(id)
    setThreads((current) =>
      current.map((thread) => (thread.id === id ? { ...thread, unread: false } : thread)),
    )
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = maskContactDetails(draft.trim())
    if (!body) return

    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeId
          ? {
              ...thread,
              preview: body,
              messages: [
                ...thread.messages,
                {
                  id: Date.now(),
                  body,
                  mine: true,
                  delivered: true,
                },
              ],
            }
          : thread,
      ),
    )
    setDraft('')
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
              aria-current="page"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold text-[#40362F] shadow-[0_6px_18px_rgba(87,64,50,0.06)]"
            >
              <MessageCircle className="size-4 text-[#77734E]" />
              Messages
            </Link>
            <Link
              href="/profile/family"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960] transition hover:bg-white/70 hover:text-[#40362F]"
            >
              <Users className="size-4 text-[#999268]" />
              Family safety
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1080px]">
            <h1 className="font-heading text-3xl leading-tight text-[#40362F] sm:text-4xl">
              Messages
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7A6E65]">
              Every conversation is routed through Humdum — your number and email stay private.
            </p>

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#E2D8CE] bg-white shadow-[0_14px_34px_rgba(88,67,52,0.08)] lg:grid lg:h-[600px] lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside aria-label="Conversation list" className="border-b border-[#E4DAD0] lg:border-b-0 lg:border-r">
                <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible lg:p-0">
                  {threads.map((thread) => {
                    const active = thread.id === activeId
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => selectThread(thread.id)}
                        className={'relative flex min-w-[245px] items-center gap-3 rounded-xl p-3 text-left transition lg:min-w-0 lg:w-full lg:rounded-none lg:border-b lg:border-[#E8DFD7] lg:p-4 ' +
                          (active ? 'bg-[#F6EDE4]' : 'bg-white hover:bg-cream')}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sage to-peach text-xs font-bold text-[#4B4039]">
                          {thread.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-[#443A34]">
                            {thread.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#7B6F66]">
                            {thread.preview}
                            {!thread.unread && <CheckCheck className="size-3 shrink-0 text-[#77734E]" />}
                          </span>
                        </span>
                        {thread.unread && (
                          <span aria-label="Unread message" className="size-2 shrink-0 rounded-full bg-terracotta" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </aside>

              <div className="flex min-h-[520px] min-w-0 flex-col bg-[#F4EADF] lg:min-h-0">
                <div className="border-b border-[#E3D9CF] bg-white">
                  <div className="flex min-h-16 items-center gap-3 px-4 sm:px-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-peach text-xs font-bold text-[#4B4039]">
                      {activeThread.initials}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-heading text-lg font-semibold text-[#40362F] sm:text-xl">
                        {activeThread.title}
                      </h2>
                      <p className="text-[11px] text-[#81756C]">Typically replies within an hour</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t border-[#EEE5DC] bg-blush/30 px-4 py-2 text-xs font-semibold text-[#70514E] sm:px-5">
                    <LockKeyhole className="size-3.5 shrink-0" />
                    Personal contact details are always masked in chat
                  </div>
                </div>

                <div
                  aria-live="polite"
                  className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5"
                >
                  {activeThread.messages.map((message) => (
                    <div
                      key={message.id}
                      className={'flex ' + (message.mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[72%] ' +
                          (message.mine
                            ? 'rounded-br-md bg-peach text-[#49362A]'
                            : 'rounded-bl-md bg-white text-[#4D433C]')}
                      >
                        <p>{message.body}</p>
                        {message.mine && message.delivered && (
                          <span className="mt-1 flex items-center justify-end gap-1 text-[9px] font-bold text-[#765A45]">
                            Delivered
                            <CheckCheck className="size-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={sendMessage} className="flex gap-2 border-t border-[#E3D9CF] bg-white p-3 sm:p-4">
                  <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Message</span>
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Type a message — numbers & emails are auto-masked"
                      className="h-12 w-full rounded-full border border-[#DDD2C7] bg-[#F6EDE4] px-5 text-sm outline-none transition placeholder:text-[#A69B92] focus:border-terracotta focus:bg-white focus:ring-3 focus:ring-blush/40"
                    />
                  </label>
                  <button
                    type="submit"
                    aria-label="Send message"
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-peach-deep font-bold text-[#49362A] shadow-[0_6px_16px_rgba(231,151,150,0.24)] transition hover:bg-peach sm:w-auto sm:px-5"
                  >
                    <Send className="size-4 sm:mr-2" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>

                <div className="flex items-center justify-center gap-1.5 bg-white pb-3 text-[10px] text-[#887C73]">
                  <ShieldCheck className="size-3 text-[#77734E]" />
                  Protected by Humdum masked messaging
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
