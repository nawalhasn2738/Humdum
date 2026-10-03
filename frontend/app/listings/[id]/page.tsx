'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CameraOff, Clock3, MapPin, ShieldCheck, WalletCards } from 'lucide-react'
import { Brand } from '@/components/brand'
import { InquiryStatusBadge } from '@/components/inquiry-status'
import { api, type Inquiry, type ListingCompliance, type ListingDetail, type ListingSafety } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { isValidListingId, mapPublicVerificationState, type PublicVerificationState } from '@/lib/listing-contract'

type SafetyState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready'
      data: ListingSafety
      compliance: ListingCompliance
      verification: PublicVerificationState
    }

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [safety, setSafety] = useState<SafetyState>({ status: 'loading' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true
    setError('')
    setListing(null)
    setSafety({ status: 'loading' })
    setLoading(true)

    if (!isValidListingId(params.id)) {
      setError('A valid listing ID is required.')
      setSafety({ status: 'error' })
      setLoading(false)
      return () => { active = false }
    }

    api.listings.get(params.id)
      .then((result) => { if (active) setListing(result) })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load listing.') })
      .finally(() => { if (active) setLoading(false) })

    Promise.all([
      api.listings.safety(params.id),
      api.listings.compliance(params.id),
    ])
      .then(([data, compliance]) => {
        if (!active) return
        const verification = mapPublicVerificationState({
          safetyStatus: compliance.safetyStatus,
          hasAudit: compliance.audit !== null,
          currentAudit: data.components.compliance.currentAudit,
          dataCompleteness: data.dataCompleteness,
        })
        setSafety({ status: 'ready', data, compliance, verification })
      })
      .catch(() => { if (active) setSafety({ status: 'error' }) })

    return () => { active = false }
  }, [params.id, requestVersion])

  if (loading) return <main className="grid min-h-screen place-items-center bg-cream px-4"><p role="status" className="text-sm font-semibold text-[#756960]">Loading property details...</p></main>

  if (error || !listing) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream px-4 text-center">
        <div>
          <p role="alert" className="text-sm font-semibold text-[#756960]">{error || 'Listing not found.'}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/listings" className="rounded-full border border-[#D8CDC3] px-4 py-2 text-sm font-bold text-terracotta">Back to listings</Link>
            {isValidListingId(params.id) && <button type="button" onClick={() => setRequestVersion((value) => value + 1)} className="rounded-full bg-peach px-4 py-2 text-sm font-bold">Try again</button>}
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="border-b border-[#E5DBD1] bg-cream/95">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <Link href="/profile" className="rounded-full bg-peach px-4 py-2 text-xs font-bold">Profile</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/listings" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#756960] hover:text-terracotta"><ArrowLeft className="size-4" /> Back to listings</Link>

        <section aria-label="Property photos" className="mt-3 grid min-h-52 place-items-center rounded-2xl border border-dashed border-[#D8CDC3] bg-[#F1E8DE] px-6 text-center sm:min-h-72">
          <div><CameraOff className="mx-auto size-8 text-[#9B8E84]" /><p className="mt-3 text-sm font-bold text-[#62564E]">Property photos are not available.</p><p className="mt-1 text-xs text-[#81756D]">The listing API does not currently provide images.</p></div>
        </section>

        <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0">
            <section>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-heading text-3xl leading-tight text-[#40362F] sm:text-4xl">{listing.title}</h1>
                  <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-[#7A6E65]"><MapPin className="size-4" />{listing.location ? `${listing.location.latitude.toFixed(5)}, ${listing.location.longitude.toFixed(5)}` : 'Location not provided'}</p>
                </div>
                <span className="rounded-full bg-blush px-3 py-1.5 text-xs font-bold text-[#714A48]">Listing #{listing.id}</span>
              </div>
              {listing.description ? <p className="mt-5 text-sm leading-7 text-[#62564E]">{listing.description}</p> : <p className="mt-5 text-sm italic text-[#81756D]">No description was provided.</p>}
            </section>

            <SafetyPanel safety={safety} onRetry={() => setRequestVersion((value) => value + 1)} />

            <section className="mt-7 pb-12">
              <h2 className="font-heading text-2xl text-[#40362F]">House rules and costs</h2>
              <div className="mt-3 divide-y divide-[#E3D9CF] border-y border-[#E3D9CF]">
                <div className="flex min-h-12 items-center gap-3 py-2 text-sm text-[#62564E]"><Clock3 className="size-4 shrink-0 text-[#77734E]" /><p>{listing.curfewRules || 'No curfew rules were provided.'}</p></div>
                <div className="flex min-h-12 items-center gap-3 py-2 text-sm text-[#62564E]"><WalletCards className="size-4 shrink-0 text-[#77734E]" /><p>Deposit: PKR {listing.deposit.toLocaleString('en-PK')}</p></div>
              </div>
            </section>
          </div>

          <aside className="rounded-2xl border border-[#E3D9CF] bg-white p-5 shadow-[0_14px_34px_rgba(88,67,52,0.09)] lg:sticky lg:top-6">
            <p className="font-heading text-3xl text-[#40362F]">PKR {listing.rent.toLocaleString('en-PK')}<span className="font-body text-sm text-[#756960]">/month</span></p>
            <p className="mt-3 text-sm text-[#756960]">Deposit: PKR {listing.deposit.toLocaleString('en-PK')}</p>
            <InquiryPanel listingId={listing.id} />
            <p className="mt-5 border-t border-[#EEE6DF] pt-4 text-xs text-[#81756D]">Published {formatDate(listing.createdAt)}</p>
          </aside>
        </div>
      </main>
    </div>
  )
}

function InquiryPanel({ listingId }: { listingId: string }) {
  const router = useRouter()
  const { user, status } = useAuth()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (status !== 'authenticated' || user?.userType !== 'tenant') {
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setError('')
    api.inquiries.mine()
      .then((items) => {
        if (active) setInquiry(items.find((item) => item.listing.id === listingId) || null)
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load inquiry status.')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [listingId, status, user])

  async function sendInquiry() {
    if (status !== 'authenticated') {
      router.push('/login?next=' + encodeURIComponent('/listings/' + listingId))
      return
    }
    if (user?.userType !== 'tenant') return

    setSubmitting(true)
    setError('')
    try {
      setInquiry(await api.inquiries.create(listingId))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send inquiry.')
    } finally {
      setSubmitting(false)
    }
  }

  async function withdrawInquiry() {
    if (!inquiry) return
    setSubmitting(true)
    setError('')
    try {
      setInquiry(await api.inquiries.updateStatus(inquiry.id, 'withdrawn'))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to withdraw inquiry.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="mt-5 h-11 animate-pulse rounded-full bg-[#EEE5DC]" aria-label="Loading inquiry status" />
  }

  if (status === 'authenticated' && user?.userType !== 'tenant') {
    return <p className="mt-5 rounded-xl bg-[#F6EDE4] p-3 text-xs text-[#756960]">Inquiries can only be sent from tenant accounts.</p>
  }

  const active = inquiry && ['pending', 'accepted'].includes(inquiry.status)

  return (
    <div className="mt-5 border-t border-[#EEE6DF] pt-5">
      {inquiry && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#62564E]">Your inquiry</span>
          <InquiryStatusBadge status={inquiry.status} />
        </div>
      )}
      {active ? (
        <button type="button" disabled={submitting} onClick={withdrawInquiry} className="min-h-11 w-full rounded-full border border-[#D8CDC3] px-5 text-sm font-bold disabled:cursor-wait disabled:opacity-60">
          {submitting ? 'Updating...' : 'Withdraw inquiry'}
        </button>
      ) : (
        <button type="button" disabled={submitting} onClick={sendInquiry} className="min-h-11 w-full rounded-full bg-gradient-to-r from-peach to-peach-deep px-5 text-sm font-bold text-[#49362A] disabled:cursor-wait disabled:opacity-60">
          {submitting ? 'Sending inquiry...' : inquiry ? 'Send a new inquiry' : 'Send inquiry'}
        </button>
      )}
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
      {inquiry?.status === 'pending' && <p role="status" className="mt-3 text-xs text-[#756960]">Your inquiry was sent to the listing’s landlord.</p>}
      {inquiry?.status === 'accepted' && <p role="status" className="mt-3 text-xs text-[#756960]">The landlord accepted your inquiry. This has not created a tenancy.</p>}
    </div>
  )
}
function SafetyPanel({ safety, onRetry }: { safety: SafetyState; onRetry: () => void }) {
  if (safety.status === 'loading') {
    return (
      <section aria-label="Loading safety information" className="mt-7 animate-pulse rounded-2xl border border-[#E4DAD0] bg-white p-6">
        <div className="h-7 w-48 rounded bg-[#EEE5DC]" />
        <div className="mt-3 h-4 w-72 max-w-full rounded bg-[#F3ECE5]" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-xl bg-[#F3ECE5]" />
          <div className="h-20 rounded-xl bg-[#F3ECE5]" />
          <div className="h-20 rounded-xl bg-[#F3ECE5]" />
        </div>
        <span className="sr-only" role="status">Loading safety information...</span>
      </section>
    )
  }

  if (safety.status === 'error') {
    return (
      <section className="mt-7 rounded-2xl border border-[#E4DAD0] bg-white p-6">
        <h2 className="font-heading text-2xl text-[#40362F]">Safety information unavailable</h2>
        <p role="alert" className="mt-2 text-sm text-[#756960]">Verification information could not be loaded from the backend.</p>
        <button type="button" onClick={onRetry} className="mt-4 rounded-full border border-[#D8CDC3] px-4 py-2 text-xs font-bold">Try again</button>
      </section>
    )
  }

  const { data, compliance, verification } = safety
  const audit = compliance.audit

  if (verification !== 'verified') {
    const content: Record<Exclude<PublicVerificationState, 'verified'>, { title: string; description: string }> = {
      pending: {
        title: 'Pending verification',
        description: 'The latest audit is conditional and has not met Humdum’s verified threshold.',
      },
      rejected: {
        title: 'Verification rejected',
        description: 'The latest audit needs attention and is not valid verification.',
      },
      expired: {
        title: 'Verification expired',
        description: 'The latest audit has expired. No safety score is shown until a current audit is completed.',
      },
      unavailable: {
        title: 'Safety information unavailable',
        description: 'No current, verified compliance information exists for this listing.',
      },
    }
    const stateContent = content[verification]

    return (
      <section className="mt-7 rounded-2xl border border-[#E4DAD0] bg-white p-6">
        <StatusBadge state={verification} />
        <h2 className="mt-3 font-heading text-2xl text-[#40362F]">{stateContent.title}</h2>
        <p className="mt-2 text-sm text-[#756960]">{stateContent.description}</p>
        {audit && (
          <dl className="mt-4 grid gap-2 text-xs text-[#756960] sm:grid-cols-2">
            <div><dt className="font-bold">Audit recorded</dt><dd>{formatDate(audit.createdAt)}</dd></div>
            <div><dt className="font-bold">Audit expiry</dt><dd>{formatDate(audit.expiryDate)}</dd></div>
          </dl>
        )}
      </section>
    )
  }

  if (!audit) return null
  const safetyCompliance = data.components.compliance
  const infrastructure = data.components.securityInfrastructure

  return (
    <section className="mt-7 rounded-2xl border border-[#E4DAD0] bg-white p-5 shadow-[0_10px_28px_rgba(88,67,52,0.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <StatusBadge state="verified" />
          <h2 className="mt-3 font-heading text-2xl text-[#40362F]">Current safety verification</h2>
          <p className="mt-1 text-xs text-[#756960]">Verified {formatDate(audit.createdAt)} · expires {formatDate(audit.expiryDate)} · data completeness {data.dataCompleteness}%</p>
        </div>
        <div className="rounded-full bg-cream px-5 py-3 text-center ring-4 ring-blush/35">
          <strong className="font-heading text-3xl leading-none text-[#40362F]">{data.safetyIndex}</strong>
          <p className="text-[9px] font-bold uppercase text-[#73675F]">Safety index</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SafetyFact label="Fire safety score" value={`${safetyCompliance.score}/100`} />
        <SafetyFact label="CCTV" value={infrastructure.cctvVerified ? 'Verified' : 'Not verified'} />
        <SafetyFact label="Warden" value={infrastructure.wardenVerified ? 'Verified' : 'Not verified'} />
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-[#756960]"><ShieldCheck className="size-4" /> Only current audit-backed fields are shown.</p>
    </section>
  )
}

function StatusBadge({ state }: { state: PublicVerificationState }) {
  const labels: Record<PublicVerificationState, string> = {
    verified: 'Verified',
    pending: 'Pending verification',
    rejected: 'Rejected',
    expired: 'Expired',
    unavailable: 'Unavailable',
  }
  const style = state === 'verified'
    ? 'bg-sage/45 text-[#545137]'
    : state === 'pending'
      ? 'bg-[#F5E7C3] text-[#725C25]'
      : state === 'rejected'
        ? 'bg-red-100 text-red-700'
        : 'bg-[#EEE6DF] text-[#756960]'
  return <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${style}`}>{labels[state]}</span>
}
function SafetyFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#F6EDE4] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#81756D]">{label}</p><p className="mt-1 text-sm font-bold text-[#4D423B]">{value}</p></div>
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(date)
}