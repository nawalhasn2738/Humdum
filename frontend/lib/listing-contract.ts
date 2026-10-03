export const MAX_LISTING_RADIUS_KM = 100

export type ListingSearchParams = {
  latitude: number
  longitude: number
  radiusKm: number
}

export function listingSearchValidationError(params: ListingSearchParams): string | null {
  if (!Number.isFinite(params.latitude) || params.latitude < -90 || params.latitude > 90) {
    return 'Latitude must be between -90 and 90.'
  }
  if (!Number.isFinite(params.longitude) || params.longitude < -180 || params.longitude > 180) {
    return 'Longitude must be between -180 and 180.'
  }
  if (!Number.isFinite(params.radiusKm) || params.radiusKm <= 0 || params.radiusKm > MAX_LISTING_RADIUS_KM) {
    return `Search radius must be greater than 0 and no more than ${MAX_LISTING_RADIUS_KM} km.`
  }
  return null
}

export function isValidListingId(id: string): boolean {
  return /^[1-9]\d*$/.test(id)
}

export function hasSafetyInformation(dataCompleteness: number): boolean {
  return Number.isFinite(dataCompleteness) && dataCompleteness > 0
}

export type BackendComplianceStatus =
  | 'verified'
  | 'conditional'
  | 'pending_verification'
  | 'needs_attention'
  | 'expired'
  | 'not_audited'

export type PublicVerificationState =
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'expired'
  | 'unavailable'

export function mapPublicVerificationState({
  safetyStatus,
  hasAudit,
  currentAudit,
  dataCompleteness,
}: {
  safetyStatus: BackendComplianceStatus
  hasAudit: boolean
  currentAudit: boolean
  dataCompleteness: number
}): PublicVerificationState {
  if (!hasAudit || safetyStatus === 'not_audited') return 'unavailable'
  if (safetyStatus === 'expired') return 'expired'
  if (safetyStatus === 'conditional' || safetyStatus === 'pending_verification') return 'pending'
  if (safetyStatus === 'needs_attention') return 'rejected'
  if (safetyStatus === 'verified' && currentAudit && hasSafetyInformation(dataCompleteness)) {
    return 'verified'
  }
  return 'unavailable'
}
