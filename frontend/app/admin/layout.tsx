import type { ReactNode } from 'react'
import { ProtectedRoute } from '@/components/protected-route'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={['admin', 'safety_inspector']}>{children}</ProtectedRoute>
}
