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

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data as Profile
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

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return

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

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user.id)
          if (mounted) {
            setProfile(profileData)
          }
        } else {
          setProfile(null)
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null)
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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    return { error }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return

    await supabase.auth.signOut({ scope: 'local' })
    setUser(null)
    setSession(null)
    setProfile(null)
    // Clear any cached auth data
    localStorage.removeItem('supabase.auth.token')
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

    try {
      // Delete user's analysis history
      await supabase
        .from('analysis_history')
        .delete()
        .eq('user_id', user.id)

      // Delete user's profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      // Sign out the user (account deletion requires admin API)
      await supabase.auth.signOut({ scope: 'local' })
      setUser(null)
      setSession(null)
      setProfile(null)

      return { error: null }
    } catch (e) {
      return { error: e as Error }
    }
  }, [user])

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!supabase || !user) {
      return { error: new Error('Not authenticated') }
    }

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
    }

    return { error: error ? new Error(error.message) : null }
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
