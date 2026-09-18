'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  ApiError,
  getCurrentUser,
  loginUser,
  registerUser,
  storeAccessToken,
  type ApiUser,
} from '@/lib/api'

export type UserRole = 'seeker' | 'host' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  userType: UserRole
  role: string
  phone?: string
  maskedPhone?: string
}

export interface Application {
  id: string
  listingId: string
  listingTitle: string
  area: string
  price: number
  status: 'Pending' | 'Approved' | 'Declined'
  appliedAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, userType: UserRole, phone?: string) => Promise<void>
  signup: (
    email: string,
    password: string,
    name: string,
    userType: UserRole,
    phone?: string
  ) => Promise<void>
  applications: Application[]
  applyToListing: (application: Omit<Application, 'id' | 'appliedAt' | 'status'>) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = 'humdum.session'
const APPLICATIONS_KEY = 'humdum.applications'

function roleToUserType(role: string): UserRole {
  if (role === 'admin') {
    return 'admin'
  }

  return role === 'landlord' ? 'host' : 'seeker'
}

function mapApiUser(user: ApiUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    userType: roleToUserType(user.role),
    phone: user.phone,
    maskedPhone: user.maskedPhone,
  }
}

function toBackendRole(userType: UserRole): 'tenant' | 'landlord' {
  return userType === 'host' ? 'landlord' : 'tenant'
}

function readStoredApplications(): Application[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(APPLICATIONS_KEY)
    return raw ? (JSON.parse(raw) as Application[]) : []
  } catch {
    return []
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const storedApplications = readStoredApplications()
    setApplications(storedApplications)

    const restore = async () => {
      try {
        const storedSession = window.localStorage.getItem(SESSION_KEY)
        if (storedSession) {
          setUser(JSON.parse(storedSession) as User)
        }

        const { user: currentUser } = await getCurrentUser()
        const mapped = mapApiUser(currentUser)
        setUser(mapped)
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(mapped))
      } catch {
        // Keep any locally restored session; public browsing still works without auth.
      } finally {
        setHydrated(true)
      }
    }

    void restore()
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    window.localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications))
  }, [applications, hydrated])

  const persistUser = (nextUser: User, accessToken?: string) => {
    if (accessToken) {
      storeAccessToken(accessToken)
    }

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const applyToListing = (application: Omit<Application, 'id' | 'appliedAt' | 'status'>) => {
    setApplications((current) =>
      current.some((item) => item.listingId === application.listingId)
        ? current
        : [
            ...current,
            {
              ...application,
              id: crypto.randomUUID(),
              status: 'Pending',
              appliedAt: new Date().toISOString(),
            },
          ]
    )
  }

  const login = async (
    email: string,
    _password: string,
    _userType: UserRole,
    phone?: string
  ) => {
    setIsLoading(true)
    try {
      const response = await loginUser({
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || undefined,
      })
      persistUser(mapApiUser(response.user), response.accessToken)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to log in.'
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (
    email: string,
    _password: string,
    name: string,
    userType: UserRole,
    phone?: string
  ) => {
    if (userType === 'admin') {
      throw new Error('Admin accounts are seeded by the backend, not created from sign up.')
    }

    if (!phone?.trim()) {
      throw new Error('A phone number in E.164 format is required, for example +923001234567.')
    }

    setIsLoading(true)
    try {
      try {
        await registerUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: toBackendRole(userType),
          phone: phone.trim(),
        })
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 409)) {
          throw error
        }
      }
      const response = await loginUser({
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      })
      persistUser(mapApiUser(response.user), response.accessToken)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to create an account.'
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    storeAccessToken(null)
    window.localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, applications, login, signup, applyToListing, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
