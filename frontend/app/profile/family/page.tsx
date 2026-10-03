'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BellRing, CheckCircle2, Clock3, LoaderCircle, ShieldAlert, WifiOff } from 'lucide-react'
import {
  api,
  ApiError,
  type FamilyProfile,
  type FamilySafetyState,
  type SafetyCheckIn,
} from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

const fieldClass = 'mt-1.5 h-11 w-full rounded-xl border border-[#DDD2C7] bg-[#F6EDE4] px-3.5 text-sm outline-none focus:border-terracotta focus:bg-white'

function normalizePhone(value: string) {
  const compact = value.replace(/[^+0-9]/g, '')
  return /^03\d{9}$/.test(compact) ? '+92' + compact.slice(1) : compact
}

export default function FamilySafetyPage() {
  const router = useRouter()
  const { user, status, authError, refreshIdentity } = useAuth()
  const [profile, setProfile] = useState<FamilyProfile | null>(null)
  const [checkIns, setCheckIns] = useState<SafetyCheckIn[]>([])
  const [safety, setSafety] = useState<FamilySafetyState | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [online, setOnline] = useState(true)
  const [savingGuardian, setSavingGuardian] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [sendingSos, setSendingSos] = useState(false)
  const [sosArmed, setSosArmed] = useState(false)
  const [sosConfirmed, setSosConfirmed] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const sosInProgress = useRef(false)
  const checkInProgress = useRef(false)

  const loadSafety = useCallback(async (active: () => boolean) => {
    setLoading(true)
    setLoadError('')
    const [profileResult, historyResult, safetyResult] = await Promise.allSettled([
      api.family.profile(),
      api.family.checkIns(),
      api.family.safetyState(),
    ])
    if (!active()) return

    if (profileResult.status === 'fulfilled') setProfile(profileResult.value)
    else if (!(profileResult.reason instanceof ApiError && profileResult.reason.status === 404)) {
      setLoadError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Unable to load guardian details.')
    }

    if (historyResult.status === 'fulfilled') setCheckIns(historyResult.value)
    else setLoadError(historyResult.reason instanceof Error ? historyResult.reason.message : 'Unable to load check-ins.')

    if (safetyResult.status === 'fulfilled') setSafety(safetyResult.value)
    else setLoadError(safetyResult.reason instanceof Error ? safetyResult.reason.message : 'Unable to load current safety status.')

    setLoading(false)
  }, [])

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    updateOnline()
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading' || status === 'error') return
    if (!user) {
      router.replace('/login?next=/profile/family')
      return
    }
    if (user.userType !== 'tenant') {
      router.replace('/profile')
      return
    }
    let mounted = true
    void loadSafety(() => mounted)
    return () => { mounted = false }
  }, [loadSafety, reloadVersion, router, status, user])

  function requireOnline() {
    if (online) return true
    setNotice('You appear to be offline. No safety update was sent. Reconnect and try again.')
    return false
  }

  async function saveGuardian(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requireOnline() || savingGuardian) return
    const data = new FormData(event.currentTarget)
    const name = String(data.get('guardianName') || '').trim()
    const relationship = String(data.get('relationship') || '').trim()
    const phone = normalizePhone(String(data.get('phone') || ''))
    const email = String(data.get('email') || '').trim()

    if (!name || !relationship || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      setNotice('Add a name, relationship, and valid phone number.')
      return
    }

    try {
      setSavingGuardian(true)
      setNotice('')
      const saved = await api.family.saveGuardian({ name, relationship, phone, email })
      setProfile(saved)
      setNotice('Guardian details saved securely.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save guardian details.')
    } finally {
      setSavingGuardian(false)
    }
  }

  async function sendCheckIn() {
    if (!requireOnline() || checkInProgress.current) return
    checkInProgress.current = true
    setCheckingIn(true)
    setNotice('')
    try {
      const checkIn = await api.family.checkIn()
      setCheckIns((current) => [checkIn, ...current.filter((item) => item.id !== checkIn.id)].slice(0, 50))
      setSafety((current) => ({
        latestCheckIn: checkIn,
        checkInState: 'checked_in',
        overdueAfterHours: current?.overdueAfterHours || 24,
        activeSos: current?.activeSos || null,
        sosState: current?.sosState || 'none',
      }))
      setNotice('Check-in recorded successfully.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save your check-in.')
    } finally {
      checkInProgress.current = false
      setCheckingIn(false)
    }
  }

  async function sendSos() {
    if (!requireOnline() || !sosConfirmed || sosInProgress.current || safety?.sosState === 'active') return
    sosInProgress.current = true
    setSendingSos(true)
    setNotice('')
    try {
      const result = await api.family.sos()
      setSafety((current) => ({
        latestCheckIn: current?.latestCheckIn || null,
        checkInState: current?.checkInState || 'not_started',
        overdueAfterHours: current?.overdueAfterHours || 24,
        activeSos: result.alert,
        sosState: 'active',
      }))
      setSosArmed(false)
      setSosConfirmed(false)
      setNotice(result.created ? 'SOS alert recorded. Your configured safety contacts can now act on it.' : 'An SOS alert is already active; no duplicate alert was created.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to activate the SOS alert.')
    } finally {
      sosInProgress.current = false
      setSendingSos(false)
    }
  }

  if (status === 'error') {
    return <main className="grid min-h-screen place-items-center bg-cream px-4 text-center"><div><p role="alert" className="text-sm font-semibold text-[#756960]">{authError}</p><button type="button" onClick={() => void refreshIdentity()} className="mt-4 rounded-full bg-peach px-4 py-2 text-sm font-bold">Try again</button></div></main>
  }

  if (status !== 'authenticated' || !user || user.userType !== 'tenant') {
    return <main className="grid min-h-screen place-items-center bg-cream"><p role="status" className="text-sm font-semibold text-[#756960]">Checking access...</p></main>
  }

  const checkInTitle = safety?.checkInState === 'checked_in' ? 'Checked in' : safety?.checkInState === 'overdue' ? 'Check-in overdue' : 'No check-in yet'
  const checkInDescription = safety?.latestCheckIn
    ? 'Latest check-in: ' + formatDateTime(safety.latestCheckIn.checkedInAt)
    : 'Record a check-in when you are safe.'
  const sosActive = safety?.sosState === 'active'

  return (
    <div className="min-h-screen bg-cream px-4 py-8 text-[#443A34] sm:px-6">
      <header className="mx-auto flex max-w-5xl items-center justify-between"><Link href="/" className="font-heading text-2xl font-semibold">Humdum</Link><Link href="/profile" className="rounded-full border border-[#DDD2C7] bg-white px-4 py-2 text-sm font-bold">Profile</Link></header>
      <main className="mx-auto mt-8 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-heading text-4xl text-[#40362F]">Family safety</h1><p className="mt-2 text-sm text-[#7A6E65]">Guardian details, check-ins, and the current SOS state for your account.</p></div><button type="button" onClick={() => setReloadVersion((value) => value + 1)} className="rounded-full border bg-white px-4 py-2 text-xs font-bold">Refresh</button></div>

        {!online && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"><WifiOff className="size-4" />You are offline. Existing information may be stale, and actions are disabled.</div>}
        {notice && <p role="status" className="mt-4 rounded-xl border bg-white px-4 py-3 text-sm">{notice}</p>}
        {loadError && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"><p>{loadError}</p><button type="button" onClick={() => setReloadVersion((value) => value + 1)} className="mt-3 rounded-full border border-red-300 px-4 py-2 text-xs font-bold">Try again</button></div>}
        {loading && <div className="mt-6 grid animate-pulse gap-4 sm:grid-cols-2"><div className="h-32 rounded-2xl bg-[#EFE6DE]" /><div className="h-32 rounded-2xl bg-[#EFE6DE]" /></div>}

        {!loading && <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className={'rounded-2xl border p-5 ' + (safety?.checkInState === 'overdue' ? 'border-amber-300 bg-amber-50' : 'border-[#E3D9CF] bg-white')}>
            <div className="flex items-start gap-3">{safety?.checkInState === 'checked_in' ? <CheckCircle2 className="size-6 text-[#77734E]" /> : <Clock3 className="size-6 text-terracotta" />}<div><p className="text-xs font-bold uppercase tracking-wide text-[#756960]">Check-in status</p><h2 className="mt-1 font-heading text-2xl">{checkInTitle}</h2><p className="mt-2 text-sm text-[#756960]">{checkInDescription}</p>{safety && <p className="mt-1 text-xs text-[#8A7D74]">Overdue after {safety.overdueAfterHours} hours.</p>}</div></div>
            <button type="button" onClick={() => void sendCheckIn()} disabled={!online || checkingIn} className="mt-4 rounded-full bg-peach-deep px-5 py-3 text-xs font-bold disabled:opacity-50">{checkingIn ? 'Saving check-in...' : 'Check in now'}</button>
          </section>

          <section className={'rounded-2xl border p-5 ' + (sosActive ? 'border-red-300 bg-red-50' : 'border-[#E3D9CF] bg-white')}>
            <div className="flex items-start gap-3"><ShieldAlert className={'size-6 ' + (sosActive ? 'text-red-700' : 'text-[#77734E]')} /><div><p className="text-xs font-bold uppercase tracking-wide text-[#756960]">SOS status</p><h2 className="mt-1 font-heading text-2xl">{sosActive ? 'SOS active' : 'No active alert'}</h2><p className="mt-2 text-sm text-[#756960]">{sosActive && safety?.activeSos ? 'Activated ' + formatDateTime(safety.activeSos.triggeredAt) + '. Status: ' + safety.activeSos.status + '.' : 'No triggered or acknowledged SOS alert is active.'}</p></div></div>
            {!sosActive && !sosArmed && <button type="button" onClick={() => { setSosArmed(true); setNotice('') }} disabled={!online || !profile} className="mt-4 inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-3 text-xs font-bold text-white disabled:opacity-50"><BellRing className="size-4" />Prepare SOS alert</button>}
            {!profile && <p className="mt-3 text-xs text-[#765532]">Save a guardian contact before activating SOS.</p>}
            {!sosActive && sosArmed && <div className="mt-4 rounded-xl border border-red-200 bg-white p-4"><p className="text-sm font-bold text-red-800">Confirm SOS activation</p><p className="mt-1 text-xs text-[#756960]">This records an active emergency alert on your Humdum account. It does not call emergency services.</p><label className="mt-3 flex items-start gap-2 text-xs font-semibold"><input type="checkbox" checked={sosConfirmed} onChange={(event) => setSosConfirmed(event.target.checked)} className="mt-0.5" />I understand and want to activate the SOS alert.</label><div className="mt-3 flex gap-2"><button type="button" disabled={!sosConfirmed || sendingSos || !online} onClick={() => void sendSos()} className="rounded-full bg-red-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{sendingSos ? <span className="inline-flex items-center gap-2"><LoaderCircle className="size-3 animate-spin" />Activating...</span> : 'Confirm SOS'}</button><button type="button" disabled={sendingSos} onClick={() => { setSosArmed(false); setSosConfirmed(false) }} className="rounded-full border px-4 py-2 text-xs font-bold">Cancel</button></div></div>}
          </section>
        </div>}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#E3D9CF] bg-white p-6 shadow-sm">
            <h2 className="font-heading text-2xl">Guardian contact</h2>
            {profile && <p className="mt-2 rounded-xl bg-sage/35 p-3 text-sm"><strong>{profile.emergencyContact.name}</strong> · {profile.emergencyContact.relationship}</p>}
            <form key={profile?.updatedAt || 'new'} onSubmit={saveGuardian} className="mt-4 space-y-3">
              <label className="block text-xs font-bold">Guardian name<input name="guardianName" required defaultValue={profile?.emergencyContact.name || ''} className={fieldClass} /></label>
              <label className="block text-xs font-bold">Relationship<input name="relationship" required defaultValue={profile?.emergencyContact.relationship || ''} className={fieldClass} /></label>
              <label className="block text-xs font-bold">Phone number<input name="phone" type="tel" required defaultValue={profile?.guardianPhones.primary || ''} placeholder="+923001234567" className={fieldClass} /></label>
              <label className="block text-xs font-bold">Email<input name="email" type="email" defaultValue={profile?.emergencyContact.email || ''} className={fieldClass} /></label>
              <button disabled={!online || savingGuardian} className="rounded-full bg-[#8F8A5D] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{savingGuardian ? 'Saving...' : 'Save guardian details'}</button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#E3D9CF] bg-white p-6 shadow-sm">
            <h2 className="font-heading text-2xl">Recent check-ins</h2><p className="mt-1 text-sm text-[#7A6E65]">Only your latest 50 recorded check-ins are shown.</p>
            <div className="mt-4 max-h-[420px] overflow-auto">
              {checkIns.map((checkIn) => <article key={checkIn.id} className="flex items-center justify-between gap-3 border-b py-3"><div><p className="text-sm font-semibold">{formatDateTime(checkIn.checkedInAt)}</p>{checkIn.guardianNotifiedAt && <p className="mt-1 text-xs text-[#756960]">Guardian notification recorded {formatDateTime(checkIn.guardianNotifiedAt)}</p>}</div><span className="rounded-full bg-[#F5ECE3] px-3 py-1 text-xs font-bold capitalize">{checkIn.status}</span></article>)}
              {checkIns.length === 0 && <p className="py-8 text-center text-sm text-[#7A6E65]">No check-ins recorded yet.</p>}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
