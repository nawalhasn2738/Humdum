export interface Listing {
  id: string
  title: string
  area: string
  price: number
  distance: number
  image: string
  isVerified: boolean
  isWomenOnly: boolean
  hasCCTV: boolean
  hasEmergencyExit: boolean
  hasGuard: boolean
  nearMetroStations: string[]
  amenities: string[]
  wardenName: string
  wardenPhone: string
  wardenResponseTime: string
  description: string
  nearestMetroStation: string
  metroDistance: number
  landlordId?: string
  deposit?: number
  curfewRules?: string | null
  location?: { latitude: number; longitude: number } | null
  source?: 'api' | 'mock'
}

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface Application {
  id: string
  listingId: string
  listingTitle: string
  status: 'pending' | 'responded' | 'rejected'
  appliedAt: string
  respondedAt?: string
}

export const mockListings: Listing[] = [
  {
    id: '1',
    title: 'Modern Girls Hostel Near FAST',
    area: 'H-11, Islamabad',
    price: 15000,
    distance: 0.8,
    image: '/placeholder.jpg',
    isVerified: true,
    isWomenOnly: true,
    hasCCTV: true,
    hasEmergencyExit: true,
    hasGuard: true,
    nearMetroStations: ['Blue Area Metro', 'G-11 Metro'],
    amenities: ['WiFi', 'Laundry', 'Study Area', 'Kitchen', 'TV Lounge'],
    wardenName: 'Fatima Khan',
    wardenPhone: '+92-300-1234567',
    wardenResponseTime: '< 30 min',
    description: 'Safe and comfortable hostel for female students with modern amenities.',
    nearestMetroStation: 'Blue Area Metro',
    metroDistance: 0.5,
  },
  {
    id: '2',
    title: 'Cozy Student Hostel',
    area: 'G-6, Islamabad',
    price: 12000,
    distance: 1.2,
    image: '/placeholder.jpg',
    isVerified: true,
    isWomenOnly: true,
    hasCCTV: true,
    hasEmergencyExit: false,
    hasGuard: true,
    nearMetroStations: ['G-6 Metro'],
    amenities: ['WiFi', 'Laundry', 'Meals Included', 'Study Room'],
    wardenName: 'Amina Malik',
    wardenPhone: '+92-321-9876543',
    wardenResponseTime: '< 1 hour',
    description: 'Affordable and secure hostel close to universities.',
    nearestMetroStation: 'G-6 Metro',
    metroDistance: 0.3,
  },
  {
    id: '3',
    title: 'Premium Girls Accommodation',
    area: 'F-7, Islamabad',
    price: 25000,
    distance: 2.1,
    image: '/placeholder.jpg',
    isVerified: true,
    isWomenOnly: true,
    hasCCTV: true,
    hasEmergencyExit: true,
    hasGuard: true,
    nearMetroStations: ['Aabpara Metro', 'Blue Area Metro'],
    amenities: ['WiFi', 'Laundry', 'Gym', 'Study Area', 'Kitchen', 'Air Conditioning'],
    wardenName: 'Dr. Hina Ahmed',
    wardenPhone: '+92-333-5555555',
    wardenResponseTime: '< 15 min',
    description: 'Luxurious and well-maintained accommodation for working women.',
    nearestMetroStation: 'Aabpara Metro',
    metroDistance: 0.8,
  },
  {
    id: '4',
    title: 'Budget Hostel near RWP',
    area: 'Rawalpindi',
    price: 8000,
    distance: 3.5,
    image: '/placeholder.jpg',
    isVerified: false,
    isWomenOnly: true,
    hasCCTV: false,
    hasEmergencyExit: true,
    hasGuard: true,
    nearMetroStations: ['Rawalpindi Metro'],
    amenities: ['WiFi', 'Laundry', 'Study Area'],
    wardenName: 'Nasreen Ali',
    wardenPhone: '+92-345-7654321',
    wardenResponseTime: '< 2 hours',
    description: 'Budget-friendly option in Rawalpindi with basic facilities.',
    nearestMetroStation: 'Rawalpindi Metro',
    metroDistance: 1.2,
  },
  {
    id: '5',
    title: 'Executive Women Apartment',
    area: 'Gulberg, Islamabad',
    price: 35000,
    distance: 2.8,
    image: '/placeholder.jpg',
    isVerified: true,
    isWomenOnly: false,
    hasCCTV: true,
    hasEmergencyExit: true,
    hasGuard: true,
    nearMetroStations: ['Gulberg Metro', 'Blue Area Metro'],
    amenities: ['WiFi', 'Laundry', 'Parking', 'Security', 'Air Conditioning', 'Kitchen'],
    wardenName: 'Mrs. Saira Hussain',
    wardenPhone: '+92-300-8888888',
    wardenResponseTime: '< 20 min',
    description: 'Premium accommodation for working professionals.',
    nearestMetroStation: 'Gulberg Metro',
    metroDistance: 0.6,
  },
]

export const mockSavedListings: string[] = []

export const mockApplications: Application[] = []

export const mockUser: User | null = null

export const mockStats = {
  verifiedListings: mockListings.filter(l => l.isVerified).length,
  metroMappedRoutes: mockListings.length,
  wardens: mockListings.length,
}

export const universities = [
  'FAST NUCES',
  'Bahria University',
  'COMSATS',
  'IIU',
  'QAU',
  'International Islamic University',
]

export const workplaces = [
  'DHA Medical Center',
  'Shifa International Hospital',
  'Serena Hotel',
  'Jinnah Convention Center',
]

export const areas = ['H-11', 'G-6', 'F-7', 'Gulberg', 'Rawalpindi', 'Aabpara']
