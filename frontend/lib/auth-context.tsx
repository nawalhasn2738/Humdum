'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type UserRole = 'seeker' | 'host' | 'admin'

export interface User {
  id: string
  email: string
  name: string
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
  isLoading: boolean
  login: (email: string, password: string, userType: UserRole) => Promise<void>
  signup: (email: string, password: string, name: string, userType: UserRole) => Promise<void>
  applications: Application[]
  applyToListing: (application: Omit<Application, 'id' | 'appliedAt' | 'status'>) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const applyToListing = (application: Omit<Application, 'id' | 'appliedAt' | 'status'>) => {
    setApplications(current => current.some(item => item.listingId === application.listingId)
      ? current
      : [...current, { ...application, id: crypto.randomUUID(), status: 'Pending', appliedAt: new Date().toISOString() }])
  }

  const login = async (email: string, password: string, userType: UserRole) => {
    setIsLoading(true)
    setUser({ id: '1', email, name: email.split('@')[0], userType })
    setIsLoading(false)
  }

  const signup = async (email: string, password: string, name: string, userType: UserRole) => {
    setIsLoading(true)
    setUser({ id: crypto.randomUUID(), email, name, userType })
    setIsLoading(false)
  }

  const logout = () => {
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
