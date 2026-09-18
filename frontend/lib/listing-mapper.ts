import { mockListings, type Listing } from '@/lib/mock-data'
import type { ApiListing } from '@/lib/api'

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
]

export const AREA_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  Islamabad: { latitude: 33.6844, longitude: 73.0479 },
  'H-11': { latitude: 33.6615, longitude: 72.9884 },
  'G-6': { latitude: 33.7164, longitude: 73.079 },
  'F-7': { latitude: 33.7215, longitude: 73.057 },
  'F-10': { latitude: 33.6975, longitude: 73.0128 },
  'G-9': { latitude: 33.6878, longitude: 73.0346 },
  'Blue Area': { latitude: 33.7294, longitude: 73.078 },
  Gulberg: { latitude: 33.5973, longitude: 73.0669 },
  Aabpara: { latitude: 33.7088, longitude: 73.0866 },
  Rawalpindi: { latitude: 33.5651, longitude: 73.0169 },
}

export function listingImage(id: string) {
  const index = Number.parseInt(id, 10)
  if (Number.isFinite(index) && index >= 1 && index <= 5) {
    return FALLBACK_IMAGES[index - 1]
  }

  const hashed = Math.abs(
    Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0)
  )
  return FALLBACK_IMAGES[hashed % FALLBACK_IMAGES.length]
}

function inferArea(listing: ApiListing) {
  const haystack = `${listing.title} ${listing.description || ''}`.toLowerCase()
  const match = Object.keys(AREA_COORDINATES).find((area) => haystack.includes(area.toLowerCase()))
  return match || 'Islamabad / Rawalpindi'
}

export function mapApiListing(listing: ApiListing, extras: Partial<Listing> = {}): Listing {
  return {
    id: listing.id,
    title: listing.title,
    area: extras.area || inferArea(listing),
    price: listing.rent,
    distance: listing.distanceKm ?? extras.distance ?? 0,
    image: extras.image || listingImage(listing.id),
    isVerified: extras.isVerified ?? false,
    isWomenOnly: extras.isWomenOnly ?? true,
    hasCCTV: extras.hasCCTV ?? false,
    hasEmergencyExit: extras.hasEmergencyExit ?? false,
    hasGuard: extras.hasGuard ?? false,
    nearMetroStations: extras.nearMetroStations ?? [],
    amenities: extras.amenities ?? (listing.curfewRules ? ['Curfew rules listed'] : ['Verified listing']),
    wardenName: extras.wardenName || 'Host',
    wardenPhone: extras.wardenPhone || '',
    wardenResponseTime: extras.wardenResponseTime || 'In-app',
    description: listing.description || extras.description || 'No description provided yet.',
    nearestMetroStation: extras.nearestMetroStation || 'Metro Bus',
    metroDistance: listing.distanceKm ?? extras.metroDistance ?? 0,
    landlordId: listing.landlordId,
    deposit: listing.deposit,
    curfewRules: listing.curfewRules,
    location: listing.location,
    source: 'api',
  }
}

export function resolveAreaCoordinates(query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return AREA_COORDINATES.Islamabad
  }

  const match = Object.entries(AREA_COORDINATES).find(([area]) =>
    normalized.includes(area.toLowerCase())
  )
  return match?.[1] || AREA_COORDINATES.Islamabad
}

export function fallbackListings() {
  return mockListings.map((listing) => ({ ...listing, source: 'mock' as const }))
}
