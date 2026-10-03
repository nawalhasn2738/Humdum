'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Crosshair, MapPin, Search } from 'lucide-react'
import { api, type ListingDetail } from '@/lib/api'
import { listingSearchValidationError } from '@/lib/listing-contract'

const DEFAULT_CENTER = { latitude: 33.6844, longitude: 73.0479 }

export default function ListingsPage() {
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [radius, setRadius] = useState(5)
  const [query, setQuery] = useState('')
  const [listings, setListings] = useState<ListingDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locationNotice, setLocationNotice] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true
    const params = { ...center, radiusKm: radius }
    const validationError = listingSearchValidationError(params)

    if (validationError) {
      setListings([])
      setSelectedId(null)
      setError(validationError)
      setLoading(false)
      return () => { active = false }
    }

    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      api.listings.list(params)
        .then((response) => {
          if (!active) return
          setListings(response.listings)
          setSelectedId((current) =>
            response.listings.some((listing) => listing.id === current)
              ? current
              : response.listings[0]?.id || null,
          )
        })
        .catch((requestError) => {
          if (!active) return
          setListings([])
          setSelectedId(null)
          setError(requestError instanceof Error ? requestError.message : 'Unable to load listings.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [center, radius, requestVersion])

  const visibleListings = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return listings
    return listings.filter((listing) =>
      (listing.title + ' ' + (listing.description || '')).toLowerCase().includes(normalized),
    )
  }, [listings, query])

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationNotice('Location services are unavailable in this browser.')
      return
    }
    setLocationNotice('Finding your location...')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextCenter = { latitude: coords.latitude, longitude: coords.longitude }
        const validationError = listingSearchValidationError({ ...nextCenter, radiusKm: radius })
        if (validationError) {
          setLocationNotice(validationError)
          return
        }
        setCenter(nextCenter)
        setLocationNotice('Search centered on your current location.')
      },
      () => setLocationNotice('We could not access your location. Check browser permissions.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="border-b border-[#E5DBD1] bg-cream/95">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-heading text-xl font-semibold">Humdum</Link>
          <Link href="/profile" className="rounded-full bg-peach px-4 py-2 text-xs font-bold">Profile</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-heading text-4xl">Listings near you</h1>
            <p className="mt-2 text-sm text-[#7A6E65]">
              Results within {radius} km of {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)}.
            </p>
          </div>
          <button type="button" onClick={useCurrentLocation} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#8F8A5D] px-5 text-sm font-bold text-white">
            <Crosshair className="size-4" /> Use my location
          </button>
        </div>

        <p aria-live="polite" className="mt-2 min-h-5 text-xs font-semibold text-[#686344]">{locationNotice}</p>

        <div className="mt-5 grid gap-3 rounded-2xl border border-[#E3D9CF] bg-white p-4 md:grid-cols-[1fr_280px]">
          <label className="relative">
            <span className="sr-only">Filter returned listings by title or description</span>
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#81756C]" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter these results..." className="h-11 w-full rounded-full border border-[#DDD2C7] bg-[#F6EDE4] pl-11 pr-4 text-sm outline-none focus:border-terracotta" />
          </label>
          <label className="block text-xs font-bold">
            <span className="flex justify-between"><span>Search radius</span><span>{radius} km</span></span>
            <input type="range" min="1" max="25" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="mt-3 w-full accent-[#8F8A5D]" />
          </label>
        </div>

        {error && (
          <div role="alert" className="mt-5 rounded-2xl border border-[#DCAAAA] bg-blush/40 p-4 text-sm font-semibold">
            <p>{error}</p>
            <button type="button" onClick={() => setRequestVersion((value) => value + 1)} className="mt-3 rounded-full border border-[#C98B89] px-4 py-2 text-xs font-bold">Try again</button>
          </div>
        )}

        <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section aria-label="Geospatial result map" className="relative min-h-[300px] overflow-hidden rounded-2xl border border-[#E5DCD2] bg-[#EAE2D3] sm:min-h-[420px]">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
            <div className="absolute left-4 top-4 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold shadow">PostGIS radius: {radius} km</div>
            {visibleListings.filter((listing) => listing.location).map((listing) => {
              const position = pinPosition(listing, center, radius)
              return (
                <button key={listing.id} type="button" onClick={() => setSelectedId(listing.id)} title={listing.title} style={{ left: position.left, top: position.top }} className={'absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full rounded-bl-md text-xs font-bold text-white shadow-lg ' + (selectedId === listing.id ? 'bg-terracotta ring-4 ring-white/80' : 'bg-[#8F8A5D]')}>
                  <MapPin className="size-4" />
                </button>
              )
            })}
          </section>

          <section aria-label="Property listing feed" className="space-y-3">
            {loading && <p role="status" className="rounded-2xl bg-white p-8 text-center text-sm font-semibold">Searching nearby homes...</p>}
            {!loading && !error && visibleListings.length === 0 && (
              <p className="rounded-2xl bg-white p-8 text-center text-sm">
                {listings.length === 0 ? 'No listings were returned within this radius.' : 'No returned listings match this filter.'}
              </p>
            )}
            {!loading && !error && visibleListings.map((listing) => (
              <article key={listing.id} onMouseEnter={() => setSelectedId(listing.id)} className={'rounded-2xl border bg-white p-5 shadow-sm ' + (selectedId === listing.id ? 'border-terracotta/70' : 'border-[#E3DAD1]')}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-xl font-semibold">{listing.title}</h2>
                    {listing.distanceKm !== undefined && <p className="mt-1 text-xs text-[#7B6F66]">{listing.distanceKm.toFixed(2)} km away</p>}
                  </div>
                  <p className="shrink-0 text-sm font-bold">PKR {listing.rent.toLocaleString('en-PK')}/mo</p>
                </div>
                {listing.description && <p className="mt-3 line-clamp-2 text-sm text-[#62564E]">{listing.description}</p>}
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#EEE6DF] pt-3">
                  <span className="text-xs text-[#756960]">Deposit: PKR {listing.deposit.toLocaleString('en-PK')}</span>
                  <Link href={'/listings/' + listing.id} className="shrink-0 text-sm font-bold text-terracotta">View details</Link>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}

function pinPosition(listing: ListingDetail, center: { latitude: number; longitude: number }, radiusKm: number) {
  if (!listing.location) return { left: '50%', top: '50%' }
  const latitudeRange = radiusKm / 111
  const longitudeRange = latitudeRange / Math.max(Math.cos(center.latitude * Math.PI / 180), 0.2)
  const left = clamp(50 + ((listing.location.longitude - center.longitude) / longitudeRange) * 42)
  const top = clamp(50 - ((listing.location.latitude - center.latitude) / latitudeRange) * 42)
  return { left: left + '%', top: top + '%' }
}

function clamp(value: number) {
  return Math.min(92, Math.max(8, value))
}