"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useProfiles } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserCircle, Users, LogOut, ChevronRight, Target } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export default function ProfilePage() {
  const router = useRouter()
  const { activeProfile, logout, updateProfileGoal } = useProfiles()
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [goalInput, setGoalInput] = useState("")
  const [savingGoal, setSavingGoal] = useState(false)

  function handleSwitchProfile() {
    router.push("/profiles")
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

  function openGoalDialog() {
    setGoalInput(activeProfile?.goal ?? "")
    setGoalDialogOpen(true)
  }

  async function handleSaveGoal() {
    if (!activeProfile) return
    setSavingGoal(true)
    const ok = await updateProfileGoal(activeProfile.id, goalInput.trim() || null)
    setSavingGoal(false)
    if (ok) {
      setGoalDialogOpen(false)
      toast.success("Objetivo actualizado")
    } else {
      toast.error("No se pudo actualizar el objetivo")
    }
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
          {activeProfile?.goal && (
            <p className="text-xs text-muted-foreground">{activeProfile.goal}</p>
          )}
          {!activeProfile?.goal && (
            <p className="text-xs text-muted-foreground">Sin objetivo definido</p>
          )}
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
          icon={Target}
          label="Cambiar objetivo"
          subtitle={activeProfile?.goal ?? "Sin objetivo definido"}
          onClick={openGoalDialog}
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

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-card px-6 py-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Cambiar objetivo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Describe tu objetivo nutricional. El asistente IA lo usara como contexto.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Input
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Ej: Bajar de peso, ganar musculo..."
              className="h-10 rounded-xl border-border bg-background text-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveGoal()
              }}
              autoFocus
            />

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 rounded-xl"
                onClick={() => setGoalDialogOpen(false)}
                disabled={savingGoal}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-xl bg-foreground text-background hover:bg-foreground/90"
                onClick={handleSaveGoal}
                disabled={savingGoal}
              >
                {savingGoal ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  "Guardar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
