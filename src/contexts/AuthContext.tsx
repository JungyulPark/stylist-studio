import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isSupabaseConfigured: boolean
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
  deleteAccount: () => Promise<{ error: Error | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(supabase !== null)

  const isSupabaseConfigured = supabase !== null

  // Fetch user profile from database (optional - works without profiles table)
  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return null

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // 테이블이 없거나 프로필이 없어도 정상 작동
        console.log('Profile not found (this is OK):', error.message)
        return null
      }

      return data as Profile
    } catch (e) {
      // 테이블이 없어도 에러 무시
      console.log('Profile fetch skipped')
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }, [user, fetchProfile])

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      return
    }

    let mounted = true

    // OAuth 콜백 처리: URL hash에서 토큰 추출 시도
    const handleOAuthCallback = async () => {
      const hash = window.location.hash
      if (hash && (hash.includes('access_token=') || hash.includes('error='))) {
        console.log('Processing OAuth callback from URL hash...')
        // Supabase가 URL에서 자동으로 토큰을 추출하므로 getSession 호출
      }
    }

    handleOAuthCallback()

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
      if (!mounted) return

      if (error) {
        console.error('Error getting session:', error)
      }

      console.log('Initial session:', initialSession ? 'Found' : 'None')
      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      if (initialSession?.user) {
        const profileData = await fetchProfile(initialSession.user.id)
        if (mounted) {
          setProfile(profileData)
        }
      }

      if (mounted) {
        setIsLoading(false)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return

        console.log('Auth state changed:', event, newSession ? 'Session exists' : 'No session')

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          console.log('User signed in:', newSession.user.email)
          const profileData = await fetchProfile(newSession.user.id)
          if (mounted) {
            setProfile(profileData)
          }
        } else {
          setProfile(null)
        }

        if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          setProfile(null)
        }

        // OAuth 콜백 후 성공적으로 로그인되면 URL hash 정리
        if (event === 'SIGNED_IN' && window.location.hash.includes('access_token=')) {
          console.log('Cleaning up OAuth callback URL')
          window.history.replaceState({ page: 'landing' }, '', '#landing')
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase is not configured' } as AuthError }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    return { error }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase is not configured' } as AuthError }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { error }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      return { error: { message: 'Supabase is not configured' } as AuthError }
    }

    console.log('Starting Google OAuth sign in...')
    console.log('Redirect URL:', window.location.origin)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Google OAuth error:', error)
    } else {
      console.log('Google OAuth initiated, redirecting to:', data?.url)
    }

    return { error }
  }, [])

  const signOut = useCallback(async () => {
    console.log('signOut called')

    // 1. 로컬 상태 먼저 정리 (네트워크 대기 없이 즉시)
    setUser(null)
    setSession(null)
    setProfile(null)

    // 2. localStorage/sessionStorage 정리
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key)
      }
    })
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        sessionStorage.removeItem(key)
      }
    })

    // 3. Supabase signOut은 비동기로 보내되 대기하지 않음 (hang 방지)
    if (supabase) {
      supabase.auth.signOut().catch(e => console.error('Supabase signOut error:', e))
    }

    console.log('Redirecting to home...')
    // 4. 즉시 리다이렉트
    window.location.href = '/'
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase is not configured' } as AuthError }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=true`,
    })

    return { error }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase is not configured' } as AuthError }
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    return { error }
  }, [])

  const deleteAccount = useCallback(async () => {
    if (!supabase || !user) {
      return { error: new Error('Not authenticated') }
    }

    const userId = user.id

    // 1. 로컬 상태 먼저 정리 (네트워크 대기 없이 즉시)
    setUser(null)
    setSession(null)
    setProfile(null)

    // 2. localStorage/sessionStorage 정리
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key)
      }
    })
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        sessionStorage.removeItem(key)
      }
    })

    // 3. 서버 정리는 비동기로 (UI 블로킹 없이)
    const sb = supabase // TypeScript narrowing을 위해 로컬 변수로 캡처
    const serverCleanup = async () => {
      try {
        await sb.from('analysis_history').delete().eq('user_id', userId)
      } catch (e) { console.log('analysis_history delete skipped:', e) }

      try {
        await sb.from('profiles').delete().eq('id', userId)
      } catch (e) { console.log('profiles delete skipped:', e) }

      try {
        await sb.rpc('delete_user')
      } catch (e) { console.log('RPC not available:', e) }

      try {
        await sb.auth.signOut()
      } catch (e) { console.log('signOut skipped:', e) }
    }

    // 서버 정리는 백그라운드로 실행 (대기하지 않음)
    serverCleanup().catch(e => console.error('Server cleanup error:', e))

    // 4. 즉시 리다이렉트
    window.location.href = '/'
    return { error: null }
  }, [user])

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!supabase || !user) {
      return { error: new Error('Not authenticated') }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (!error) {
        const profileData = await fetchProfile(user.id)
        setProfile(profileData)
      } else {
        // 테이블 없으면 무시
        console.log('Profile update skipped:', error.message)
      }

      return { error: null }
    } catch (e) {
      console.log('Profile update skipped')
      return { error: null }
    }
  }, [user, fetchProfile])

  const value = {
    user,
    session,
    profile,
    isLoading,
    isSupabaseConfigured,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    deleteAccount,
    updateProfile,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
