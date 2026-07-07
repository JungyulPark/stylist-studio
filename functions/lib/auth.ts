/**
 * Server-side Supabase user verification.
 *
 * Endpoints that act on a user's account must NOT trust an email or
 * user_id from the request body — anyone can send any value. Instead the
 * frontend sends the Supabase session JWT as `Authorization: Bearer`,
 * and the endpoint derives identity from this verification.
 */

export interface VerifiedUser {
  id: string
  email: string
}

interface AuthEnv {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

export async function verifySupabaseUser(request: Request, env: AuthEnv): Promise<VerifiedUser | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return null

  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    })
    if (!res.ok) return null
    const user = await res.json() as { id?: string; email?: string }
    if (!user.id || !user.email) return null
    return { id: user.id, email: user.email }
  } catch (e) {
    console.error('[auth] Token verification failed:', e)
    return null
  }
}
