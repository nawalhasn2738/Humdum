const DEFAULT_API_URL = 'http://localhost:5000/api';

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export interface ApiUser {
  id: string
  name: string
  email: string
  role: 'tenant' | 'landlord' | 'admin' | 'safety_inspector' | string
  phone?: string
  maskedPhone?: string
  createdAt?: string
}

export interface ApiListing {
  id: string
  landlordId: string
  title: string
  description: string | null
  rent: number
  deposit: number
  curfewRules: string | null
  location: { latitude: number; longitude: number } | null
  distanceKm?: number
  createdAt: string
}

export interface SafetyScore {
  listingId?: string
  score?: number
  rating?: string
  components?: Record<string, number>
  confidence?: number
}

function apiBase() {
  const raw = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
  return raw.replace(/\/$/, '')
}

function getStoredToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem('humdum.accessToken')
}

export function storeAccessToken(token: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (token) {
    window.localStorage.setItem('humdum.accessToken', token)
    return
  }

  window.localStorage.removeItem('humdum.accessToken')
}

export async function apiRequest<T>(
  path: string,
  {
    method = 'GET',
    body,
    token,
    auth = false,
  }: {
    method?: string
    body?: unknown
    token?: string | null
    auth?: boolean
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const accessToken = token ?? (auth ? getStoredToken() : null)
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()
  let payload: unknown = null

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: string }).error)
        : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

export function registerUser(input: {
  name: string
  email: string
  role: 'tenant' | 'landlord'
  phone: string
}) {
  return apiRequest<{ user: ApiUser; nextStep?: string }>('/auth/register', {
    method: 'POST',
    body: input,
  })
}

export function loginUser(input: { email?: string; phone?: string }) {
  return apiRequest<{ accessToken: string; user: ApiUser; message?: string }>('/auth/login', {
    method: 'POST',
    body: input,
  })
}

export function requestPhoneOtp(phone: string) {
  return apiRequest<{ message: string }>('/auth/phone/request-otp', {
    method: 'POST',
    body: { phone },
  })
}

export function verifyPhoneOtp(phone: string, token: string) {
  return apiRequest<{
    accessToken: string
    refreshToken?: string
    user: { id: string; phone?: string }
  }>('/auth/phone/verify-otp', {
    method: 'POST',
    body: { phone, token },
  })
}

export function getCurrentUser() {
  return apiRequest<{ user: ApiUser }>('/auth/me', { auth: true })
}

export function getListings(params?: {
  latitude?: number
  longitude?: number
  radiusKm?: number
}) {
  const search = new URLSearchParams()

  if (params?.latitude !== undefined && params?.longitude !== undefined) {
    search.set('latitude', String(params.latitude))
    search.set('longitude', String(params.longitude))
    if (params.radiusKm) {
      search.set('radiusKm', String(params.radiusKm))
    }
  }

  const query = search.toString()
  return apiRequest<{ listings: ApiListing[]; meta?: { count: number; radiusKm?: number } }>(
    `/listings${query ? `?${query}` : ''}`
  )
}

export function getListingById(id: string) {
  return apiRequest<{ listing: ApiListing }>(`/listings/${id}`)
}

export function createListing(input: {
  title: string
  description?: string
  rent: number
  deposit?: number
  curfewRules?: string
  latitude: number
  longitude: number
}) {
  return apiRequest<{ listing: ApiListing }>('/listings', {
    method: 'POST',
    auth: true,
    body: input,
  })
}

export function getListingSafetyScore(id: string) {
  return apiRequest<SafetyScore>(`/listings/${id}/safety-score`)
}

export function getListingAudit(id: string) {
  return apiRequest<{
    listing?: unknown
    audit: {
      id: string
      fireSafetyScore: number
      cctvVerified: boolean
      wardenVerified: boolean
      auditScore: number
      expiryDate: string
    } | null
    safetyStatus: string
  }>(`/listings/${id}/audit`)
}

export function sendListingMessage(input: {
  listingId: string
  receiverId: string
  content: string
}) {
  return apiRequest('/messages', {
    method: 'POST',
    auth: true,
    body: input,
  })
}

export function getListingMessages(listingId: string) {
  return apiRequest(`/messages/${listingId}`, { auth: true })
}

export function bookTenancy(input: {
  listingId: string
  startDate: string
  endDate?: string
}) {
  return apiRequest('/tenancies', {
    method: 'POST',
    auth: true,
    body: input,
  })
}

export function saveFamilyProfile(input: {
  listingId?: string
  emergencyContact: { name: string; relationship: string }
  guardianPhones: { primary: string; secondary?: string }
  checkInPreferences?: Record<string, unknown>
}) {
  return apiRequest('/family-profiles', {
    method: 'POST',
    auth: true,
    body: input,
  })
}

export function getAnomalies() {
  return apiRequest('/admin/anomalies', { auth: true })
}

export function getAuditLogs(listingId: string) {
  return apiRequest(`/audit-logs/${listingId}`, { auth: true })
}
