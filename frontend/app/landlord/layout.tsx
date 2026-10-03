import type { ReactNode } from 'react'
import { ProtectedRoute } from '@/components/protected-route'

export default function LandlordLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={['landlord']}>{children}</ProtectedRoute>
}
