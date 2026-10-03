import type { CreateListingInput, ReportedSafetyFeature } from '@/lib/api'

export type ListingFormValues = {
  title: string
  description: string
  rent: string
  deposit: string
  curfewRules: string
  latitude: string
  longitude: string
  capacity: string
  accommodationType: string
  contactEmail: string
  contactPhone: string
  reportedSafetyFeatures: ReportedSafetyFeature[]
}

export function validateListingForm(values: ListingFormValues): {
  fields: Record<string, string>
  payload: CreateListingInput | null
} {
  const fields: Record<string, string> = {}
  const title = values.title.trim()
  const rent = Number(values.rent)
  const deposit = Number(values.deposit)
  const latitude = Number(values.latitude)
  const longitude = Number(values.longitude)
  const capacity = Number(values.capacity)
  const phone = values.contactPhone.replace(/[\s()-]/g, '')
  const accommodationTypes = ['hostel', 'room', 'apartment', 'house'] as const

  if (title.length < 3 || title.length > 255) fields.title = 'Use 3 to 255 characters.'
  if (!values.rent.trim() || !Number.isFinite(rent) || rent < 0) fields.rent = 'Enter a non-negative monthly rent.'
  if (!values.deposit.trim() || !Number.isFinite(deposit) || deposit < 0) fields.deposit = 'Enter a non-negative deposit.'
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) fields.capacity = 'Enter a capacity from 1 to 100.'
  if (!accommodationTypes.includes(values.accommodationType as typeof accommodationTypes[number])) fields.accommodationType = 'Choose an accommodation type.'
  if (!values.latitude.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) fields.latitude = 'Enter a latitude from -90 to 90.'
  if (!values.longitude.trim() || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) fields.longitude = 'Enter a longitude from -180 to 180.'
  if (!/^\S+@\S+\.\S+$/.test(values.contactEmail.trim())) fields.contactEmail = 'Enter a valid contact email.'
  if (!/^\+?[0-9]{10,15}$/.test(phone)) fields.contactPhone = 'Enter a phone with 10 to 15 digits.'
  if (values.description.trim().length > 5000) fields.description = 'Use 5000 characters or fewer.'
  if (values.curfewRules.trim().length > 1000) fields.curfewRules = 'Use 1000 characters or fewer.'

  if (Object.keys(fields).length > 0) return { fields, payload: null }

  return {
    fields,
    payload: {
      title,
      description: values.description.trim() || null,
      rent,
      deposit,
      curfewRules: values.curfewRules.trim() || null,
      latitude,
      longitude,
      capacity,
      accommodationType: values.accommodationType as CreateListingInput['accommodationType'],
      contactEmail: values.contactEmail.trim().toLowerCase(),
      contactPhone: phone,
      reportedSafetyFeatures: values.reportedSafetyFeatures,
    },
  }
}
