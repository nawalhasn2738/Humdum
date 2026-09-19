const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'humdum.accessToken'
const SESSION_KEY = 'humdum-session'

export type Listing = {
  id: string
  name: string
  area: string
  price: number
  metro: string
  distance: string
  image: string
  verified: boolean
  womenOnly: boolean
  features: string[]
  type: string
}

type BackendListing = {
  id: string | number
  title?: string
  name?: string
  description?: string | null
  rent?: number
  price?: number
  curfewRules?: string | null
  distanceKm?: number
}

type AuthUser = {
  id?: string
  name: string
  email: string
  role?: string
  phone?: string
}

export const mockListings: Listing[] = [
  { id: '1', name: 'Noor Women Residence', area: 'G-11 Markaz, Islamabad', price: 28500, metro: 'Khayaban-e-Johar', distance: '650 m', image: '/humdum-residence.png', verified: true, womenOnly: true, features: ['CCTV', '24/7 guard', 'Emergency exit'], type: 'Private room' },
  { id: '2', name: 'Safa House', area: 'I-8/2, Islamabad', price: 22000, metro: 'I-8 Station', distance: '1.2 km', image: '/humdum-residence.png', verified: true, womenOnly: true, features: ['CCTV', 'Backup power'], type: 'Shared room' },
  { id: '3', name: 'The Olive Residency', area: 'Bahria Town, Rawalpindi', price: 35000, metro: 'Koral Chowk', distance: '900 m', image: '/humdum-residence.png', verified: true, womenOnly: false, features: ['CCTV', 'Warden onsite'], type: 'Private room' },
  { id: '4', name: 'Ayesha Apartments', area: 'F-8, Islamabad', price: 42000, metro: 'PIMS Station', distance: '450 m', image: '/humdum-residence.png', verified: true, womenOnly: true, features: ['CCTV', 'Emergency exit', 'Guard'], type: 'Studio' },
]

const AREA_HINTS = ['H-11', 'G-11', 'G-6', 'F-7', 'F-8', 'F-10', 'G-9', 'I-8', 'Blue Area', 'Bahria', 'Gulberg', 'Aabpara', 'Rawalpindi', 'Islamabad']

function getToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

function setToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token)
    window.localStorage.setItem(SESSION_KEY, 'active')
    return
  }
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(SESSION_KEY)
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'The Humdum service is taking a moment. Please try again.')
  }
  return payload as T
}

function inferArea(listing: BackendListing) {
  const haystack = `${listing.title || listing.name || ''} ${listing.description || ''}`.toLowerCase()
  return AREA_HINTS.find((area) => haystack.includes(area.toLowerCase())) || 'Islamabad / Rawalpindi'
}

function mapListing(listing: BackendListing): Listing {
  const id = String(listing.id)
  const distanceKm = listing.distanceKm
  return {
    id,
    name: listing.name || listing.title || 'Humdum listing',
    area: inferArea(listing),
    price: Number(listing.rent ?? listing.price ?? 0),
    metro: 'Metro Bus',
    distance: distanceKm != null ? `${distanceKm.toFixed(1)} km` : 'Nearby',
    image: '/humdum-residence.png',
    verified: true,
    womenOnly: true,
    features: listing.curfewRules ? ['CCTV', listing.curfewRules] : ['CCTV', 'Verified listing'],
    type: 'Private room',
  }
}

function unwrapListings(payload: unknown): BackendListing[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object' && Array.isArray((payload as { listings?: unknown }).listings)) {
    return (payload as { listings: BackendListing[] }).listings
  }
  return []
}

function unwrapListing(payload: unknown): BackendListing | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as { listing?: BackendListing; id?: string | number }
  if (record.listing) return record.listing
  if (record.id !== undefined) return record as BackendListing
  return null
}

export const api = {
  listings: {
    list: async () => {
      try {
        const mapped = unwrapListings(await request<unknown>('/listings')).map(mapListing)
        return mapped.length ? mapped : mockListings
      } catch {
        return mockListings
      }
    },
    get: async (id: string) => {
      try {
        const listing = unwrapListing(await request<unknown>(`/listings/${id}`))
        return listing ? mapListing(listing) : mockListings.find((item) => item.id === id) || mockListings[0]
      } catch {
        return mockListings.find((item) => item.id === id) || mockListings[0]
      }
    },
    create: (data: unknown) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),
  },
  auth: {
    login: async (data: { email?: string; phone?: string; password?: string }) => {
      const result = await request<{ accessToken?: string; user?: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (result.accessToken) setToken(result.accessToken)
      return result
    },
    register: (data: { name: string; email: string; password?: string; phone: string; role?: string }) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role || 'tenant',
        }),
      }),
    session: async () => {
      try {
        return await request<{ user: AuthUser }>('/auth/me')
      } catch {
        return { user: null as AuthUser | null }
      }
    },
    logout: () => setToken(null),
    hasSession: () => Boolean(getToken()) || (typeof window !== 'undefined' && window.localStorage.getItem(SESSION_KEY) === 'active'),
  },
  inquiries: { list: async () => [] },
  messages: { list: async () => [] },
  profile: { get: async () => ({}) },
}

export const formatPrice = (price: number) => `Rs ${price.toLocaleString('en-PK')}`
export const isLiveApiConfigured = Boolean(process.env.NEXT_PUBLIC_API_URL)
