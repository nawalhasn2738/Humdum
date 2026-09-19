'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  LayoutDashboard,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'

type ListingStatus = 'Live' | 'Pending review' | 'Needs changes' | 'Inactive'

type ManagedListing = {
  id: number
  title: string
  rent: number
  status: ListingStatus
  safetyScore: number | null
  bookings: number
}

const initialListings: ManagedListing[] = [
  {
    id: 1,
    title: 'Margalla View Residency',
    rent: 32000,
    status: 'Live',
    safetyScore: 91,
    bookings: 3,
  },
  {
    id: 2,
    title: 'Model Town Annex',
    rent: 27000,
    status: 'Pending review',
    safetyScore: null,
    bookings: 0,
  },
  {
    id: 3,
    title: 'F-10 Studio Flat',
    rent: 38000,
    status: 'Needs changes',
    safetyScore: 62,
    bookings: 0,
  },
]

const fieldClass =
  'mt-1.5 h-10 w-full rounded-xl border border-[#DDD2C7] bg-[#F6EDE4] px-3 text-sm text-[#443A34] outline-none transition placeholder:text-[#ADA39A] focus:border-terracotta focus:bg-white focus:ring-3 focus:ring-blush/40'

const statusStyles: Record<ListingStatus, string> = {
  Live: 'bg-sage/65 text-[#4D4932]',
  'Pending review': 'bg-peach/65 text-[#765532]',
  'Needs changes': 'bg-blush text-[#744A48]',
  Inactive: 'bg-[#E8E1DA] text-[#6D625A]',
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-1.5 font-heading text-xl font-semibold text-[#3E332D]">
      <span aria-hidden="true" className="size-6 rounded-lg bg-gradient-to-br from-terracotta to-peach" />
      Humdum
    </Link>
  )
}

export default function LandlordDashboardPage() {
  const [listings, setListings] = useState(initialListings)
  const [notice, setNotice] = useState('')

  function publishListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const title = String(data.get('title') || '').trim()
    const rent = Number(data.get('rent'))

    if (!title || !rent) {
      setNotice('Add a title and monthly rent before publishing.')
      return
    }

    setListings((current) => [
      {
        id: Date.now(),
        title,
        rent,
        status: 'Pending review',
        safetyScore: null,
        bookings: 0,
      },
      ...current,
    ])
    form.reset()
    setNotice(title + ' was submitted for verification.')
  }

  function updateStatus(id: number, status: ListingStatus) {
    setListings((current) =>
      current.map((listing) => (listing.id === id ? { ...listing, status } : listing)),
    )
  }

  function withdraw(id: number) {
    setListings((current) => current.filter((listing) => listing.id !== id))
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
              Landlord
            </span>
            <Link
              href="/profile"
              aria-label="Open landlord profile"
              className="grid size-9 place-items-center rounded-full bg-peach font-heading text-sm font-bold text-[#4B3B2D]"
            >
              S
            </Link>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-[#E5DBD1] px-4 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <nav aria-label="Landlord navigation" className="flex gap-2 overflow-x-auto lg:flex-col">
            <Link
              href="/landlord/dashboard"
              aria-current="page"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold text-[#40362F] shadow-[0_6px_18px_rgba(87,64,50,0.06)]"
            >
              <LayoutDashboard className="size-4 text-[#77734E]" />
              Dashboard
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
            <h1 className="font-heading text-3xl leading-tight text-[#40362F] sm:text-4xl">
              Landlord dashboard
            </h1>
            <p className="mt-2 text-sm text-[#7A6E65]">
              Manage your listings and publish new ones for verification.
            </p>

            <section className="mt-6 rounded-2xl border border-[#E3D9CF] bg-white p-5 shadow-[0_13px_32px_rgba(88,67,52,0.07)] sm:p-6">
              <h2 className="font-heading text-xl text-[#40362F]">Add a new listing</h2>

              <form onSubmit={publishListing} className="mt-4">
                <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-[#62564E]">
                    Listing title
                    <input
                      name="title"
                      placeholder="e.g. Sunny Room near NUST"
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-xs font-bold text-[#62564E]">
                    Monthly rent (PKR)
                    <input
                      name="rent"
                      type="number"
                      min="1"
                      placeholder="30000"
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-xs font-bold text-[#62564E]">
                    Security deposit (PKR)
                    <input
                      name="deposit"
                      type="number"
                      min="0"
                      placeholder="25000"
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-xs font-bold text-[#62564E]">
                    Curfew time
                    <input name="curfew" type="time" defaultValue="22:00" className={fieldClass} />
                  </label>
                  <label className="block text-xs font-bold text-[#62564E]">
                    Latitude
                    <input
                      name="latitude"
                      type="number"
                      step="any"
                      placeholder="33.6995"
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-xs font-bold text-[#62564E]">
                    Longitude
                    <input
                      name="longitude"
                      type="number"
                      step="any"
                      placeholder="73.0363"
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-xs font-bold text-[#62564E] sm:col-span-2">
                    Address
                    <input
                      name="address"
                      autoComplete="street-address"
                      placeholder="Street, sector, city"
                      className={fieldClass}
                    />
                  </label>
                </div>

                <fieldset className="mt-5">
                  <legend className="text-xs font-bold text-[#62564E]">Safety features on site</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {[
                      'CCTV coverage',
                      'Guarded entrance',
                      'Perimeter lighting',
                      'Female-only floor/building',
                    ].map((feature) => (
                      <label key={feature} className="flex min-h-8 cursor-pointer items-center gap-2 text-xs font-semibold text-[#62564E]">
                        <input
                          type="checkbox"
                          name="features"
                          value={feature}
                          className="peer sr-only"
                        />
                        <span className="grid size-4 shrink-0 place-items-center rounded border border-[#AFA399] bg-white text-transparent transition peer-checked:border-[#88845D] peer-checked:bg-sage peer-checked:text-[#48442E]">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        {feature}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-peach to-peach-deep px-6 text-sm font-bold text-[#49362A] shadow-[0_7px_18px_rgba(231,151,150,0.24)] transition hover:brightness-[1.02]"
                  >
                    Publish listing for review
                  </button>
                  <p aria-live="polite" className="text-xs font-semibold text-[#6F6848]">
                    {notice}
                  </p>
                </div>
              </form>
            </section>

            <section className="mt-7 pb-12">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-heading text-2xl text-[#40362F]">Your active listings</h2>
                <span className="rounded-full bg-sage/45 px-3 py-1 text-xs font-bold text-[#5B573D]">
                  {listings.length} listings
                </span>
              </div>

              <div className="mt-3 overflow-x-auto rounded-2xl border border-[#E3D9CF] bg-white shadow-[0_10px_26px_rgba(88,67,52,0.05)]">
                <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E3D9CF] text-[#776B63]">
                      <th className="px-4 py-3 font-bold">Title</th>
                      <th className="px-4 py-3 font-bold">Rent</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 text-center font-bold">Safety score</th>
                      <th className="px-4 py-3 text-center font-bold">Bookings</th>
                      <th className="px-4 py-3 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DFD7]">
                    {listings.map((listing) => (
                      <tr key={listing.id} className="transition hover:bg-cream/70">
                        <td className="px-4 py-4 font-semibold text-[#443A34]">{listing.title}</td>
                        <td className="whitespace-nowrap px-4 py-4">PKR {listing.rent.toLocaleString()}</td>
                        <td className="px-4 py-4">
                          <span className={'inline-flex rounded-full px-2.5 py-1 font-bold ' + statusStyles[listing.status]}>
                            {listing.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-bold">
                          {listing.safetyScore ?? '—'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {listing.bookings ? listing.bookings + ' active' : '0'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setNotice('Editing ' + listing.title + '.')}
                              className="min-h-8 rounded-full bg-[#F5ECE3] px-3 font-bold transition hover:bg-peach/55"
                            >
                              Edit
                            </button>
                            {listing.status === 'Pending review' ? (
                              <button
                                type="button"
                                onClick={() => withdraw(listing.id)}
                                className="min-h-8 rounded-full bg-[#F5ECE3] px-3 font-bold transition hover:bg-blush"
                              >
                                Withdraw
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateStatus(listing.id, listing.status === 'Inactive' ? 'Live' : 'Inactive')}
                                className="min-h-8 rounded-full bg-[#F5ECE3] px-3 font-bold transition hover:bg-blush"
                              >
                                {listing.status === 'Inactive' ? 'Activate' : 'Deactivate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {listings.length === 0 && (
                  <div className="p-10 text-center">
                    <ShieldCheck className="mx-auto size-7 text-terracotta" />
                    <p className="mt-3 text-sm text-[#756960]">Your submitted listings will appear here.</p>
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
