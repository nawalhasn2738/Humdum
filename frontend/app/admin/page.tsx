'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Brand } from '@/components/brand'
import { useAuth } from '@/lib/auth-context'
import {
  api,
  type AdminVerificationItem,
  type AdminVerificationStatus,
} from '@/lib/api'
import { FileCheck, LayoutDashboard, Map, MessageCircle, ShieldCheck } from 'lucide-react'

const filters: Array<{ value: AdminVerificationStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
]

const statusStyles: Record<AdminVerificationStatus, string> = {
  pending: 'bg-peach/55 text-[#765532]',
  approved: 'bg-sage/60 text-[#4D563A]',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-[#E8E1DA] text-[#6D625A]',
  expired: 'bg-[#E8E1DA] text-[#6D625A]',
}

export default function AdminPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<AdminVerificationStatus>('pending')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdminVerificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [selected, setSelected] = useState<AdminVerificationItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [decisionReason, setDecisionReason] = useState('')
  const [decisionError, setDecisionError] = useState('')
  const [decisionNotice, setDecisionNotice] = useState('')
  const [deciding, setDeciding] = useState(false)
  const decisionInProgress = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setSelected(null)
    api.admin.verifications(filter, page)
      .then((result) => {
        if (!active) return
        setItems(result.items)
        setTotal(result.pagination.total)
        setTotalPages(result.pagination.totalPages)
      })
      .catch((requestError) => {
        if (!active) return
        setItems([])
        setTotal(0)
        setTotalPages(0)
        setError(requestError instanceof Error ? requestError.message : 'Unable to load verification queue.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter, page, reload])

  function changeFilter(next: AdminVerificationStatus) {
    setFilter(next)
    setPage(1)
  }

  async function downloadEvidence(document: AdminVerificationItem['evidence'][number]) {
    if (downloadingId) return
    setDownloadingId(document.id)
    setError('')
    try {
      const blob = await api.listings.downloadEvidence(document.id)
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = document.originalFilename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to retrieve evidence.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function decide(decision: 'approve' | 'reject' | 'suspend') {
    if (!selected || decisionInProgress.current) return
    const reason = decisionReason.trim()
    if ((decision === 'reject' || decision === 'suspend') && !reason) {
      setDecisionError('A reason is required for this decision.')
      return
    }
    if (!window.confirm((decision === 'approve' ? 'Approve' : capitalize(decision)) + ' ' + selected.title + '?')) return
    decisionInProgress.current = true
    setDeciding(true)
    setDecisionError('')
    try {
      await api.admin.decideVerification(selected.id, decision, reason || undefined)
      setDecisionNotice(selected.title + ' was ' + (decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'suspended') + '.')
      setSelected(null)
      setDecisionReason('')
      setReload((value) => value + 1)
    } catch (requestError) {
      setDecisionError(requestError instanceof Error ? requestError.message : 'Unable to save this decision.')
    } finally {
      decisionInProgress.current = false
      setDeciding(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="sticky top-0 z-30 border-b border-[#E5DBD1] bg-cream/95 backdrop-blur">
        <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6">
          <div className="w-auto shrink-0 lg:w-[200px]"><Brand /></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-[#DDD2C7] bg-[#F5ECE3] px-3 py-1 text-xs font-bold sm:inline">{user?.userType === 'safety_inspector' ? 'Safety auditor' : 'Admin'}</span>
            <span className="grid size-9 place-items-center rounded-full bg-peach font-heading text-sm font-bold">{user?.name?.charAt(0).toUpperCase() || 'A'}</span>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="border-b border-[#E5DBD1] px-4 py-3 lg:border-b-0 lg:border-r lg:py-6">
          <nav aria-label="Admin navigation" className="flex gap-2 overflow-x-auto lg:flex-col">
            <Link href="/admin" aria-current="page" className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold shadow-sm"><LayoutDashboard className="size-4" />Verification queue</Link>
            <Link href="/listings" className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960]"><Map className="size-4" />Listings</Link>
            <Link href="/messages" className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960]"><MessageCircle className="size-4" />Messages</Link>
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1120px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><h1 className="font-heading text-3xl sm:text-4xl">Listing verification queue</h1><p className="mt-2 text-sm text-[#7A6E65]">Review submitted listing evidence and current compliance state.</p></div>
              <button type="button" onClick={() => setReload((value) => value + 1)} className="rounded-full border bg-white px-4 py-2 text-xs font-bold">Refresh</button>
            </div>

            {decisionNotice && <p role="status" className="mt-4 rounded-xl bg-sage/45 p-3 text-sm font-semibold">{decisionNotice}</p>}
            <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Verification status filter">
                  {filters.map((item) => <button key={item.value} type="button" onClick={() => changeFilter(item.value)} aria-pressed={filter === item.value} className={'rounded-full px-4 py-2 text-xs font-bold ' + (filter === item.value ? 'bg-terracotta text-white' : 'bg-[#F5ECE3]')}>{item.label}</button>)}
                </div>
                <span className="text-xs font-semibold text-[#756960]">{total} {filter} listing{total === 1 ? '' : 's'}</span>
              </div>

              {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="mt-3 rounded-full border border-red-300 px-4 py-2 text-xs font-bold">Try again</button></div>}
              {loading && <div className="mt-5 space-y-3 animate-pulse">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 rounded-xl bg-[#F3ECE5]" />)}</div>}
              {!loading && !error && items.length === 0 && <div className="py-14 text-center"><ShieldCheck className="mx-auto size-8 text-[#8F8A5D]" /><p className="mt-3 text-sm font-semibold">No {filter} verification records.</p><p className="mt-1 text-xs text-[#756960]">The queue will update when listing or evidence state changes.</p></div>}

              {!loading && !error && items.length > 0 && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead><tr className="border-b text-[#756960]"><th className="px-3 py-3">Listing</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Submitted</th><th className="px-3 py-3">Evidence</th><th className="px-3 py-3">Action</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id} className="align-top"><td className="px-3 py-4"><p className="font-bold text-[#40362F]">{item.title}</p><p className="mt-1 text-[11px] text-[#756960]">Listing #{item.id} · {formatModeration(item.moderationStatus)}</p></td><td className="px-3 py-4"><p className="font-semibold">{item.owner.name}</p><p className="mt-1 text-[11px] text-[#756960]">{item.owner.email}</p></td><td className="px-3 py-4"><span className={'rounded-full px-2.5 py-1 font-bold capitalize ' + statusStyles[item.verificationStatus]}>{item.verificationStatus}</span></td><td className="px-3 py-4 whitespace-nowrap">{formatDate(item.submittedAt)}</td><td className="px-3 py-4">{item.evidence.length} file{item.evidence.length === 1 ? '' : 's'}</td><td className="px-3 py-4"><button type="button" onClick={() => { setSelected(item); setDecisionReason(''); setDecisionError('') }} className="rounded-full bg-[#F5ECE3] px-4 py-2 font-bold">Review details</button></td></tr>)}</tbody></table></div>}

              {!loading && !error && totalPages > 1 && <div className="mt-5 flex items-center justify-between border-t pt-4"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-40">Previous</button><span className="text-xs text-[#756960]">Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-40">Next</button></div>}
            </section>

            {selected && <section className="mb-12 mt-5 rounded-2xl border border-terracotta/35 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><h2 className="font-heading text-xl">{selected.title}</h2><p className="mt-1 text-xs text-[#756960]">Owned by {selected.owner.name} · submitted {formatDate(selected.submittedAt)}</p></div><button type="button" onClick={() => setSelected(null)} className="text-sm font-bold">Close</button></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3"><Detail label="Verification status" value={capitalize(selected.verificationStatus)} /><Detail label="Moderation status" value={formatModeration(selected.moderationStatus)} /><Detail label="Compliance audit" value={selected.audit ? 'Score ' + selected.audit.score + ' · expires ' + formatDate(selected.audit.expiryDate) : 'No audit available'} /></div>

              <h3 className="mt-6 font-heading text-lg">Evidence metadata</h3>
              {selected.evidence.length === 0 && <p className="mt-3 rounded-xl border border-dashed p-4 text-sm text-[#756960]">No listing evidence has been uploaded.</p>}
              <div className="mt-3 space-y-2">{selected.evidence.map((document) => <article key={document.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold">{document.originalFilename}</p><p className="mt-1 text-xs text-[#756960]">{document.mimeType} · {formatSize(document.sizeBytes)} · uploaded {formatDate(document.createdAt)}</p></div><span className="rounded-full bg-[#F5ECE3] px-3 py-1 text-xs font-bold capitalize">{document.status.replace('_', ' ')}</span></div>{document.status === 'rejected' && document.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700"><strong>Rejection reason:</strong> {document.rejectionReason}</p>}<button type="button" disabled={Boolean(downloadingId)} onClick={() => void downloadEvidence(document)} className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-50"><FileCheck className="size-4" />{downloadingId === document.id ? 'Downloading...' : 'Download securely'}</button></article>)}</div>

              <div className="mt-6 rounded-xl bg-[#F5ECE3] p-4">
                {(selected.moderationStatus === 'under_review' || selected.moderationStatus === 'active') && <label className="block text-xs font-bold">Decision reason {selected.moderationStatus === 'under_review' ? '(required for rejection)' : '(required for suspension)'}<textarea value={decisionReason} onChange={(event) => { setDecisionReason(event.target.value); setDecisionError('') }} rows={3} maxLength={1000} className="mt-2 w-full rounded-xl border bg-white p-3 text-sm font-normal outline-none focus:border-terracotta" /></label>}
                {decisionError && <p role="alert" className="mt-3 text-xs font-semibold text-red-700">{decisionError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.moderationStatus === 'under_review' && <><button type="button" disabled={deciding} onClick={() => void decide('approve')} className="rounded-full bg-[#8F8A5D] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{deciding ? 'Saving...' : 'Approve listing'}</button><button type="button" disabled={deciding} onClick={() => void decide('reject')} className="rounded-full bg-red-100 px-5 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Reject listing</button></>}
                  {selected.moderationStatus === 'active' && <button type="button" disabled={deciding} onClick={() => void decide('suspend')} className="rounded-full bg-red-100 px-5 py-2 text-xs font-bold text-red-700 disabled:opacity-50">{deciding ? 'Saving...' : 'Suspend listing'}</button>}
                  {selected.moderationStatus === 'suspended' && <p className="text-xs font-semibold text-[#756960]">This listing is suspended. A new decision requires the landlord to edit and resubmit it for review.</p>}
                </div>
              </div>
            </section>}
          </div>
        </main>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#FCF9F6] p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-[#83776E]">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div> }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1) }
function formatModeration(value: string) { return value.split('_').map(capitalize).join(' ') }
function formatSize(bytes: number) { return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB' }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(date) }