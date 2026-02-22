"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { supabase } from "@/lib/supabase"
import type { AppUser, Team } from "@/lib/types"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"

interface AuthState {
  session: Session | null
  user: User | null
  profile: AppUser | null
  team: Team | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, displayName: string, teamId: number) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

function getEmailRedirectUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  return siteUrl ? `${siteUrl.replace(/\/$/, "")}/auth/callback` : undefined
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)

  async function ensureProfileForUser(currentUser: User) {
    const displayName =
      (currentUser.user_metadata?.display_name as string | undefined) ??
      (currentUser.user_metadata?.full_name as string | undefined) ??
      null
    const teamIdRaw = currentUser.user_metadata?.team_id
    const teamId = typeof teamIdRaw === "number" ? teamIdRaw : Number(teamIdRaw)

    if (!displayName || !Number.isFinite(teamId) || teamId <= 0) {
      return
    }

    try {
      const { error } = await supabase.from("users").upsert(
        {
          id: currentUser.id,
          email: currentUser.email ?? "",
          display_name: displayName,
          team_id: teamId,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.error("Error creando/sincronizando perfil de usuario:", error.message)
      }
    } catch (err) {
      console.error("Exception en ensureProfileForUser:", err)
    }
  }

  /* ── Fetch the user row & associated team from public.users ── */
  async function fetchProfile(uid: string) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*, team:teams(*)")
        .eq("id", uid)
        .maybeSingle()

      if (error) {
        console.error("Error fetching profile:", error.message)
        setProfile(null)
        setTeam(null)
        return
      }

      if (data) {
        const { team: teamData, ...rest } = data as AppUser & { team: Team }
        setProfile(rest as AppUser)
        setTeam(teamData ?? null)
        return
      }

      setProfile(null)
      setTeam(null)
    } catch (err) {
      console.error("Exception en fetchProfile:", err)
    }
  }

  async function syncAuthState(event: AuthChangeEvent | "INITIAL", currentSession: Session | null) {
    setSession(currentSession)
    setUser(currentSession?.user ?? null)

    if (!currentSession?.user) {
      setProfile(null)
      setTeam(null)
      return
    }

    if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL") {
      await ensureProfileForUser(currentSession.user)
    }

    await fetchProfile(currentSession.user.id)
  }

  /* ── Bootstrap: check existing session ── */
  useEffect(() => {
    let cancelled = false

    const initAuth = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()

        if (cancelled) return
        await syncAuthState("INITIAL", s)
      } catch (err) {
        if (!cancelled) {
          console.error("Error en initAuth:", err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      void (async () => {
        if (cancelled) return
        try {
          await syncAuthState(event, s)
        } catch (err) {
          if (!cancelled) {
            console.error("Error en onAuthStateChange:", err)
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      })()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Sign in ── */
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }

  /* ── Sign up + insert profile row ── */
  async function signUp(
    email: string,
    password: string,
    displayName: string,
    teamId: number,
  ) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailRedirectUrl(),
          data: {
            display_name: displayName,
            team_id: teamId,
          },
        },
      })

      if (error) return error.message

      if (data.user && data.session) {
        await ensureProfileForUser(data.user)
        await fetchProfile(data.user.id)
      }

      return null
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "Operación cancelada"
      }
      console.error("Error en signUp:", err)
      return "Error al crear cuenta"
    }
  }

  /* ── Sign out ── */
  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setTeam(null)
  }

  return (
    <AuthContext.Provider
      value={{ session, user, profile, team, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
