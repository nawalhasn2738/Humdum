export type UserRole = 'tenant' | 'landlord' | 'admin' | 'safety_inspector'

export type RouteAuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error'
export type RouteAccessDecision = 'loading' | 'unauthenticated' | 'authorized' | 'forbidden' | 'error'

export function decideRouteAccess(
  status: RouteAuthStatus,
  role: UserRole | null | undefined,
  allowedRoles?: readonly UserRole[],
): RouteAccessDecision {
  if (status === 'loading') return 'loading'
  if (status === 'error') return 'error'
  if (status === 'unauthenticated' || !role) return 'unauthenticated'
  if (allowedRoles && !allowedRoles.includes(role)) return 'forbidden'
  return 'authorized'
}

export function homeForRole(role: UserRole): string {
  if (role === 'tenant') return '/profile'
  if (role === 'landlord') return '/landlord/dashboard'
  if (role === 'admin' || role === 'safety_inspector') return '/admin'
  return '/listings'
}

export function safeReturnPath(value: string | null | undefined, fallback = '/profile'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
