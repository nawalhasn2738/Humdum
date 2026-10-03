'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brand } from '@/components/brand'
import { useAuth } from '@/lib/auth-context'
import {
  AlertCircle,
  CheckCheck,
  LoaderCircle,
  LockKeyhole,
  Map,
  MessageCircle,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { api, type ConversationMessage, type ConversationThread } from '@/lib/api'

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}
export default function MessagesPage() {
  const router = useRouter()
  const { user, status, authError, refreshIdentity } = useAuth()
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeId) ?? null,
    [activeId, threads],
  )

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?next=/messages')
  }, [router, status])

  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      if (status !== 'loading') setLoadingThreads(false)
      return
    }
    let cancelled = false
    async function loadThreads() {
      try {
        setError(null)
        const result = await api.messages.threads()
        if (cancelled) return
        setThreads(result)
        setActiveId((current) =>
          current && result.some((thread) => thread.id === current) ? current : result[0]?.id ?? null,
        )
      } catch (loadError) {
        if (!cancelled) setError(errorMessage(loadError))
      } finally {
        if (!cancelled) setLoadingThreads(false)
      }
    }
    void loadThreads()
    return () => {
      cancelled = true
    }
  }, [status, user])

  useEffect(() => {
    if (status !== 'authenticated' || !user || !activeThread) {
      setMessages([])
      return
    }
    let cancelled = false
    setLoadingMessages(true)
    setError(null)
    api.messages
      .conversation(activeThread.listing.id, activeThread.participant.id)
      .then((result) => {
        if (!cancelled) setMessages(result.messages)
      })
      .catch((loadError) => {
        if (!cancelled) {
          setMessages([])
          setError(errorMessage(loadError))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeThread])

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !activeThread || sending) return
    try {
      setSending(true)
      setError(null)
      const response = await api.messages.send({
        listingId: activeThread.listing.id,
        receiverId: activeThread.participant.id,
        content,
      })
      setMessages((current) => [...current, response.message])
      setThreads((current) =>
        current.map((thread) =>
          thread.id === activeThread.id ? { ...thread, latestMessage: response.message } : thread,
        ),
      )
      setDraft('')
    } catch (sendError) {
      setError(errorMessage(sendError))
    } finally {
      setSending(false)
    }
  }

  if (status === 'error') {
    return <main className="grid min-h-screen place-items-center bg-cream px-4 text-center"><div><p role="alert" className="text-sm font-semibold text-[#756960]">{authError}</p><button type="button" onClick={() => void refreshIdentity()} className="mt-4 rounded-full bg-peach px-4 py-2 text-sm font-bold">Try again</button></div></main>
  }

  if (status !== 'authenticated' || !user) {
    return <main className="grid min-h-screen place-items-center bg-cream"><p role="status" className="text-sm font-semibold text-[#756960]">Restoring your secure session...</p></main>
  }
  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="sticky top-0 z-30 border-b border-[#E5DBD1] bg-cream/95 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />
          <Link href="/profile" className="rounded-full border border-[#DDD2C7] bg-white px-4 py-2 text-sm font-semibold">
            Profile
          </Link>
        </div>
      </header>

      <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-[#E5DBD1] px-4 py-3 lg:border-b-0 lg:border-r lg:py-6">
          <nav aria-label="Dashboard navigation" className="flex gap-2 overflow-x-auto lg:flex-col">
            <Link href="/listings" className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960] hover:bg-white/70">
              <Map className="size-4" /> Listings &amp; map
            </Link>
            <Link href="/messages" aria-current="page" className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold shadow-sm">
              <MessageCircle className="size-4" /> Messages
            </Link>
            <Link href="/profile/family" className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960] hover:bg-white/70">
              <Users className="size-4" /> Family safety
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1080px]">
            <h1 className="font-heading text-3xl text-[#40362F] sm:text-4xl">Messages</h1>
            <p className="mt-2 text-sm leading-6 text-[#7A6E65]">
              Conversations stay tied to a listing. Contact details are filtered by Humdum before messages reach your browser.
            </p>

            {error && (
              <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="size-4 shrink-0" /> {error}
              </div>
            )}

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#E2D8CE] bg-white shadow-[0_14px_34px_rgba(88,67,52,0.08)] lg:grid lg:h-[600px] lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside aria-label="Conversation list" className="border-b border-[#E4DAD0] lg:border-b-0 lg:border-r">
                {loadingThreads ? (
                  <div className="flex items-center gap-2 p-5 text-sm text-[#7B6F66]">
                    <LoaderCircle className="size-4 animate-spin" /> Loading conversations...
                  </div>
                ) : threads.length === 0 ? (
                  <p className="p-5 text-sm text-[#7B6F66]">No conversations yet.</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible lg:p-0">
                    {threads.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => setActiveId(thread.id)}
                        className={'flex min-w-[245px] items-center gap-3 rounded-xl p-3 text-left transition lg:w-full lg:min-w-0 lg:rounded-none lg:border-b lg:border-[#E8DFD7] lg:p-4 ' +
                          (thread.id === activeId ? 'bg-[#F6EDE4]' : 'bg-white hover:bg-cream')}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sage to-peach text-xs font-bold">
                          {initials(thread.participant.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{thread.participant.name}</span>
                          <span className="block truncate text-xs text-[#7B6F66]">{thread.listing.title}</span>
                          <span className="mt-1 block truncate text-xs text-[#7B6F66]">{thread.latestMessage.content}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </aside>

              <div className="flex min-h-[520px] min-w-0 flex-col bg-[#F4EADF] lg:min-h-0">
                {activeThread ? (
                  <>
                    <div className="border-b border-[#E3D9CF] bg-white">
                      <div className="px-5 py-3">
                        <h2 className="font-heading text-xl font-semibold">{activeThread.participant.name}</h2>
                        <Link href={'/listings/' + activeThread.listing.id} className="text-xs font-semibold text-terracotta hover:underline">
                          {activeThread.listing.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 border-t border-[#EEE5DC] bg-blush/30 px-5 py-2 text-xs font-semibold text-[#70514E]">
                        <LockKeyhole className="size-3.5" /> Server-side PII filtering is active
                      </div>
                    </div>

                    <div aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
                      {loadingMessages ? (
                        <div className="flex items-center gap-2 text-sm text-[#7B6F66]">
                          <LoaderCircle className="size-4 animate-spin" /> Loading messages...
                        </div>
                      ) : messages.length === 0 ? (
                        <p className="text-sm text-[#7B6F66]">No messages in this listing conversation.</p>
                      ) : (
                        messages.map((message) => {
                          const mine = message.sender.id !== activeThread.participant.id
                          return (

                            <div key={message.id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
                              <div className={'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[72%] ' +
                                (mine ? 'rounded-br-md bg-peach text-[#49362A]' : 'rounded-bl-md bg-white')}>
                                <p>{message.content}</p>
                                <span className="mt-1 flex items-center justify-end gap-1 text-[9px] font-bold text-[#765A45]">
                                  {message.isMasked ? 'Contact details masked' : mine ? 'Delivered' : ''}
                                  {mine && <CheckCheck className="size-3" />}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <form onSubmit={sendMessage} className="flex gap-2 border-t border-[#E3D9CF] bg-white p-3 sm:p-4">
                      <label className="min-w-0 flex-1">
                        <span className="sr-only">Message</span>
                        <input
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          maxLength={4000}
                          disabled={sending}
                          placeholder="Type a message - contact details are filtered on the server"
                          className="h-12 w-full rounded-full border border-[#DDD2C7] bg-[#F6EDE4] px-5 text-sm outline-none focus:border-terracotta focus:bg-white"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={!draft.trim() || sending}
                        aria-label="Send message"
                        className="inline-flex h-12 items-center justify-center rounded-full bg-peach-deep px-5 font-bold text-[#49362A] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4 sm:mr-2" />}
                        <span className="hidden sm:inline">{sending ? 'Sending' : 'Send'}</span>
                      </button>
                    </form>
                    <div className="flex items-center justify-center gap-1.5 bg-white pb-3 text-[10px] text-[#887C73]">
                      <ShieldCheck className="size-3" /> Protected by Humdum masked messaging
                    </div>
                  </>
                ) : (
                  <div className="grid flex-1 place-items-center p-8 text-center text-sm text-[#7B6F66]">
                    Select a conversation to view messages.
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
