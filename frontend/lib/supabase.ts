import {
  createClient,
  type AuthError,
  type SupabaseClient,
} from '@supabase/supabase-js'

let client: SupabaseClient | undefined

function requirePublicEnvironment(name: string, value: string | undefined) {
  if (!value || value.startsWith('[')) {
    throw new Error(
      name + ' is not configured. Add it to frontend/.env.local and restart Next.js.',
    )
  }

  return value
}

export function getSupabaseClient() {
  if (!client) {
    const url = requirePublicEnvironment(
      'NEXT_PUBLIC_SUPABASE_URL',
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    )
    const key = requirePublicEnvironment(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )

    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return client
}

export function logAuthError(operation: string, error: unknown) {
  const authError = error as Partial<AuthError>
  console.error('[Supabase Auth] ' + operation + ' failed', {
    name: authError?.name,
    message: authError?.message,
    status: authError?.status,
    code: authError?.code,
    cause: error,
  })
}

export function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'Confirm your email address before logging in.'
  }
  if (normalized.includes('user already registered')) {
    return 'An account with this email already exists.'
  }
  if (normalized.includes('password should be')) {
    return 'Choose a stronger password with at least 6 characters.'
  }
  if (normalized.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (normalized.includes('fetch') || normalized.includes('network')) {
    return 'Unable to reach Supabase. Check your connection and try again.'
  }
  if (normalized.includes('not configured')) {
    return message
  }

  return message || 'Authentication failed. Please try again.'
}

export async function signInWithSupabase(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    logAuthError('signInWithPassword', error)
    throw error
  }

  return data
}

export async function signUpWithSupabase({
  email,
  password,
  name,
  phone,
}: {
  email: string
  password: string
  name: string
  phone?: string
}) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        phone: phone || null,
      },
    },
  })

  if (error) {
    logAuthError('signUp', error)
    throw error
  }

  return data
}
export async function requestPasswordReset(email: string) {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/login',
  })

  if (error) {
    logAuthError('resetPasswordForEmail', error)
    throw error
  }
}
