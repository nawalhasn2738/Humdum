import type { ReactNode } from 'react'
import { ProtectedRoute } from '@/components/protected-route'

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
