"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useProfiles } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { setIsLoggedIn } = useProfiles()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      setError("Completa todos los campos")
      return
    }

    setLoading(true)
    // TODO: Connect to backend POST /api/auth/login
    await new Promise((r) => setTimeout(r, 800))
    setIsLoggedIn(true)
    setLoading(false)
    router.push("/profiles")
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
            <span className="text-2xl font-bold tracking-tight text-foreground">N</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">NutriApp</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu nutricion, simplificada</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground"
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Contrasena
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Tu contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-border bg-card pr-10 text-foreground placeholder:text-muted-foreground"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/90"
          >
            {loading ? (
              <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              "Iniciar sesion"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {"No tenes cuenta? "}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  )
}
