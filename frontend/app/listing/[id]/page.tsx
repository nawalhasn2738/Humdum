'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BadgeCheck, Check, MapPin, ShieldCheck, TrainFront } from 'lucide-react'
import { Nav } from '@/components/nav'
import { mockListings } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'

const imageMap: Record<string, string> = {
  '1': 'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=85',
  '2': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85',
  '3': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
  '4': 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=85',
  '5': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, applications, applyToListing } = useAuth()
  const listing = mockListings.find(item => item.id === id)
  if (!listing) return <div className="min-h-screen bg-cream"><Nav /><main className="mx-auto max-w-3xl px-5 py-20"><h1 className="font-display text-5xl">Place not found</h1><Link href="/" className="mt-6 inline-flex rounded-full bg-sage px-5 py-3 font-semibold text-white">Back to places</Link></main></div>
  function apply() {
    if (!user) {
      router.push(`/login?next=/listing/${listing.id}`)
      return
    }
    if (user.userType !== 'seeker') return
    applyToListing({ listingId: listing.id, listingTitle: listing.title, area: listing.area, price: listing.price })
    router.push('/applications')
  }
  const hasApplied = applications.some(application => application.listingId === listing.id)
  return <div className="min-h-screen bg-cream"><Nav /><main className="mx-auto max-w-6xl px-5 py-10 lg:px-8"><Link href="/#places" className="inline-flex items-center gap-2 text-sm font-semibold text-sage"><ArrowLeft className="size-4" /> Back to places</Link><div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]"><div><img src={imageMap[listing.id]} alt={listing.title} className="aspect-[1.4] w-full rounded-3xl object-cover" /><div className="mt-8"><div className="flex flex-wrap gap-2">{listing.isVerified && <span className="flex items-center gap-1 rounded-full bg-sage-light px-3 py-1 text-sm font-semibold text-sage"><BadgeCheck className="size-4" /> Verified</span>}{listing.isWomenOnly && <span className="rounded-full bg-rose px-3 py-1 text-sm font-semibold text-white">Women only</span>}</div><h1 className="mt-4 font-display text-5xl">{listing.title}</h1><p className="mt-2 flex items-center gap-1 text-muted-foreground"><MapPin className="size-4" /> {listing.area}</p><p className="mt-6 leading-7 text-muted-foreground">{listing.description}</p></div></div><aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-28"><p className="text-sm text-muted-foreground">Monthly rent</p><p className="mt-1 text-3xl font-bold text-sage">PKR {listing.price.toLocaleString()}</p><div className="my-6 grid gap-3 border-y border-border py-5 text-sm"><p className="flex items-center gap-2"><TrainFront className="size-4 text-rose" /> {listing.metroDistance} km to {listing.nearestMetroStation}</p><p className="flex items-center gap-2"><ShieldCheck className="size-4 text-sage" /> Safety checked</p></div><h2 className="font-display text-2xl">Amenities</h2><div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">{listing.amenities.map(item => <p key={item} className="flex items-center gap-2"><Check className="size-4 text-sage" /> {item}</p>)}</div><button onClick={apply} disabled={hasApplied || user?.userType === 'host'} className="mt-7 w-full rounded-full bg-rose px-5 py-3 font-semibold text-white">{user ? 'Apply for this place' : 'Log in to apply'}</button></aside></div></main></div>
}
