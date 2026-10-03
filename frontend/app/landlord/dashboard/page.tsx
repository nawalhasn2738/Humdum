'use client'

import { FormEvent, useCallback, useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import Link from 'next/link'
import { Brand } from '@/components/brand'
import { InquiryStatusBadge } from '@/components/inquiry-status'
import { useAuth } from '@/lib/auth-context'
import {
  api,
  ApiError,
  type CreateListingInput,
  type EvidenceDocument,
  type Inquiry,
  type InquiryStatus,
  type ManagedListing,
  type ReportedSafetyFeature,
} from '@/lib/api'
import { attachVerificationStatus, type DashboardListing } from '@/lib/landlord-dashboard'
import { validateListingForm, type ListingFormValues } from '@/lib/listing-management'
import { validateEvidenceFile } from '@/lib/evidence-upload'
import { LayoutDashboard, MessageCircle, ShieldCheck } from 'lucide-react'

const fieldClass = 'mt-1.5 h-10 w-full rounded-xl border border-[#DDD2C7] bg-[#F6EDE4] px-3 text-sm outline-none focus:border-terracotta focus:bg-white focus:ring-3 focus:ring-blush/40'
const moderationLabels: Record<ManagedListing['moderationStatus'], string> = { active: 'Active', under_review: 'Under review', suspended: 'Deactivated' }
const moderationStyles: Record<ManagedListing['moderationStatus'], string> = { active: 'bg-sage/65 text-[#4D4932]', under_review: 'bg-peach/65 text-[#765532]', suspended: 'bg-[#E8E1DA] text-[#6D625A]' }
const verificationLabels: Record<DashboardListing['verificationStatus'], string> = { verified: 'Verified', conditional: 'Conditional', pending_verification: 'Pending verification', needs_attention: 'Needs attention', expired: 'Expired', not_audited: 'Not audited', error: 'Unavailable' }
const safetyOptions: { value: ReportedSafetyFeature; label: string }[] = [
  { value: 'cctv', label: 'CCTV present' },
  { value: 'guarded_entrance', label: 'Guarded entrance' },
  { value: 'perimeter_lighting', label: 'Perimeter lighting' },
  { value: 'female_only', label: 'Female-only accommodation' },
]

export default function LandlordDashboardPage() {
  const { user, status } = useAuth()
  const [listings, setListings] = useState<DashboardListing[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [inquiriesLoading, setInquiriesLoading] = useState(true)
  const [listingsError, setListingsError] = useState('')
  const [inquiriesError, setInquiriesError] = useState('')
  const [creationMessage, setCreationMessage] = useState('')
  const [creationFields, setCreationFields] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<DashboardListing | null>(null)
  const [editMessage, setEditMessage] = useState('')
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [savingListingId, setSavingListingId] = useState<string | null>(null)
  const [updatingInquiryId, setUpdatingInquiryId] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const listingMutationInProgress = useRef(false)

  const loadListings = useCallback(async (active: () => boolean) => {
    setListingsLoading(true)
    setListingsError('')
    try {
      const owned = await api.listings.mine()
      const enriched = await attachVerificationStatus(owned, async (id) => (await api.listings.compliance(id)).safetyStatus)
      if (active()) setListings(enriched)
    } catch (error) {
      if (active()) {
        setListings([])
        setListingsError(error instanceof Error ? error.message : 'Unable to load your listings.')
      }
    } finally {
      if (active()) setListingsLoading(false)
    }
  }, [])

  const loadInquiries = useCallback(async (active: () => boolean) => {
    setInquiriesLoading(true)
    setInquiriesError('')
    try {
      const result = await api.inquiries.landlord()
      if (active()) setInquiries(result)
    } catch (error) {
      if (active()) {
        setInquiries([])
        setInquiriesError(error instanceof Error ? error.message : 'Unable to load inquiries.')
      }
    } finally {
      if (active()) setInquiriesLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    if (status !== 'authenticated' || user?.userType !== 'landlord') return () => { mounted = false }
    const active = () => mounted
    void loadListings(active)
    void loadInquiries(active)
    return () => { mounted = false }
  }, [loadInquiries, loadListings, reloadVersion, status, user])

  async function createListing(payload: CreateListingInput, form: HTMLFormElement) {
    if (listingMutationInProgress.current) return
    listingMutationInProgress.current = true
    setCreating(true)
    setCreationMessage('')
    setCreationFields({})
    try {
      await api.listings.create(payload)
      form.reset()
      setCreationMessage('Listing saved and submitted for moderation.')
      setReloadVersion((value) => value + 1)
    } catch (error) {
      setCreationMessage(error instanceof Error ? error.message : 'Unable to create listing.')
      if (error instanceof ApiError && error.fields) setCreationFields(error.fields)
    } finally {
      listingMutationInProgress.current = false
      setCreating(false)
    }
  }

  async function saveListing(payload: CreateListingInput) {
    if (!editing || listingMutationInProgress.current) return
    listingMutationInProgress.current = true
    setSavingListingId(editing.id)
    setEditMessage('')
    setEditFields({})
    try {
      await api.listings.update(editing.id, payload)
      setEditing(null)
      setEditMessage('')
      setReloadVersion((value) => value + 1)
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : 'Unable to save listing.')
      if (error instanceof ApiError && error.fields) setEditFields(error.fields)
    } finally {
      listingMutationInProgress.current = false
      setSavingListingId(null)
    }
  }

  async function deactivateListing(listing: DashboardListing) {
    if (listingMutationInProgress.current || !window.confirm('Deactivate ' + listing.title + '? It will be removed from public search.')) return
    listingMutationInProgress.current = true
    setSavingListingId(listing.id)
    setListingsError('')
    try {
      await api.listings.deactivate(listing.id)
      setEditing(null)
      setReloadVersion((value) => value + 1)
    } catch (error) {
      setListingsError(error instanceof Error ? error.message : 'Unable to deactivate listing.')
    } finally {
      listingMutationInProgress.current = false
      setSavingListingId(null)
    }
  }

  async function decideInquiry(id: string, nextStatus: Extract<InquiryStatus, 'accepted' | 'rejected'>) {
    if (updatingInquiryId) return
    setUpdatingInquiryId(id)
    setInquiriesError('')
    try {
      const updated = await api.inquiries.updateStatus(id, nextStatus)
      setInquiries((current) => current.map((item) => item.id === id ? updated : item))
    } catch (error) {
      setInquiriesError(error instanceof Error ? error.message : 'Unable to update inquiry.')
    } finally {
      setUpdatingInquiryId(null)
    }
  }

  if (status !== 'authenticated' || !user || user.userType !== 'landlord') {
    return <main className="grid min-h-screen place-items-center bg-cream"><p role="status" className="text-sm font-semibold text-[#756960]">Verifying landlord access...</p></main>
  }

  const pendingInquiryCount = inquiries.filter((item) => item.status === 'pending').length

  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="sticky top-0 z-30 border-b border-[#E5DBD1] bg-cream/95 backdrop-blur"><div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6"><Brand /><div className="ml-auto flex items-center gap-2"><span className="hidden rounded-full border border-[#DDD2C7] bg-[#F5ECE3] px-3 py-1 text-xs font-bold sm:inline">Landlord</span><span className="grid size-9 place-items-center rounded-full bg-peach font-heading text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span></div></div></header>
      <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-[#E5DBD1] px-4 py-3 lg:border-b-0 lg:border-r lg:py-6"><nav className="flex gap-2 overflow-x-auto lg:flex-col"><Link href="/landlord/dashboard" className="flex min-h-11 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold"><LayoutDashboard className="size-4" />Dashboard</Link><Link href="/messages" className="flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold"><MessageCircle className="size-4" />Messages</Link></nav></aside>
        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1080px]">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-heading text-3xl sm:text-4xl">Landlord dashboard</h1><p className="mt-2 text-sm text-[#7A6E65]">Manage your listings and tenant inquiries.</p></div><button type="button" onClick={() => setReloadVersion((value) => value + 1)} className="rounded-full border bg-white px-4 py-2 text-xs font-bold">Refresh</button></div>

          <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between"><h2 className="font-heading text-xl">Tenant inquiries</h2><span className="rounded-full bg-sage/45 px-3 py-1 text-xs font-bold">{pendingInquiryCount} pending</span></div>
            {inquiriesLoading && <Skeleton rows={2} />}
            {inquiriesError && <ErrorState message={inquiriesError} onRetry={() => setReloadVersion((value) => value + 1)} />}
            {!inquiriesLoading && !inquiriesError && inquiries.length === 0 && <p className="mt-4 text-sm text-[#756960]">No tenant inquiries yet.</p>}
            {!inquiriesLoading && !inquiriesError && inquiries.map((inquiry) => <article key={inquiry.id} className="mt-3 rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{inquiry.tenant.name}</p><p className="text-xs text-[#756960]">{inquiry.listing.title} · {formatDate(inquiry.createdAt)}</p></div><InquiryStatusBadge status={inquiry.status} /></div>{inquiry.status === 'pending' && <div className="mt-3 flex gap-2"><button disabled={Boolean(updatingInquiryId)} onClick={() => void decideInquiry(inquiry.id, 'accepted')} className="rounded-full bg-sage/55 px-4 py-2 text-xs font-bold disabled:opacity-60">Accept</button><button disabled={Boolean(updatingInquiryId)} onClick={() => void decideInquiry(inquiry.id, 'rejected')} className="rounded-full bg-blush px-4 py-2 text-xs font-bold disabled:opacity-60">Reject</button></div>}</article>)}
          </section>

          <section className="mt-7 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"><h2 className="font-heading text-xl">Create listing</h2><ListingForm key={reloadVersion} defaultContact={{ email: user.email, phone: user.phone || '' }} busy={creating} serverFields={creationFields} message={creationMessage} submitLabel="Create listing" onSubmit={createListing} /></section>

          <section className="mt-7 pb-12">
            <div className="flex items-center justify-between"><h2 className="font-heading text-2xl">Your listings</h2><span className="rounded-full bg-sage/45 px-3 py-1 text-xs font-bold">{listings.length}</span></div>
            {listingsLoading && <Skeleton rows={3} />}
            {listingsError && <ErrorState message={listingsError} onRetry={() => setReloadVersion((value) => value + 1)} />}
            {!listingsLoading && !listingsError && listings.length === 0 && <div className="mt-3 rounded-2xl border bg-white p-10 text-center"><ShieldCheck className="mx-auto size-7 text-terracotta" /><p className="mt-3 text-sm text-[#756960]">You have not created any listings yet.</p></div>}
            {!listingsLoading && !listingsError && listings.length > 0 && <div className="mt-3 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[880px] text-left text-xs"><thead><tr className="border-b"><th className="px-4 py-3">Title</th><th className="px-4 py-3">Type / capacity</th><th className="px-4 py-3">Rent</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y">{listings.map((listing) => <tr key={listing.id}><td className="px-4 py-4 font-semibold">{listing.title}</td><td className="px-4 py-4 capitalize">{listing.accommodationType || 'Incomplete'} · {listing.capacity ?? '—'}</td><td className="px-4 py-4">PKR {listing.rent.toLocaleString('en-PK')}</td><td className="px-4 py-4"><span className={'rounded-full px-2.5 py-1 font-bold ' + moderationStyles[listing.moderationStatus]}>{moderationLabels[listing.moderationStatus]}</span></td><td className="px-4 py-4">{verificationLabels[listing.verificationStatus]}{listing.verificationStatus === 'verified' && listing.safetyScore !== null && ` · ${listing.safetyScore}`}</td><td className="px-4 py-4"><div className="flex gap-2"><button type="button" onClick={() => { setEditing(listing); setEditMessage(''); setEditFields({}) }} className="rounded-full bg-[#F5ECE3] px-3 py-2 font-bold">View / edit</button>{listing.moderationStatus !== 'suspended' && <button type="button" disabled={savingListingId === listing.id} onClick={() => void deactivateListing(listing)} className="rounded-full bg-blush px-3 py-2 font-bold disabled:opacity-60">Deactivate</button>}</div></td></tr>)}</tbody></table></div>}
          </section>

          {editing && <section className="mb-12 rounded-2xl border border-terracotta/40 bg-white p-5 shadow-sm sm:p-6"><div className="flex justify-between gap-3"><div><h2 className="font-heading text-xl">View or edit listing</h2><p className="mt-1 text-xs text-[#756960]">Saving material changes returns the listing to moderation and requires current verification.</p></div><button type="button" onClick={() => setEditing(null)} className="text-sm font-bold">Close</button></div><ListingForm key={editing.id} listing={editing} busy={savingListingId === editing.id} serverFields={editFields} message={editMessage} submitLabel="Save changes" onSubmit={(payload) => saveListing(payload)} /><EvidencePanel listingId={editing.id} /></section>}
        </div></main>
      </div>
    </div>
  )
}

function EvidencePanel({ listingId }: { listingId: string }) {
  const defaultRules = { acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'], maxUploadBytes: 10 * 1024 * 1024 }
  const [rules, setRules] = useState(defaultRules)
  const [documents, setDocuments] = useState<EvidenceDocument[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const uploadInProgress = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadEvidence = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const [config, existing] = await Promise.all([api.listings.evidenceConfig(), api.listings.evidence(listingId)])
      setRules({ acceptedMimeTypes: config.acceptedMimeTypes, maxUploadBytes: config.maxUploadBytes })
      setDocuments(existing)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load listing evidence.')
    } finally {
      setLoading(false)
    }
  }, [listingId])

  useEffect(() => { void loadEvidence() }, [loadEvidence])

  async function uploadEvidence() {
    if (uploadInProgress.current) return
    const validationError = validateEvidenceFile(selectedFile, rules)
    if (validationError || !selectedFile) {
      setMessage(validationError || 'Choose a file.')
      return
    }
    uploadInProgress.current = true
    setUploading(true)
    setProgress(0)
    setMessage('')
    try {
      const document = await api.listings.uploadVerification(listingId, selectedFile, setProgress)
      setDocuments((current) => [document, ...current])
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
      setProgress(100)
      setMessage('Evidence uploaded successfully and is pending review.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload evidence.')
    } finally {
      uploadInProgress.current = false
      setUploading(false)
    }
  }

  async function download(document: EvidenceDocument) {
    if (downloadingId) return
    setDownloadingId(document.id)
    setMessage('')
    try {
      const blob = await api.listings.downloadEvidence(document.id)
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = document.originalFilename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to retrieve evidence.')
    } finally {
      setDownloadingId(null)
    }
  }

  const statusLabels: Record<EvidenceDocument['status'], string> = {
    uploaded: 'Uploaded',
    pending_review: 'Pending review',
    accepted: 'Accepted',
    rejected: 'Rejected',
  }

  return <div className="mt-8 border-t border-[#E5DBD1] pt-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-heading text-lg">Verification evidence</h3><p className="mt-1 text-xs text-[#756960]">Upload listing evidence as PDF, JPG, or PNG. Files remain private and are reviewed by authorized staff.</p></div><span className="rounded-full bg-[#F5ECE3] px-3 py-1 text-xs font-bold">Max {Math.round(rules.maxUploadBytes / 1024 / 1024)} MB</span></div>
    <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-[#FCF9F6] p-4 sm:flex-row sm:items-end">
      <label className="min-w-0 flex-1 text-xs font-bold">Evidence file<input ref={inputRef} type="file" accept={rules.acceptedMimeTypes.join(',')} disabled={uploading} onChange={(event) => { setSelectedFile(event.target.files?.[0] || null); setMessage('') }} className="mt-2 block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-peach file:px-4 file:py-2 file:font-bold" /></label>
      <button type="button" disabled={uploading || !selectedFile} onClick={() => void uploadEvidence()} className="min-h-10 rounded-full bg-terracotta px-5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload evidence'}</button>
    </div>
    {uploading && <div className="mt-3"><div className="h-2 overflow-hidden rounded-full bg-[#E8E1DA]" role="progressbar" aria-label="Evidence upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full bg-terracotta transition-all" style={{ width: progress + '%' }} /></div><p className="mt-1 text-xs text-[#756960]">{progress}% uploaded</p></div>}
    {message && <p role="status" className="mt-3 text-xs font-semibold text-[#765532]">{message}</p>}
    {loading && <Skeleton rows={2} />}
    {!loading && documents.length === 0 && <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-[#756960]">No verification evidence uploaded for this listing.</p>}
    {!loading && documents.length > 0 && <div className="mt-4 space-y-2">{documents.map((document) => <article key={document.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{document.originalFilename}</p><p className="mt-1 text-xs text-[#756960]">{formatFileSize(document.sizeBytes)} · {formatDate(document.createdAt)}</p></div><span className="rounded-full bg-[#F5ECE3] px-3 py-1 text-xs font-bold">{statusLabels[document.status]}</span></div>{document.status === 'rejected' && document.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700"><strong>Rejection reason:</strong> {document.rejectionReason}</p>}<button type="button" disabled={Boolean(downloadingId)} onClick={() => void download(document)} className="mt-3 rounded-full border px-3 py-2 text-xs font-bold disabled:opacity-50">{downloadingId === document.id ? 'Downloading...' : 'Download securely'}</button></article>)}</div>}
  </div>
}
function ListingForm({ listing, defaultContact, busy, serverFields, message, submitLabel, onSubmit }: {
  listing?: DashboardListing
  defaultContact?: { email: string; phone: string }
  busy: boolean
  serverFields: Record<string, string>
  message: string
  submitLabel: string
  onSubmit: (payload: CreateListingInput, form: HTMLFormElement) => void | Promise<void>
}) {
  const [localFields, setLocalFields] = useState<Record<string, string>>({})
  const errors = { ...serverFields, ...localFields }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const data = new FormData(form)
    const values: ListingFormValues = {
      title: String(data.get('title') || ''), description: String(data.get('description') || ''), rent: String(data.get('rent') || ''), deposit: String(data.get('deposit') || ''), curfewRules: String(data.get('curfewRules') || ''), latitude: String(data.get('latitude') || ''), longitude: String(data.get('longitude') || ''), capacity: String(data.get('capacity') || ''), accommodationType: String(data.get('accommodationType') || ''), contactEmail: String(data.get('contactEmail') || ''), contactPhone: String(data.get('contactPhone') || ''), reportedSafetyFeatures: data.getAll('reportedSafetyFeatures') as ReportedSafetyFeature[],
    }
    const result = validateListingForm(values)
    setLocalFields(result.fields)
    if (result.payload) void onSubmit(result.payload, form)
  }

  return <form onSubmit={submit} className="mt-4" noValidate><div className="grid gap-3 sm:grid-cols-2">
    <FormField label="Title" name="title" defaultValue={listing?.title || ''} error={errors.title} />
    <FormField label="Monthly rent (PKR)" name="rent" type="number" min="0" defaultValue={listing?.rent ?? ''} error={errors.rent} />
    <FormField label="Deposit (PKR)" name="deposit" type="number" min="0" defaultValue={listing?.deposit ?? 0} error={errors.deposit} />
    <FormField label="Capacity" name="capacity" type="number" min="1" max="100" defaultValue={listing?.capacity ?? ''} error={errors.capacity} />
    <label className="block text-xs font-bold">Accommodation type<select name="accommodationType" defaultValue={listing?.accommodationType || ''} className={fieldClass}><option value="">Select type</option><option value="hostel">Hostel</option><option value="room">Room</option><option value="apartment">Apartment</option><option value="house">House</option></select><FieldError message={errors.accommodationType} /></label>
    <FormField label="Curfew rules" name="curfewRules" defaultValue={listing?.curfewRules || ''} error={errors.curfewRules} />
    <FormField label="Latitude" name="latitude" type="number" step="any" defaultValue={listing?.location?.latitude ?? ''} error={errors.latitude} />
    <FormField label="Longitude" name="longitude" type="number" step="any" defaultValue={listing?.location?.longitude ?? ''} error={errors.longitude} />
    <FormField label="Contact email" name="contactEmail" type="email" defaultValue={listing?.contact.email || defaultContact?.email || ''} error={errors.contactEmail} />
    <FormField label="Contact phone" name="contactPhone" type="tel" defaultValue={listing?.contact.phone || defaultContact?.phone || ''} error={errors.contactPhone} />
    <label className="block text-xs font-bold sm:col-span-2">Description<textarea name="description" defaultValue={listing?.description || ''} rows={3} className={fieldClass + ' h-auto py-3'} /><FieldError message={errors.description} /></label>
    <fieldset className="sm:col-span-2"><legend className="text-xs font-bold">Self-reported safety features <span className="font-normal text-[#756960]">(not verified)</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{safetyOptions.map((option) => <label key={option.value} className="flex gap-2 text-xs"><input type="checkbox" name="reportedSafetyFeatures" value={option.value} defaultChecked={listing?.reportedSafetyFeatures.includes(option.value)} />{option.label}</label>)}</div><FieldError message={errors.reportedSafetyFeatures} /></fieldset>
  </div><div className="mt-5 flex flex-wrap items-center gap-3"><button type="submit" disabled={busy} className="min-h-11 rounded-full bg-gradient-to-r from-peach to-peach-deep px-6 text-sm font-bold disabled:cursor-wait disabled:opacity-60">{busy ? 'Saving...' : submitLabel}</button>{message && <p role="alert" className="text-xs font-semibold text-[#765532]">{message}</p>}</div></form>
}

function FormField({ label, error, ...props }: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) { return <label className="block text-xs font-bold">{label}<input {...props} className={fieldClass} aria-invalid={Boolean(error)} /><FieldError message={error} /></label> }
function FieldError({ message }: { message?: string }) { return message ? <span className="mt-1 block text-[11px] font-semibold text-red-700">{message}</span> : null }
function Skeleton({ rows }: { rows: number }) { return <div className="mt-4 space-y-2 animate-pulse">{Array.from({ length: rows }, (_, index) => <div key={index} className="h-16 rounded-xl bg-[#F3ECE5]" />)}</div> }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"><p>{message}</p><button type="button" onClick={onRetry} className="mt-3 rounded-full border border-red-300 px-4 py-2 text-xs font-bold">Try again</button></div> }
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB' }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(date) }