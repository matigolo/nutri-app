"use client"

import { useRouter } from "next/navigation"
import { useProfiles } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { UserCircle, Users, LogOut, ChevronRight, Moon } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { activeProfile, logout } = useProfiles()

  function handleSwitchProfile() {
    router.push("/profiles")
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <div className="page-transition mx-auto max-w-lg px-4 pt-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Perfil</h1>
      </header>

      {/* Active Profile Card */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <div
          className="flex size-14 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `color-mix(in oklch, ${activeProfile?.avatarColor} 15%, transparent)`,
          }}
        >
          <span
            className="text-lg font-bold"
            style={{ color: activeProfile?.avatarColor }}
          >
            {activeProfile?.initials}
          </span>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{activeProfile?.name}</p>
          <p className="text-xs text-muted-foreground">Perfil activo</p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex flex-col gap-1">
        <MenuItem
          icon={Users}
          label="Cambiar perfil"
          subtitle="Seleccionar otro perfil"
          onClick={handleSwitchProfile}
        />
        <MenuItem
          icon={Moon}
          label="Tema oscuro"
          subtitle="Siempre activado"
          disabled
        />
        <MenuItem
          icon={UserCircle}
          label="Editar cuenta"
          subtitle="Email y contrasena"
          disabled
        />
      </div>

      {/* Logout */}
      <div className="mt-8">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full h-11 justify-start rounded-xl text-muted-foreground hover:text-destructive"
        >
          <LogOut className="size-4" />
          Cerrar sesion
        </Button>
      </div>

      {/* App Info */}
      <div className="mt-8 text-center">
        <p className="text-[11px] text-muted-foreground/50">NutriApp v0.1.0</p>
        <p className="text-[10px] text-muted-foreground/30">Hecho con Next.js</p>
      </div>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  subtitle,
  onClick,
  disabled,
}: {
  icon: typeof UserCircle
  label: string
  subtitle: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-secondary">
        <Icon className="size-4 text-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  )
}
