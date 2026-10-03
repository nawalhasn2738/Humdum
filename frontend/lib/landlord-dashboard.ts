import type { ManagedListing } from '@/lib/api'
import type { BackendComplianceStatus } from '@/lib/listing-contract'

export type DashboardListing = ManagedListing & {
  verificationStatus: BackendComplianceStatus | 'error'
}

export async function attachVerificationStatus(
  listings: ManagedListing[],
  getStatus: (listingId: string) => Promise<BackendComplianceStatus>,
): Promise<DashboardListing[]> {
  return Promise.all(listings.map(async (listing) => {
    try {
      return { ...listing, verificationStatus: await getStatus(listing.id) }
    } catch {
      return { ...listing, verificationStatus: 'error' as const }
    }
  }))
}
