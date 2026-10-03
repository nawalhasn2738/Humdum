import type { ReactNode } from 'react'
import { ProtectedRoute } from '@/components/protected-route'

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={['tenant']}>{children}</ProtectedRoute>
}
