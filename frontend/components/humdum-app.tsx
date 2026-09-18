'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, BedDouble, Check, Heart, Home, MapPin, Menu, Search, ShieldCheck, Sparkles, TrainFront, UserRound, UsersRound, X } from 'lucide-react'
import { type Listing } from '@/lib/mock-data'
import { getListings } from '@/lib/api'
import { fallbackListings, listingImage, mapApiListing, resolveAreaCoordinates } from '@/lib/listing-mapper'
import { Nav } from '@/components/nav'

function Logo() {
  return <Link href="/" className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-sage"><span className="grid size-9 place-items-center rounded-xl bg-sage text-white"><Home /></span>humdum</Link>
}

function Header({ onMenu }: { onMenu: () => void }) {
  return <header className="sticky top-0 z-20 border-b border-border/70 bg-cream/95 backdrop-blur"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8"><Logo /><nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex"><Link className="text-sage" href="/">Find a place</Link><Link href="#how">How it works</Link><Link href="#safety">Safety</Link><Link href="#about">About us</Link></nav><div className="hidden items-center gap-3 md:flex"><button className="rounded-full px-4 py-2 text-sm font-medium text-sage hover:bg-sage-light">Log in</button><button className="rounded-full bg-rose px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-dark">List your place</button></div><button aria-label="Open menu" onClick={onMenu} className="rounded-xl p-2 text-sage md:hidden"><Menu /></button></div></header>
}

function ListingCard({ listing, saved, onSave }: { listing: Listing; saved: boolean; onSave: () => void }) {
  return <Link href={`/listing/${listing.id}`} className="group block overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-[1.45] overflow-hidden sm:aspect-[1.35]"><img src={listingImage(listing.id)} alt={listing.title} loading="lazy" decoding="async" className="size-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-x-0 top-0 flex justify-between p-3"><div className="flex gap-2">{listing.isVerified && <span className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-sage"><BadgeCheck className="size-3.5" /> Verified</span>}{listing.isWomenOnly && <span className="rounded-full bg-rose/95 px-2.5 py-1 text-xs font-semibold text-white">Women only</span>}</div><button aria-label={saved ? 'Remove saved listing' : 'Save listing'} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onSave() }} className="grid size-9 place-items-center rounded-full bg-white/95 text-rose shadow-sm hover:bg-white">{saved ? <Heart className="size-4 fill-current" /> : <Heart className="size-4" />}</button></div></div><div className="p-4 sm:p-5"><div className="mb-2 flex items-start justify-between gap-3"><div><h3 className="font-display text-xl leading-tight text-foreground">{listing.title}</h3><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" /> {listing.area}</p></div><p className="shrink-0 text-right text-sm font-semibold text-sage">PKR {listing.price.toLocaleString()}<span className="block text-xs font-normal text-muted-foreground">/month</span></p></div><div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><TrainFront className="size-3.5 text-rose" /> {listing.metroDistance} km to metro</span><span className="flex items-center gap-1"><ShieldCheck className="size-3.5 text-sage" /> Safety checked</span></div></div></Link>
}

function SearchBar({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const suggestions = ['Islamabad', 'H-11', 'G-6', 'F-7', 'Gulberg', 'Rawalpindi']
  const visibleSuggestions = suggestions.filter((item) => item.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
  const submitSearch = () => {
    document.getElementById('places')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setIsFocused(false)
  }
  const chooseSuggestion = (suggestion: string) => {
    setValue(suggestion)
    onSearch(suggestion)
    setIsFocused(false)
  }
  return <form onSubmit={(event) => { event.preventDefault(); submitSearch() }} className="relative mx-auto flex w-full max-w-4xl flex-col gap-1.5 rounded-2xl border border-border bg-white p-1.5 text-left shadow-xl shadow-sage/10 sm:flex-row sm:gap-2 sm:p-2"><div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-3"><MapPin aria-hidden="true" className="size-5 shrink-0 text-rose" /><input aria-label="Search by area" autoComplete="off" value={value} onFocus={() => setIsFocused(true)} onChange={(event) => { setValue(event.target.value); onSearch(event.target.value); setIsFocused(true) }} className="min-h-8 min-w-0 flex-1 cursor-text bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search by area or city" />{value && <button type="button" aria-label="Clear area search" onClick={() => { setValue(''); onSearch('') }} className="rounded-full p-1 text-muted-foreground hover:bg-sage-light hover:text-sage">×</button>}</div>{isFocused && visibleSuggestions.length > 0 && <div className="absolute inset-x-2 top-[4.75rem] z-30 rounded-xl border border-border bg-card p-2 shadow-lg sm:top-[4.25rem]"><p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popular areas</p>{visibleSuggestions.map((suggestion) => <button type="button" key={suggestion} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(suggestion)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-foreground hover:bg-sage-light"><MapPin aria-hidden="true" className="size-4 text-rose" />{suggestion}</button>)}</div>}<button type="submit" className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-sage px-7 py-3 text-sm font-semibold text-white transition hover:bg-sage/90"><Search aria-hidden="true" className="size-4" /> Find my place</button></form>
}

export default function HumdumApp() {
  const [saved, setSaved] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [radiusKm, setRadiusKm] = useState(25)
  const [source, setSource] = useState<'api' | 'mock'>('api')
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [loadError, setLoadError] = useState('')
  const filtered = useMemo(() => allListings.filter((item) => `${item.title} ${item.area} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [allListings, query])
  const listings = showAll ? filtered : filtered.slice(0, 4)
  const toggleSave = (id: string) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  useEffect(() => {
    let cancelled = false

    async function loadListings() {
      try {
        const coordinates = resolveAreaCoordinates(query)
        const response = await getListings({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          radiusKm,
        })
        if (cancelled) {
          return
        }

        const mapped = response.listings.map((listing) => mapApiListing(listing))
        setAllListings(mapped.length ? mapped : fallbackListings())
        setSource(mapped.length ? 'api' : 'mock')
        setLoadError(mapped.length ? '' : 'No live listings in this radius yet, so sample places are shown.')
      } catch {
        if (cancelled) {
          return
        }
        setAllListings(fallbackListings())
        setSource('mock')
        setLoadError('The live listings API is unavailable, so sample places are shown.')
      }
    }

    void loadListings()
    return () => {
      cancelled = true
    }
  }, [query, radiusKm])

  return <div className="min-h-screen bg-cream"><Nav />
    {menuOpen && <div className="fixed inset-0 z-50 bg-sage p-6 text-white md:hidden"><div className="flex items-center justify-between"><Logo /><button aria-label="Close menu" onClick={() => setMenuOpen(false)}><X /></button></div><nav className="mt-20 flex flex-col gap-7 text-2xl font-display"><Link onClick={() => setMenuOpen(false)} href="#places">Find a place</Link><Link onClick={() => setMenuOpen(false)} href="#how">How it works</Link><Link onClick={() => setMenuOpen(false)} href="#safety">Safety</Link><Link onClick={() => setMenuOpen(false)} href="#about">About us</Link></nav></div>}
    <main>
      <section className="relative overflow-hidden bg-sage px-4 pb-14 pt-10 text-white sm:px-5 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-24"><div className="pointer-events-none absolute -right-32 -top-24 size-96 rounded-full border border-white/10" /><div className="pointer-events-none absolute bottom-[-180px] left-[-80px] size-96 rounded-full bg-rose/20 blur-3xl" /><div className="relative mx-auto max-w-5xl text-center"><div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/85"><Sparkles className="size-3.5" /> a safer way to settle in</div><h1 className="mx-auto max-w-4xl font-display text-[clamp(2.35rem,11vw,5rem)] leading-[1.02] tracking-tight sm:text-6xl lg:text-8xl">Find a place that feels like <em className="text-rose">home</em></h1><p className="mx-auto mt-5 max-w-xl text-[0.95rem] leading-6 text-white/75 sm:mt-6 sm:text-lg sm:leading-7">Verified hostels and shared spaces for students and working women in Islamabad & Rawalpindi.</p><div className="mt-10"><SearchBar onSearch={setQuery} /></div><div className="mt-7 flex flex-wrap justify-center gap-5 text-xs text-white/70"><span className="flex items-center gap-1.5"><Check className="size-4 text-rose" /> Verified listings</span><span className="flex items-center gap-1.5"><Check className="size-4 text-rose" /> Safety-first</span><span className="flex items-center gap-1.5"><Check className="size-4 text-rose" /> No hidden fees</span></div></div></section>
      <section id="places" className="mx-auto max-w-7xl px-4 py-12 sm:px-5 sm:py-16 lg:px-8 lg:py-24"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-rose">Places you can trust</p><h2 className="max-w-xl font-display text-[clamp(2rem,9vw,3rem)] leading-[1.05] sm:text-5xl">Made for your next chapter</h2>{loadError && <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>}</div><div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground">Radius <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} className="bg-transparent outline-none"><option value={5}>5 km</option><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option></select></label><span className="rounded-full bg-sage-light px-3 py-2 text-xs font-semibold text-sage">{source === 'api' ? 'Live listings' : 'Sample listings'}</span></div></div>{listings.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} saved={saved.includes(listing.id)} onSave={() => toggleSave(listing.id)} />)}</div> : <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">No places match your search yet.</div>}<div className="mt-10 text-center"><button onClick={() => setShowAll((current) => !current)} className="rounded-full border border-sage px-6 py-3 text-sm font-semibold text-sage transition hover:bg-sage hover:text-white">{showAll ? 'Show fewer places' : 'Explore all places'}</button></div></section>
      <section id="safety" className="border-y border-border/70 bg-white/50 px-5 py-16 lg:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-rose">Peace of mind, built in</p><h2 className="max-w-lg font-display text-4xl leading-tight sm:text-5xl">Your safety is never an afterthought</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">Every place on humdum is checked against the things that matter: secure access, clear exits, and a responsive person you can reach.</p><Link href="/safety" className="mt-7 inline-flex rounded-full bg-sage px-6 py-3 text-sm font-semibold text-white">How we verify places</Link></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-sage p-6 text-white"><ShieldCheck className="mb-12 size-8 text-rose" /><h3 className="font-display text-2xl">Safety checked</h3><p className="mt-2 text-sm leading-6 text-white/70">CCTV, guards, emergency exits and secure entry reviewed.</p></div><div className="rounded-2xl bg-rose p-6 text-white"><UsersRound className="mb-12 size-8 text-white/80" /><h3 className="font-display text-2xl">Real people</h3><p className="mt-2 text-sm leading-6 text-white/80">Connect directly with responsive wardens and hosts.</p></div><div className="rounded-2xl border border-border bg-card p-6 sm:col-span-2"><TrainFront className="mb-7 size-8 text-sage" /><h3 className="font-display text-2xl">Around the corner</h3><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">See exactly how close your new home is to metro stations, campuses, and the places you go every day.</p></div></div></div></section>
      <section id="how" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24"><div className="text-center"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-rose">Simple from start to settle</p><h2 className="font-display text-4xl sm:text-5xl">Find your humdum in three steps</h2></div><div className="mt-12 grid gap-8 md:grid-cols-3">{[['01', 'Tell us what you need', 'Share your area, budget, and what makes a place feel right for you.', Search], ['02', 'Explore with confidence', 'Compare verified places with clear safety details and real amenities.', BedDouble], ['03', 'Make it yours', 'Connect with your warden, apply, and get ready for your next chapter.', UserRound]].map(([number, title, body, Icon]) => <div key={number} className="relative border-t-2 border-sage pt-5"><span className="font-display text-5xl text-rose/70">{number as string}</span><Icon className="absolute right-0 top-5 size-7 text-sage" /><h3 className="mt-8 font-display text-2xl">{title as string}</h3><p className="mt-2 leading-7 text-muted-foreground">{body as string}</p></div>)}</div></section>
      <section id="about" className="bg-rose px-5 py-16 text-center text-white lg:px-8 lg:py-24"><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">A better way to belong</p><h2 className="mx-auto mt-3 max-w-2xl font-display text-4xl sm:text-6xl">Home is more than four walls</h2><p className="mx-auto mt-5 max-w-xl leading-7 text-white/80">humdum helps you find a safe, comfortable place — and the confidence to make it yours.</p><Link href="#places" className="mt-8 inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-rose hover:bg-cream">Start exploring</Link></section>
    </main><footer className="bg-sage px-5 py-8 text-white lg:px-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm sm:flex-row"><Logo /><p className="text-white/55">© 2026 humdum. Made for finding home.</p><div className="flex flex-wrap justify-center gap-5 text-white/65"><Link href="/safety">Safety</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link></div></div></footer>
  </div>
}
