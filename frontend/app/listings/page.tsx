'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BellRing,
  ChevronRight,
  Home,
  Map,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'

type Listing = {
  id: number
  title: string
  location: string
  room: string
  rent: number
  score: number
  curfew?: string
  femaleOnly: boolean
  gradient: string
  pin: string
}

const listings: Listing[] = [
  {
    id: 1,
    title: 'Margalla View Residency',
    location: 'F-7/2, Islamabad',
    room: 'Shared room',
    rent: 32000,
    score: 91,
    curfew: '10 PM curfew',
    femaleOnly: true,
    gradient: 'from-terracotta via-blush to-peach',
    pin: 'left-[18%] top-[14%]',
  },
  {
    id: 2,
    title: 'Willow Hostel for Women',
    location: 'G-9/1, Islamabad',
    room: 'Private room',
    rent: 24500,
    score: 88,
    curfew: '9:30 PM curfew',
    femaleOnly: true,
    gradient: 'from-[#D1BE88] to-peach-deep',
    pin: 'left-[55%] top-[27%]',
  },
  {
    id: 3,
    title: 'Satellite Town Studio',
    location: 'Satellite Town, Rawalpindi',
    room: 'Studio',
    rent: 28000,
    score: 77,
    femaleOnly: false,
    gradient: 'from-peach via-[#E9C88B] to-sage',
    pin: 'left-[25%] top-[57%]',
  },
  {
    id: 4,
    title: 'Bahria Girls Lodge',
    location: 'Bahria Town Phase 4',
    room: 'Shared room',
    rent: 30000,
    score: 84,
    curfew: '10:30 PM curfew',
    femaleOnly: true,
    gradient: 'from-blush via-[#D8B89D] to-[#8F8960]',
    pin: 'left-[42%] top-[38%]',
  },
]

type Filter = 'verified' | 'curfew' | 'female' | 'budget'

const filters: { id: Filter; label: string }[] = [
  { id: 'verified', label: 'Verified only' },
  { id: 'curfew', label: 'Curfew required' },
  { id: 'female', label: 'Female-only building' },
  { id: 'budget', label: 'Under 35,000 PKR' },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-1.5 font-heading text-xl font-semibold text-[#3E332D]">
      <span aria-hidden="true" className="size-6 rounded-lg bg-gradient-to-br from-terracotta to-peach" />
      Humdum
    </Link>
  )
}

export default function ListingsPage() {
  const [activeFilters, setActiveFilters] = useState<Filter[]>(['verified'])
  const [selectedId, setSelectedId] = useState(1)
  const [radius, setRadius] = useState(3)

  const visibleListings = useMemo(
    () =>
      listings.filter((listing) => {
        if (activeFilters.includes('curfew') && !listing.curfew) return false
        if (activeFilters.includes('female') && !listing.femaleOnly) return false
        if (activeFilters.includes('budget') && listing.rent >= 35000) return false
        return true
      }),
    [activeFilters],
  )

  const toggleFilter = (filter: Filter) => {
    setActiveFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    )
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
              aria-current="page"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold text-[#40362F] shadow-[0_6px_18px_rgba(87,64,50,0.06)]"
            >
              <Map className="size-4 text-[#77734E]" />
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
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960] transition hover:bg-white/70 hover:text-[#40362F]"
            >
              <Users className="size-4 text-[#999268]" />
              Family safety
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1080px]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="font-heading text-3xl leading-tight text-[#40362F] sm:text-4xl">
                  Listings near you
                </h1>
                <p className="mt-2 text-sm text-[#7A6E65]">
                  420 verified homes across Islamabad and Rawalpindi.
                </p>
              </div>

              <div className="flex max-w-2xl flex-wrap gap-2" aria-label="Listing filters">
                {filters.map((filter) => {
                  const active = activeFilters.includes(filter.id)
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleFilter(filter.id)}
                      className={'min-h-9 rounded-full border px-4 text-xs font-bold transition ' +
                        (active
                          ? 'border-sage bg-sage text-[#443F2B] shadow-sm'
                          : 'border-[#DDD2C7] bg-[#F5ECE3] text-[#70645C] hover:border-terracotta')}
                    >
                      {filter.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="relative mt-5 block md:hidden">
              <span className="sr-only">Search listings by location</span>
              <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#81756C]" />
              <input
                type="search"
                placeholder="Search neighborhoods..."
                className="h-11 w-full rounded-full border border-[#DDD2C7] bg-white pl-11 pr-4 text-sm outline-none focus:border-terracotta"
              />
            </label>

            <div className="mt-5 grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
              <section aria-label="Listings map" className="xl:sticky xl:top-24 xl:self-start">
                <div className="relative aspect-[1.12] min-h-[400px] overflow-hidden rounded-2xl border border-[#E5DCD2] bg-[#EAE2D3] shadow-[0_12px_32px_rgba(88,67,52,0.07)] xl:aspect-auto xl:h-[520px]">
                  <div aria-hidden="true" className="absolute -left-16 top-16 h-7 w-[125%] rotate-[18deg] bg-cream/55" />
                  <div aria-hidden="true" className="absolute -left-10 top-[58%] h-5 w-[120%] -rotate-[13deg] bg-white/45" />
                  <div aria-hidden="true" className="absolute left-[63%] -top-12 h-[125%] w-6 rotate-[7deg] bg-cream/45" />
                  <div aria-hidden="true" className="absolute left-[14%] top-[8%] size-44 rounded-full border border-sage/35" />
                  <div aria-hidden="true" className="absolute bottom-[12%] right-[8%] size-52 rounded-full border border-terracotta/20" />

                  {listings.map((listing) => {
                    const selected = selectedId === listing.id
                    const color =
                      listing.score >= 90
                        ? 'bg-terracotta'
                        : listing.score >= 84
                          ? 'bg-[#8E8A5B]'
                          : 'bg-peach-deep'
                    return (
                      <button
                        key={listing.id}
                        type="button"
                        aria-label={'Select ' + listing.title + ', safety score ' + listing.score}
                        onClick={() => setSelectedId(listing.id)}
                        className={'absolute z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full rounded-bl-md text-xs font-bold text-white shadow-[0_7px_14px_rgba(79,58,44,0.2)] transition hover:scale-110 ' +
                          listing.pin + ' ' + color + (selected ? ' ring-4 ring-white/80' : '')}
                      >
                        {listing.score}
                      </button>
                    )
                  })}

                  <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-[#E3D9CF] bg-white/95 p-4 shadow-[0_10px_25px_rgba(79,58,44,0.1)] backdrop-blur sm:inset-x-5 sm:bottom-5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>Search radius</span>
                      <output htmlFor="radius">{radius} km</output>
                    </div>
                    <input
                      id="radius"
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={radius}
                      onChange={(event) => setRadius(Number(event.target.value))}
                      className="mt-3 h-1.5 w-full cursor-pointer accent-[#9B966A]"
                    />
                  </div>
                </div>
              </section>

              <section aria-label="Property listing feed" className="space-y-3 xl:max-h-[520px] xl:overflow-y-auto xl:pr-1">
                {visibleListings.map((listing) => {
                  const selected = selectedId === listing.id
                  return (
                    <article
                      key={listing.id}
                      onMouseEnter={() => setSelectedId(listing.id)}
                      className={'grid min-h-[122px] grid-cols-[88px_minmax(0,1fr)_auto] gap-3 rounded-2xl border bg-white p-3 shadow-[0_9px_24px_rgba(88,67,52,0.06)] transition sm:grid-cols-[110px_minmax(0,1fr)_auto] ' +
                        (selected ? 'border-terracotta/70 shadow-[0_12px_28px_rgba(231,151,150,0.14)]' : 'border-[#E3DAD1]')}
                    >
                      <div className={'rounded-xl bg-gradient-to-br ' + listing.gradient} />

                      <div className="min-w-0 py-0.5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <h2 className="truncate font-heading text-base font-semibold text-[#40362F] sm:text-lg">
                            {listing.title}
                          </h2>
                          <p className="shrink-0 text-xs font-bold text-[#40362F] sm:text-sm">
                            PKR {listing.rent.toLocaleString()}/mo
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs text-[#7B6F66] sm:text-sm">
                          {listing.location} · {listing.room}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-1 text-[10px] font-bold text-[#4D4932]">
                            <ShieldCheck className="size-3" />
                            Verified
                          </span>
                          {listing.curfew && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blush px-2.5 py-1 text-[10px] font-bold text-[#724947]">
                              <BellRing className="size-3" />
                              {listing.curfew}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={'/listings/' + listing.id}
                        aria-label={'View ' + listing.title}
                        className="flex min-w-11 flex-col items-center justify-center self-stretch rounded-xl transition hover:bg-cream"
                      >
                        <strong className="font-heading text-xl text-[#40362F]">{listing.score}</strong>
                        <span className="text-[8px] font-bold uppercase text-[#776B63]">Safe</span>
                        <ChevronRight className="mt-1 size-3.5 text-[#9B8F86]" />
                      </Link>
                    </article>
                  )
                })}

                {visibleListings.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#D9CDC2] bg-white/60 p-10 text-center">
                    <Home className="mx-auto size-7 text-terracotta" />
                    <h2 className="mt-3 font-heading text-xl">No homes match these filters</h2>
                    <p className="mt-2 text-sm text-[#7B6F66]">Try removing one or more filters.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
