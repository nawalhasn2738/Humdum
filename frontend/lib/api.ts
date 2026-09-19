const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export type Listing = {
  id: string; name: string; area: string; price: number; metro: string; distance: string; image: string; verified: boolean; womenOnly: boolean; features: string[]; type: string
}

export const mockListings: Listing[] = [
  { id: '1', name: 'Noor Women Residence', area: 'G-11 Markaz, Islamabad', price: 28500, metro: 'Khayaban-e-Johar', distance: '650 m', image: '/humdum-residence.png', verified: true, womenOnly: true, features: ['CCTV', '24/7 guard', 'Emergency exit'], type: 'Private room' },
  { id: '2', name: 'Safa House', area: 'I-8/2, Islamabad', price: 22000, metro: 'I-8 Station', distance: '1.2 km', image: '/humdum-residence.png', verified: true, womenOnly: true, features: ['CCTV', 'Backup power'], type: 'Shared room' },
  { id: '3', name: 'The Olive Residency', area: 'Bahria Town, Rawalpindi', price: 35000, metro: 'Koral Chowk', distance: '900 m', image: '/humdum-residence.png', verified: true, womenOnly: false, features: ['CCTV', 'Warden onsite'], type: 'Private room' },
  { id: '4', name: 'Ayesha Apartments', area: 'F-8, Islamabad', price: 42000, metro: 'PIMS Station', distance: '450 m', image: '/humdum-residence.png', verified: true, womenOnly: true, features: ['CCTV', 'Emergency exit', 'Guard'], type: 'Studio' },
]

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) } })
  if (!response.ok) throw new Error('The Humdum service is taking a moment. Please try again.')
  return response.json()
}

export const api = {
  listings: { list: async () => { try { return await request<Listing[]>('/listings') } catch { return mockListings } }, get: async (id: string) => { try { return await request<Listing>(`/listings/${id}`) } catch { return mockListings.find((item) => item.id === id) || mockListings[0] } }, create: (data: unknown) => request('/listings', { method: 'POST', body: JSON.stringify(data) }) },
  auth: { login: (data: unknown) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }), register: (data: unknown) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }), session: () => request('/auth/session') },
  inquiries: { list: async () => [] }, messages: { list: async () => [] }, profile: { get: async () => ({}) },
}

export const formatPrice = (price: number) => `Rs ${price.toLocaleString('en-PK')}`
export const isLiveApiConfigured = Boolean(process.env.NEXT_PUBLIC_API_URL)
