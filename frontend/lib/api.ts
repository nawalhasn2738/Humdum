import {
  getSupabaseClient,
  requestPasswordReset,
  signInWithSupabase,
  signUpWithSupabase,
} from '@/lib/supabase'
import { isValidListingId, listingSearchValidationError, type BackendComplianceStatus, type ListingSearchParams } from '@/lib/listing-contract'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export type BackendIdentity = {
  id: string
  profileId: string | null
  name: string | null
  email: string | null
  phone: string | null
  maskedPhone: string | null
  role: 'tenant' | 'landlord' | 'admin' | 'safety_inspector' | null
}

export type ListingDetail = {
  id: string
  landlordId: string
  title: string
  description: string | null
  rent: number
  deposit: number
  curfewRules: string | null
  capacity: number | null
  accommodationType: 'hostel' | 'room' | 'apartment' | 'house' | null
  contact: { email: string | null; phone: string | null }
  reportedSafetyFeatures: ReportedSafetyFeature[]
  location: { latitude: number; longitude: number } | null
  createdAt: string
  updatedAt: string
  distanceKm?: number
}

export type ReportedSafetyFeature = 'cctv' | 'guarded_entrance' | 'perimeter_lighting' | 'female_only'

export type CreateListingInput = {
  title: string
  description: string | null
  rent: number
  deposit: number
  curfewRules: string | null
  latitude: number
  longitude: number
  capacity: number
  accommodationType: 'hostel' | 'room' | 'apartment' | 'house'
  contactEmail: string
  contactPhone: string
  reportedSafetyFeatures: ReportedSafetyFeature[]
}
export type ListingSearch = {
  listings: ListingDetail[]
  meta: {
    center: { latitude: number; longitude: number }
    radiusKm: number
    count: number
  }
}

export type ListingCompliance = {
  listing: {
    id: string
    title: string
  }
  audit: null | {
    id: string
    listingId: string
    fireSafetyScore: number
    cctvVerified: boolean
    wardenVerified: boolean
    auditScore: number
    expiryDate: string
    createdAt: string
  }
  safetyStatus: BackendComplianceStatus
}
export type ListingSafety = {
  listing: {
    id: string
    title: string
    location: { latitude: number; longitude: number } | null
  }
  safetyIndex: number
  rating: 'unrated' | 'low' | 'moderate' | 'high'
  dataCompleteness: number
  components: {
    compliance: {
      score: number
      weight: number
      weightedScore: number
      currentAudit: boolean
      latestAuditScore: number | null
      expiryDate: string | null
    }
    tenantReviews: {
      score: number
      weight: number
      weightedScore: number
      averageRating: number | null
      verifiedReviewCount: number
      verificationRule: string
    }
    securityInfrastructure: {
      score: number
      weight: number
      weightedScore: number
      cctvVerified: boolean
      wardenVerified: boolean
    }
  }
  proximityRisk: {
    score: number | null
    available: boolean
    reason: string
  }
  calculatedAt: string
}
export type ManagedListing = ListingDetail & {
  moderationStatus: 'active' | 'under_review' | 'suspended'
  safetyScore: number | null
  bookings: number
}

export type EvidenceStatus = 'uploaded' | 'pending_review' | 'accepted' | 'rejected'

export type EvidenceDocument = {
  id: string
  documentType: 'listing_verification'
  subjectUserId: string | null
  listingId: string
  auditId: string | null
  originalFilename: string
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'
  sizeBytes: number
  status: EvidenceStatus
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string
}

export type UploadConfig = {
  acceptedMimeTypes: string[]
  maxUploadBytes: number
  landlordDocumentTypes: ['listing_verification']
}
export type AdminVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'expired'

export type AdminVerificationItem = {
  id: string
  title: string
  owner: { id: string; name: string; email: string }
  moderationStatus: 'active' | 'under_review' | 'suspended'
  verificationStatus: AdminVerificationStatus
  submittedAt: string
  audit: null | {
    id: string
    score: number
    expiryDate: string
    createdAt: string
  }
  evidence: Array<{
    id: string
    originalFilename: string
    mimeType: string
    sizeBytes: number
    status: EvidenceStatus
    rejectionReason: string | null
    reviewedAt: string | null
    createdAt: string
  }>
}

export type AdminVerificationQueue = {
  items: AdminVerificationItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
export type InquiryStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export type Inquiry = {
  id: string
  tenant: {
    id: string
    name: string
  }
  listing: {
    id: string
    title: string
  }
  status: InquiryStatus
  createdAt: string
  updatedAt: string
}
export type MessageContact = {
  id: string
  name: string
  role: string
  email: string | null
  phone: string | null
}

export type ConversationMessage = {
  id: string
  listingId: string
  sender: MessageContact
  receiver: MessageContact
  content: string
  isMasked: boolean
  contactStatus: 'verified' | 'preliminary'
  createdAt: string
}

export type ConversationThread = {
  id: string
  listing: { id: string; title: string }
  participant: MessageContact
  latestMessage: ConversationMessage
}

export type FamilyProfile = {
  id: string
  userId: string
  listingId: string | null
  emergencyContact: {
    name: string
    relationship: string
    email: string | null
  }
  guardianPhones: { primary: string; secondary: string | null }
  checkInPreferences: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type SafetyCheckIn = {
  id: string
  status: 'confirmed' | 'missed' | 'pending'
  checkedInAt: string
  guardianNotifiedAt: string | null
}

export type FamilySafetyState = {
  latestCheckIn: SafetyCheckIn | null
  checkInState: 'checked_in' | 'overdue' | 'not_started'
  overdueAfterHours: number
  activeSos: SosAlert | null
  sosState: 'active' | 'none'
}

export type SosAlert = {
  id: string
  status: 'triggered' | 'acknowledged' | 'resolved'
  triggeredAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) {
    throw new Error('Unable to read the active Supabase session: ' + error.message)
  }

  const headers = new Headers(options?.headers)
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  if (!headers.has('Content-Type') && options?.body && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    console.error('[Humdum API] request failed', {
      path,
      status: response.status,
      payload,
    })
    throw new ApiError(payload?.error || 'Request failed with status ' + response.status + '.', response.status, payload?.fields)
  }
  return response.json()
}

export const api = {
  listings: {
    list: (params: ListingSearchParams) => {
      const validationError = listingSearchValidationError(params)
      if (validationError) return Promise.reject(new ApiError(validationError, 400))

      const query = new URLSearchParams({
        latitude: String(params.latitude),
        longitude: String(params.longitude),
        radiusKm: String(params.radiusKm),
      })
      return request<ListingSearch>('/listings?' + query)
    },
    get: async (id: string) => {
      if (!isValidListingId(id)) throw new ApiError('A valid listing ID is required.', 400)
      const response = await request<{ listing: ListingDetail }>(`/listings/${encodeURIComponent(id)}`)
      return response.listing
    },
    safety: (id: string) => {
      if (!isValidListingId(id)) return Promise.reject(new ApiError('A valid listing ID is required.', 400))
      return request<ListingSafety>(`/listings/${encodeURIComponent(id)}/safety-score`)
    },
    compliance: (id: string) => {
      if (!isValidListingId(id)) return Promise.reject(new ApiError('A valid listing ID is required.', 400))
      return request<ListingCompliance>(`/listings/${encodeURIComponent(id)}/audit`)
    },
    create: async (data: CreateListingInput) => {
      const response = await request<{ listing: ListingDetail }>('/listings', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.listing
    },
    owned: async (id: string) => {
      if (!isValidListingId(id)) throw new ApiError('A valid listing ID is required.', 400)
      const response = await request<{ listing: ManagedListing }>(`/listings/mine/${encodeURIComponent(id)}`)
      return response.listing
    },
    update: async (id: string, data: CreateListingInput) => {
      if (!isValidListingId(id)) throw new ApiError('A valid listing ID is required.', 400)
      const response = await request<{ listing: ListingDetail }>(`/listings/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      return response.listing
    },
    deactivate: async (id: string) => {
      if (!isValidListingId(id)) throw new ApiError('A valid listing ID is required.', 400)
      const response = await request<{ listing: ListingDetail }>(`/listings/${encodeURIComponent(id)}/deactivate`, {
        method: 'POST',
      })
      return response.listing
    },
    mine: async () => {
      const response = await request<{ listings: ManagedListing[] }>('/listings/mine')
      return response.listings
    },
    evidenceConfig: () => request<UploadConfig>('/uploads/config'),
    evidence: async (listingId: string) => {
      if (!isValidListingId(listingId)) throw new ApiError('A valid listing ID is required.', 400)
      const response = await request<{ documents: EvidenceDocument[] }>(`/uploads/listing/${encodeURIComponent(listingId)}`)
      return response.documents
    },
    uploadVerification: async (listingId: string, file: File, onProgress?: (percent: number) => void) => {
      if (!isValidListingId(listingId)) throw new ApiError('A valid listing ID is required.', 400)
      const { data, error } = await getSupabaseClient().auth.getSession()
      if (error || !data.session?.access_token) throw new ApiError('An authenticated session is required.', 401)
      return new Promise<EvidenceDocument>((resolve, reject) => {
        const body = new FormData()
        body.set('file', file)
        body.set('documentType', 'listing_verification')
        body.set('listingId', listingId)
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_URL}/uploads/document`)
        xhr.setRequestHeader('Authorization', `Bearer ${data.session.access_token}`)
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
        }
        xhr.onerror = () => reject(new ApiError('Unable to reach the upload service.', 0))
        xhr.onload = () => {
          const payload = (() => { try { return JSON.parse(xhr.responseText) } catch { return null } })()
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new ApiError(payload?.error || `Upload failed with status ${xhr.status}.`, xhr.status, payload?.fields))
            return
          }
          resolve(payload.document as EvidenceDocument)
        }
        xhr.send(body)
      })
    },
    downloadEvidence: async (documentId: string) => {
      const { data, error } = await getSupabaseClient().auth.getSession()
      if (error || !data.session?.access_token) throw new ApiError('An authenticated session is required.', 401)
      const response = await fetch(`${API_URL}/uploads/document/${encodeURIComponent(documentId)}`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new ApiError(payload?.error || 'Unable to retrieve evidence.', response.status)
      }
      return response.blob()
    },
  },
  inquiries: {
    create: async (listingId: string) => {
      if (!isValidListingId(listingId)) throw new ApiError('A valid listing ID is required.', 400)
      const response = await request<{ inquiry: Inquiry }>('/inquiries', {
        method: 'POST',
        body: JSON.stringify({ listingId }),
      })
      return response.inquiry
    },
    mine: async () => {
      const response = await request<{ inquiries: Inquiry[] }>('/inquiries/mine')
      return response.inquiries
    },
    landlord: async () => {
      const response = await request<{ inquiries: Inquiry[] }>('/inquiries/landlord')
      return response.inquiries
    },
    updateStatus: async (id: string, status: Exclude<InquiryStatus, 'pending'>) => {
      const response = await request<{ inquiry: Inquiry }>(`/inquiries/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      return response.inquiry
    },
  },  auth: {
    resetPassword: (email: string) => requestPasswordReset(email),
    registerProfile: (data: {
      name: string
      email: string
      role: 'tenant' | 'landlord'
      phone: string
    }) => request<{ user: BackendIdentity }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    identity: () => request<{ user: BackendIdentity }>('/protected'),
  },
  messages: {
    threads: async () => {
      const response = await request<{ threads: ConversationThread[] }>('/messages')
      return response.threads
    },
    conversation: (listingId: string, participantId: string) => {
      const query = new URLSearchParams({ participantId })
      return request<{
        listing: { id: string; title: string }
        messages: ConversationMessage[]
      }>(`/messages/${listingId}?${query}`)
    },
    send: (data: { listingId: string; receiverId: string; content: string }) =>
      request<{ message: ConversationMessage }>('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  admin: {
    verifications: (status: AdminVerificationStatus, page = 1, limit = 20) => {
      const query = new URLSearchParams({ status, page: String(page), limit: String(limit) })
      return request<AdminVerificationQueue>(`/admin/verifications?${query}`)
    },
    decideVerification: (listingId: string, decision: 'approve' | 'reject' | 'suspend', reason?: string) =>
      request<{
        listing: { id: string; title: string; moderationStatus: 'active' | 'suspended'; updatedAt: string }
        decision: 'approve' | 'reject' | 'suspend'
        reason: string | null
        decidedAt: string
      }>(`/admin/verifications/${encodeURIComponent(listingId)}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason }),
      }),
  },  family: {
    profile: async () => {
      const response = await request<{ profile: FamilyProfile }>('/family-profiles/me')
      return response.profile
    },
    saveGuardian: async (data: {
      name: string
      relationship: string
      phone: string
      email?: string
    }) => {
      const response = await request<{ profile: FamilyProfile }>('/family-profiles', {
        method: 'POST',
        body: JSON.stringify({
          emergencyContact: {
            name: data.name,
            relationship: data.relationship,
            email: data.email || null,
          },
          guardianPhones: { primary: data.phone },
          checkInPreferences: { enabled: true },
        }),
      })
      return response.profile
    },
    safetyState: async () => {
      const response = await request<{ safety: FamilySafetyState }>('/family-profiles/safety-state')
      return response.safety
    },
    checkIns: async () => {
      const response = await request<{ checkIns: SafetyCheckIn[] }>('/family-profiles/check-ins')
      return response.checkIns
    },
    checkIn: async () => {
      const response = await request<{ checkIn: SafetyCheckIn }>('/family-profiles/check-ins', {
        method: 'POST',
      })
      return response.checkIn
    },
    sos: async () => {
      const response = await request<{ alert: SosAlert; created: boolean }>('/family-profiles/sos', {
        method: 'POST',
      })
      return response
    },
  },
}

export const isLiveApiConfigured = Boolean(process.env.NEXT_PUBLIC_API_URL)
