'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BadgeCheck, Check, MapPin, ShieldCheck, TrainFront } from 'lucide-react'
import { Nav } from '@/components/nav'
import { fallbackListings, listingImage, mapApiListing } from '@/lib/listing-mapper'
import { useAuth } from '@/lib/auth-context'
import {
  ApiError,
  bookTenancy,
  getListingAudit,
  getListingById,
  getListingSafetyScore,
  sendListingMessage,
  type SafetyScore,
} from '@/lib/api'
import type { Listing } from '@/lib/mock-data'

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, applications, applyToListing } = useAuth()
  const [listing, setListing] = useState<Listing | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [safetyScore, setSafetyScore] = useState<SafetyScore | null>(null)
  const [safetyStatus, setSafetyStatus] = useState('')
  const [message, setMessage] = useState('')
  const [messageStatus, setMessageStatus] = useState('')
  const [applyStatus, setApplyStatus] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    let cancelled = false

    async function loadListing() {
      try {
        const response = await getListingById(id)
        if (cancelled) {
          return
        }
        const mapped = mapApiListing(response.listing)
        setListing(mapped)
        try {
          const [score, audit] = await Promise.all([
            getListingSafetyScore(id),
            getListingAudit(id),
          ])
          if (!cancelled) {
            setSafetyScore(score)
            setSafetyStatus(audit.safetyStatus)
            setListing({
              ...mapped,
              isVerified: audit.safetyStatus === 'verified',
              hasCCTV: audit.audit?.cctvVerified ?? false,
            })
          }
        } catch {
          // Listing still renders if score/audit endpoints are empty.
        }
      } catch {
        const fallback = fallbackListings().find((item) => item.id === id)
        if (cancelled) {
          return
        }
        if (fallback) {
          setListing(fallback)
        } else {
          setNotFound(true)
        }
      }
    }

    void loadListing()
    return () => {
      cancelled = true
    }
  }, [id])

  async function apply() {
    if (!listing) {
      return
    }
    if (!user) {
      router.push(`/login?next=/listing/${listing.id}`)
      return
    }
    if (user.userType !== 'seeker') {
      setApplyStatus('Only tenant accounts can apply for a place.')
      return
    }

    try {
      await bookTenancy({ listingId: listing.id, startDate })
      applyToListing({ listingId: listing.id, listingTitle: listing.title, area: listing.area, price: listing.price })
      router.push('/applications')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setApplyStatus(error.message)
        applyToListing({ listingId: listing.id, listingTitle: listing.title, area: listing.area, price: listing.price })
        return
      }
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setApplyStatus(error.message)
        return
      }
      applyToListing({ listingId: listing.id, listingTitle: listing.title, area: listing.area, price: listing.price })
      setApplyStatus(error instanceof Error ? error.message : 'Application saved locally.')
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    if (!listing) {
      return
    }
    if (!user) {
      router.push(`/login?next=/listing/${listing.id}`)
      return
    }
    if (!listing.landlordId) {
      setMessageStatus('This sample listing has no live landlord to message yet.')
      return
    }

    try {
      await sendListingMessage({
        listingId: listing.id,
        receiverId: listing.landlordId,
        content: message,
      })
      setMessage('')
      setMessageStatus('Message sent through the masked in-app channel.')
    } catch (error) {
      setMessageStatus(error instanceof Error ? error.message : 'Unable to send the message.')
    }
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-cream">
        <Nav />
        <main className="mx-auto max-w-3xl px-5 py-20">
          <h1 className="font-display text-5xl">{notFound ? 'Place not found' : 'Loading place...'}</h1>
          {notFound && <Link href="/" className="mt-6 inline-flex rounded-full bg-sage px-5 py-3 font-semibold text-white">Back to places</Link>}
        </main>
      </div>
    )
  }

  const hasApplied = applications.some((application) => application.listingId === listing.id)

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <Link href="/#places" className="inline-flex items-center gap-2 text-sm font-semibold text-sage"><ArrowLeft className="size-4" /> Back to places</Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <img src={listingImage(listing.id)} alt={listing.title} className="aspect-[1.4] w-full rounded-3xl object-cover" />
            <div className="mt-8">
              <div className="flex flex-wrap gap-2">
                {listing.isVerified && <span className="flex items-center gap-1 rounded-full bg-sage-light px-3 py-1 text-sm font-semibold text-sage"><BadgeCheck className="size-4" /> Verified</span>}
                {listing.isWomenOnly && <span className="rounded-full bg-rose px-3 py-1 text-sm font-semibold text-white">Women only</span>}
                {safetyStatus && <span className="rounded-full bg-sage-light px-3 py-1 text-sm font-semibold text-sage">{safetyStatus.replace('_', ' ')}</span>}
              </div>
              <h1 className="mt-4 font-display text-5xl">{listing.title}</h1>
              <p className="mt-2 flex items-center gap-1 text-muted-foreground"><MapPin className="size-4" /> {listing.area}</p>
              <p className="mt-6 leading-7 text-muted-foreground">{listing.description}</p>
              {listing.curfewRules && <p className="mt-4 rounded-2xl bg-sage-light px-4 py-3 text-sm text-sage">Curfew: {listing.curfewRules}</p>}
              {listing.location && <p className="mt-3 text-sm text-muted-foreground">Coordinates: {listing.location.latitude.toFixed(4)}, {listing.location.longitude.toFixed(4)}</p>}
            </div>
            <form onSubmit={sendMessage} className="mt-8 rounded-3xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl">Masked inquiry</h2>
              <p className="mt-2 text-sm text-muted-foreground">Phone numbers stay hidden. Your message is delivered through the in-app channel.</p>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={4} className="mt-4 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" placeholder="Ask about vacancy, curfew, or family visit rules." />
              <button className="mt-4 rounded-full bg-sage px-5 py-3 text-sm font-semibold text-white">Send message</button>
              {messageStatus && <p className="mt-3 text-sm text-muted-foreground">{messageStatus}</p>}
            </form>
          </div>
          <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-28">
            <p className="text-sm text-muted-foreground">Monthly rent</p>
            <p className="mt-1 text-3xl font-bold text-sage">PKR {listing.price.toLocaleString()}</p>
            {listing.deposit ? <p className="mt-1 text-sm text-muted-foreground">Deposit PKR {listing.deposit.toLocaleString()}</p> : null}
            <div className="my-6 grid gap-3 border-y border-border py-5 text-sm">
              <p className="flex items-center gap-2"><TrainFront className="size-4 text-rose" /> {listing.metroDistance ? `${listing.metroDistance.toFixed(2)} km from search center` : 'Transit details shown after a radius search'}</p>
              <p className="flex items-center gap-2"><ShieldCheck className="size-4 text-sage" /> {safetyScore?.score != null ? `Safety index ${safetyScore.score}` : 'Safety checked'}</p>
            </div>
            <h2 className="font-display text-2xl">Amenities</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">{listing.amenities.map((item) => <p key={item} className="flex items-center gap-2"><Check className="size-4 text-sage" /> {item}</p>)}</div>
            <label className="mt-6 block text-sm font-medium">Move-in date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label>
            <button onClick={apply} disabled={hasApplied || user?.userType === 'host'} className="mt-7 w-full rounded-full bg-rose px-5 py-3 font-semibold text-white disabled:opacity-60">{hasApplied ? 'Application sent' : user ? 'Apply for this place' : 'Log in to apply'}</button>
            {applyStatus && <p className="mt-3 text-sm text-destructive">{applyStatus}</p>}
          </aside>
        </div>
      </main>
    </div>
  )
}
