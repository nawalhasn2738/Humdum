'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Bell, Check, ChevronRight, Edit3, Heart, LogOut, Mail, MapPin, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { Nav } from '@/components/nav'
import { useAuth } from '@/lib/auth-context'
import { ApiError, saveFamilyProfile } from '@/lib/api'

const interests = ['Near campus', 'Women only', 'Quiet spaces']

export default function ProfilePage() {
  const { user, applications, logout } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [area, setArea] = useState('Islamabad')
  const [saved, setSaved] = useState(false)
  const [guardianName, setGuardianName] = useState('')
  const [guardianRelationship, setGuardianRelationship] = useState('Parent')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [familyStatus, setFamilyStatus] = useState('')

  const firstName = useMemo(() => (name || user?.name || 'there').split(' ')[0], [name, user?.name])
  const completion = user ? (area ? 85 : 60) : 0

  if (!user) {
    return (
      <div className="min-h-screen bg-cream">
        <Nav />
        <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-xl items-center px-4 py-10 sm:px-6">
          <section className="w-full rounded-[2rem] border border-border bg-card p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-sage-light text-sage"><UserRound /></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-rose">Your humdum profile</p>
            <h1 className="mt-2 break-words font-display text-4xl leading-tight sm:text-5xl">Make your search feel like home</h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">Create a profile to save places, manage applications, and get better recommendations.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-full bg-sage px-6 py-3 text-sm font-semibold text-white transition hover:bg-sage/90">Create profile <ArrowRight className="ml-2 size-4" /></Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition hover:border-sage">Log in</Link>
            </div>
          </section>
        </main>
      </div>
    )
  }

  const saveProfile = () => setEditing(false)

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-12">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose">Your space</p>
            <h1 className="mt-2 break-words font-display text-4xl leading-tight sm:text-5xl">Hello, {firstName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your next chapter starts here</p>
          </div>
          <button onClick={() => setEditing(value => !value)} aria-label="Edit profile" className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-sage transition hover:border-sage hover:bg-sage-light"><Edit3 className="size-4" /></button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <section className="overflow-hidden rounded-[2rem] bg-sage text-white shadow-sm">
            <div className="flex items-start justify-between gap-4 p-6 sm:p-8">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/15 font-display text-2xl uppercase">{firstName.slice(0, 1)}</div>
                <div className="min-w-0"><h2 className="truncate font-display text-2xl sm:text-3xl">{name || user.name}</h2><p className="mt-1 flex items-center gap-1 truncate text-sm text-white/70"><Mail className="size-3.5" />{user.email}</p></div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"><ShieldCheck className="size-3.5" /> Verified</span>
            </div>
            <div className="border-t border-white/15 px-6 py-5 sm:px-8">
              <div className="flex items-center justify-between text-sm"><span className="text-white/75">Profile strength</span><span className="font-semibold">{completion}%</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-rose" style={{ width: `${completion}%` }} /></div>
              <p className="mt-3 text-xs text-white/65">Add your preferences to get more relevant places</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-rose">Your activity</p><h2 className="mt-1 font-display text-2xl">Moving forward</h2></div><Sparkles className="size-5 text-rose" /></div>
            <div className="mt-6 grid grid-cols-2 gap-3"><Link href="/saved" className="rounded-2xl bg-rose/10 p-4 transition hover:bg-rose/15"><Heart className="size-5 text-rose" /><p className="mt-3 font-display text-2xl">{saved ? 1 : 0}</p><p className="text-xs text-muted-foreground">Saved places</p></Link><Link href="/applications" className="rounded-2xl bg-sage-light p-4 transition hover:bg-sage-light/70"><Bell className="size-5 text-sage" /><p className="mt-3 font-display text-2xl">{applications.length}</p><p className="text-xs text-muted-foreground">Applications</p></Link></div>
          </section>
        </div>

        {editing && <section className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-rose">Edit details</p><h2 className="mt-1 font-display text-2xl">Make it yours</h2></div><button onClick={() => setEditing(false)} className="text-sm font-semibold text-muted-foreground">Close</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Your name<input value={name} onChange={event => setName(event.target.value)} className="min-h-12 rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-sage focus:ring-2 focus:ring-sage/15" /></label><label className="grid gap-2 text-sm font-semibold">Preferred area<select value={area} onChange={event => setArea(event.target.value)} className="min-h-12 rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-sage focus:ring-2 focus:ring-sage/15"><option>Islamabad</option><option>Rawalpindi</option><option>Both cities</option></select></label></div><button onClick={saveProfile} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-sage px-6 py-3 text-sm font-semibold text-white transition hover:bg-sage/90"><Check className="mr-2 size-4" />Save changes</button></section>}

        <section className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose">Family-shareable profile</p>
          <h2 className="mt-1 font-display text-2xl">Emergency guardian details</h2>
          <p className="mt-2 text-sm text-muted-foreground">Requires an active tenancy. Phone numbers stay on the server and are only shown to authorized hosts or admins.</p>
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              try {
                await saveFamilyProfile({
                  emergencyContact: { name: guardianName, relationship: guardianRelationship },
                  guardianPhones: { primary: guardianPhone },
                  checkInPreferences: { preferredArea: area },
                })
                setFamilyStatus('Family profile saved.')
              } catch (error) {
                setFamilyStatus(error instanceof ApiError ? error.message : 'Unable to save family profile.')
              }
            }}
            className="mt-5 grid gap-4 sm:grid-cols-2"
          >
            <label className="grid gap-2 text-sm font-semibold">Guardian name<input value={guardianName} onChange={(event) => setGuardianName(event.target.value)} required className="min-h-12 rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-sage" /></label>
            <label className="grid gap-2 text-sm font-semibold">Relationship<input value={guardianRelationship} onChange={(event) => setGuardianRelationship(event.target.value)} required className="min-h-12 rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-sage" /></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Guardian phone<input value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} required placeholder="+923001234567" className="min-h-12 rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-sage" /></label>
            <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-sage px-6 py-3 text-sm font-semibold text-white">Save family profile</button>
          </form>
          {familyStatus && <p className="mt-3 text-sm text-muted-foreground">{familyStatus}</p>}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-rose">Your preferences</p><h2 className="mt-1 font-display text-2xl">What matters to you</h2></div><MapPin className="size-5 text-sage" /></div><div className="mt-5 flex flex-wrap gap-2">{interests.map(interest => <span key={interest} className="rounded-full bg-sage-light px-3 py-2 text-xs font-semibold text-sage">{interest}</span>)}</div><button onClick={() => setEditing(true)} className="mt-6 inline-flex items-center text-sm font-semibold text-rose">Update preferences <ChevronRight className="ml-1 size-4" /></button></div>
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-rose">Quick actions</p><div className="mt-4 divide-y divide-border">{[{ href: '/saved', label: 'View saved places', icon: Heart }, { href: '/applications', label: 'Track applications', icon: Bell }, { href: '/list', label: 'List your place', icon: Sparkles }].map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="flex min-h-14 items-center justify-between gap-3 py-3 text-sm font-semibold transition hover:text-rose"><span className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-background text-sage"><Icon className="size-4" /></span><span className="truncate">{item.label}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground" /></Link> })}</div><button onClick={logout} className="mt-5 inline-flex items-center text-sm font-semibold text-muted-foreground transition hover:text-destructive"><LogOut className="mr-2 size-4" />Log out</button></div>
        </section>
      </main>
    </div>
  )
}
