"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getAllTeams } from "@/lib/api"
import type { Team } from "@/lib/types"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, session, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [mounted, setMounted] = useState(false)

  // Marca que el componente está montado en el cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  // Si hay sesión activa, redirige al dashboard (solo después de montaje)
  useEffect(() => {
    if (mounted && !loading && session) {
      router.replace("/")
    }
  }, [mounted, loading, session, router])

  useEffect(() => {
    getAllTeams().then(setTeams)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const err = await signIn(email, password)
    if (err) {
      setError(err)
      setIsSubmitting(false)
    } else {
      // Login exitoso, redirige al dashboard
      router.push("/")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-2xl">🏀</span>
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            Hoops<span className="text-primary">IQ</span>
          </span>
        </div>

        <h2 className="text-center font-display text-lg font-bold text-foreground">
          Iniciar sesión
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Accede al portal de tu equipo
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              suppressHydrationWarning
              className="h-10 w-full rounded-lg border border-border bg-secondary px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="coach@club.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              suppressHydrationWarning
              className="h-10 w-full rounded-lg border border-border bg-secondary px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="mt-2 h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Cargando…" : "Entrar"}
          </button>
        </form>

        {/* Aviso de registro deshabilitado */}
        <div className="mt-6 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">📧 Registro deshabilitado:</span> Las nuevas cuentas solo pueden ser creadas por administradores. Contáctanos si necesitas acceso.
          </p>
        </div>
      </div>
    </div>
  )
}
