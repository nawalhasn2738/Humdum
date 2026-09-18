'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { useAuth } from '@/lib/auth-context'
import { ApiError, createListing } from '@/lib/api'
import { AREA_COORDINATES } from '@/lib/listing-mapper'

export default function ListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('H-11')
  const [rent, setRent] = useState('')
  const [deposit, setDeposit] = useState('')
  const [curfewRules, setCurfewRules] = useState('')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState(String(AREA_COORDINATES['H-11'].latitude))
  const [longitude, setLongitude] = useState(String(AREA_COORDINATES['H-11'].longitude))
  const [saving, setSaving] = useState(false)

  const areaOptions = useMemo(() => Object.keys(AREA_COORDINATES), [])

  function applyArea(nextArea: string) {
    setArea(nextArea)
    const coordinates = AREA_COORDINATES[nextArea]
    if (coordinates) {
      setLatitude(String(coordinates.latitude))
      setLongitude(String(coordinates.longitude))
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!user) {
      router.push('/login?next=/list')
      return
    }

    if (user.userType !== 'host') {
      setError('A landlord account is required to create a listing.')
      return
    }

    setSaving(true)
    try {
      await createListing({
        title,
        description: `${area}. ${description}`.trim(),
        rent: Number(rent),
        deposit: deposit ? Number(deposit) : 0,
        curfewRules,
        latitude: Number(latitude),
        longitude: Number(longitude),
      })
      setSubmitted(true)
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 403) {
        setError('You do not have permission to create a listing.')
      } else {
        setError(submitError instanceof Error ? submitError.message : 'Unable to create listing.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="mx-auto max-w-2xl px-5 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">For hosts</p>
        <h1 className="mt-2 font-display text-5xl">List your place</h1>
        <p className="mt-3 text-muted-foreground">Tell students and working women why your space feels like home. Location is stored as a PostGIS point.</p>
        {!user && (
          <p className="mt-4 rounded-xl bg-sage-light px-4 py-3 text-sm text-sage">
            <Link href="/login?next=/list" className="font-semibold">Log in as a host</Link> before submitting a listing.
          </p>
        )}
        {submitted ? (
          <div className="mt-8 rounded-2xl bg-sage p-8 text-white">
            <h2 className="font-display text-3xl">Listing saved</h2>
            <p className="mt-2 text-white/75">The property is now in the live listings API with latitude and longitude.</p>
            <button onClick={() => router.push('/')} className="mt-6 rounded-full bg-white px-5 py-3 font-semibold text-sage">Back home</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <label className="text-sm font-medium">Property name<input value={title} onChange={(event) => setTitle(event.target.value)} required className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label>
            <label className="text-sm font-medium">Area<select value={area} onChange={(event) => applyArea(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage">{areaOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Monthly rent<input value={rent} onChange={(event) => setRent(event.target.value)} required type="number" min="1" className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label>
              <label className="text-sm font-medium">Deposit<input value={deposit} onChange={(event) => setDeposit(event.target.value)} type="number" min="0" className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Latitude<input value={latitude} onChange={(event) => setLatitude(event.target.value)} required className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label>
              <label className="text-sm font-medium">Longitude<input value={longitude} onChange={(event) => setLongitude(event.target.value)} required className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label>
            </div>
            <label className="text-sm font-medium">Curfew rules<input value={curfewRules} onChange={(event) => setCurfewRules(event.target.value)} placeholder="Entry before 11:00 PM" className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label>
            <label className="text-sm font-medium">About your place<textarea value={description} onChange={(event) => setDescription(event.target.value)} required rows={4} className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage" /></label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button disabled={saving} className="rounded-full bg-rose px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Submitting...' : 'Submit for review'}</button>
          </form>
        )}
      </main>
    </div>
  )
}
