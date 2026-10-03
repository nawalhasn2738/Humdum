'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { api, ApiError, type BackendIdentity } from '@/lib/api'
import {
  getSupabaseClient,
  logAuthError,
  signInWithSupabase,
  signUpWithSupabase,
} from '@/lib/supabase'

import type { UserRole } from '@/lib/route-access'

export type { UserRole } from '@/lib/route-access'
export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error'

export interface User {
  id: string
  profileId: string
  email: string
  name: string
  phone: string | null
  userType: UserRole
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
  status: AuthStatus
  authError: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (
    email: string,
    password: string,
    name: string,
    role: Extract<UserRole, 'tenant' | 'landlord'>,
    phone: string,
  ) => Promise<User>
  refreshIdentity: () => Promise<User | null>
  applications: Application[]
  applyToListing: (application: Omit<Application, 'id' | 'appliedAt' | 'status'>) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function normalizePhone(phone: string) {
  const compact = phone.replace(/[^+0-9]/g, '')
  return /^03[0-9]{9}$/.test(compact) ? `+92${compact.slice(1)}` : compact
}

function toUser(authUser: SupabaseUser, identity: BackendIdentity): User {
  if (!identity.profileId || !identity.role) {
    throw new Error('Your authenticated account does not have a Humdum profile.')
  }

  return {
    id: authUser.id,
    profileId: identity.profileId,
    email: identity.email || authUser.email || '',
    name: identity.name || authUser.email?.split('@')[0] || 'Humdum user',
    phone: identity.phone,
    userType: identity.role,
  }
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to verify your Humdum profile.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [authError, setAuthError] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const requestVersion = useRef(0)
  const authOperationInProgress = useRef(false)

  const clearAuthState = useCallback(() => {
    requestVersion.current += 1
    setUser(null)
    setAuthError(null)
    setStatus('unauthenticated')
  }, [])

  const resolveIdentity = useCallback(async (authUser: SupabaseUser): Promise<User | null> => {
    const version = ++requestVersion.current
    setStatus('loading')
    setAuthError(null)

    try {
      const { user: identity } = await api.auth.identity()
      if (version !== requestVersion.current) return null
      const resolvedUser = toUser(authUser, identity)
      setUser(resolvedUser)
      setStatus('authenticated')
      return resolvedUser
    } catch (error) {
      if (version !== requestVersion.current) return null

      if (error instanceof ApiError && error.status === 401) {
        await getSupabaseClient().auth.signOut({ scope: 'local' })
        clearAuthState()
        throw error
      }

      logAuthError('backendIdentity', error)
      setUser(null)
      setAuthError(messageFromError(error))
      setStatus('error')
      throw error
    }
  }, [clearAuthState])

  const refreshIdentity = useCallback(async () => {
    const { data, error } = await getSupabaseClient().auth.getSession()
    if (error) {
      logAuthError('getSession', error)
      setUser(null)
      setAuthError(messageFromError(error))
      setStatus('error')
      return null
    }
    if (!data.session?.user) {
      clearAuthState()
      return null
    }
    try {
      return await resolveIdentity(data.session.user)
    } catch {
      return null
    }
  }, [clearAuthState, resolveIdentity])

  useEffect(() => {
    let active = true
    const supabase = getSupabaseClient()

    const syncSession = async (authUser: SupabaseUser | null) => {
      if (!active) return
      if (!authUser) {
        clearAuthState()
        return
      }
      try {
        await resolveIdentity(authUser)
      } catch {
        // resolveIdentity exposes backend failures through context state.
      }
    }

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          logAuthError('getSession', error)
          clearAuthState()
          return
        }
        void syncSession(data.session?.user || null)
      })
      .catch((error) => {
        if (!active) return
        logAuthError('initialization', error)
        setUser(null)
        setAuthError(messageFromError(error))
        setStatus('error')
      })

    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (authOperationInProgress.current) return
      window.setTimeout(() => void syncSession(session?.user || null), 0)
    })

    return () => {
      active = false
      requestVersion.current += 1
      listener.data.subscription.unsubscribe()
    }
  }, [clearAuthState, resolveIdentity])

  const applyToListing = (application: Omit<Application, 'id' | 'appliedAt' | 'status'>) => {
    setApplications((current) =>
      current.some((item) => item.listingId === application.listingId)
        ? current
        : [...current, { ...application, id: crypto.randomUUID(), status: 'Pending', appliedAt: new Date().toISOString() }],
    )
  }

  const login = async (email: string, password: string) => {
    authOperationInProgress.current = true
    setStatus('loading')
    setAuthError(null)
    try {
      const data = await signInWithSupabase(email, password)
      if (!data.user || !data.session) throw new Error('Supabase did not return an authenticated session.')
      const resolvedUser = await resolveIdentity(data.user)
      if (!resolvedUser) throw new Error('Unable to resolve your Humdum profile.')
      return resolvedUser
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        setUser(null)
        setAuthError(messageFromError(error))
        setStatus('error')
      }
      throw error
    } finally {
      authOperationInProgress.current = false
    }
  }

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: Extract<UserRole, 'tenant' | 'landlord'>,
    phone: string,
  ) => {
    authOperationInProgress.current = true
    setStatus('loading')
    setAuthError(null)
    try {
      const normalizedPhone = normalizePhone(phone)
      const data = await signUpWithSupabase({ email, password, name, phone: normalizedPhone })
      if (!data.user) throw new Error('Supabase did not return a user after sign up.')
      if (!data.session) {
        clearAuthState()
        throw new Error('Confirm your email address, then log in to finish creating your Humdum profile.')
      }

      try {
        await api.auth.registerProfile({ name, email, role, phone: normalizedPhone })
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 409)) throw error
      }
      const resolvedUser = await resolveIdentity(data.user)
      if (!resolvedUser) throw new Error('Unable to resolve your new Humdum profile.')
      return resolvedUser
    } catch (error) {
      setUser(null)
      setAuthError(messageFromError(error))
      setStatus('error')
      throw error
    } finally {
      authOperationInProgress.current = false
    }
  }

  const logout = async () => {
    setStatus('loading')
    const { error } = await getSupabaseClient().auth.signOut()
    if (error) {
      logAuthError('signOut', error)
      setAuthError(messageFromError(error))
      setStatus(user ? 'authenticated' : 'error')
      throw error
    }
    clearAuthState()
  }

  return (
    <AuthContext.Provider value={{
      user,
      status,
      authError,
      isLoading: status === 'loading',
      login,
      signup,
      refreshIdentity,
      applications,
      applyToListing,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider')
  return context
}
