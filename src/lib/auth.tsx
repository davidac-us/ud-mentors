import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'

export type ProfileWithDetails = Tables<'profiles'> & {
  languages: string[]
  interests: string[]
}

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: ProfileWithDetails | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  markOnboarded: (languages?: string[], interests?: string[]) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchProfileForUser(userId: string): Promise<ProfileWithDetails | null> {
  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !profileData) return null

  const [{ data: langs }, { data: ints }] = await Promise.all([
    supabase.from('profile_languages').select('language').eq('profile_id', profileData.id),
    supabase.from('profile_interests').select('interest').eq('profile_id', profileData.id),
  ])

  return {
    ...profileData,
    languages: langs?.map((l) => l.language) ?? [],
    interests: ints?.map((i) => i.interest) ?? [],
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshProfile() {
    if (!user) return
    const p = await fetchProfileForUser(user.id)
    setProfile(p)
  }

  function markOnboarded(languages?: string[], interests?: string[]) {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            onboarded: true,
            ...(languages !== undefined && { languages }),
            ...(interests !== undefined && { interests }),
          }
        : null,
    )
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        const p = await fetchProfileForUser(s.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        const p = await fetchProfileForUser(s.user.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signOut: async () => {
          await supabase.auth.signOut()
          setProfile(null)
          setSession(null)
          setUser(null)
        },
        refreshProfile,
        markOnboarded,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
