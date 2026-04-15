"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useProfiles } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserCircle, Users, LogOut, ChevronRight, Target, Ruler } from "lucide-react"
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
  const { activeProfile, logout, updateProfile } = useProfiles()

  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [goalInput, setGoalInput] = useState("")
  const [savingGoal, setSavingGoal] = useState(false)

  const [physicalDialogOpen, setPhysicalDialogOpen] = useState(false)
  const [ageInput, setAgeInput] = useState("")
  const [heightInput, setHeightInput] = useState("")
  const [savingPhysical, setSavingPhysical] = useState(false)

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

  function openPhysicalDialog() {
    setAgeInput(activeProfile?.age != null ? String(activeProfile.age) : "")
    setHeightInput(activeProfile?.height != null ? String(activeProfile.height) : "")
    setPhysicalDialogOpen(true)
  }

  async function handleSaveGoal() {
    if (!activeProfile) return
    setSavingGoal(true)
    const ok = await updateProfile(activeProfile.id, { goal: goalInput.trim() || null })
    setSavingGoal(false)
    if (ok) {
      setGoalDialogOpen(false)
      toast.success("Objetivo actualizado")
    } else {
      toast.error("No se pudo actualizar el objetivo")
    }
  }

  async function handleSavePhysical() {
    if (!activeProfile) return

    const age = ageInput.trim() ? parseInt(ageInput.trim()) : null
    const height = heightInput.trim() ? parseInt(heightInput.trim()) : null

    if (age !== null && (isNaN(age) || age < 1 || age > 120)) {
      toast.error("Edad inválida. Debe ser entre 1 y 120 años.")
      return
    }
    if (height !== null && (isNaN(height) || height < 50 || height > 300)) {
      toast.error("Altura inválida. Debe ser entre 50 y 300 cm.")
      return
    }

    setSavingPhysical(true)
    const ok = await updateProfile(activeProfile.id, { age, height })
    setSavingPhysical(false)
    if (ok) {
      setPhysicalDialogOpen(false)
      toast.success("Datos físicos actualizados")
    } else {
      toast.error("No se pudo actualizar los datos físicos")
    }
  }

  const physicalSubtitle = (() => {
    const parts = []
    if (activeProfile?.age) parts.push(`${activeProfile.age} años`)
    if (activeProfile?.height) parts.push(`${activeProfile.height} cm`)
    return parts.length > 0 ? parts.join(" · ") : "Sin datos físicos"
  })()

  return (
    <div className="page-transition mx-auto max-w-lg px-4 pt-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Perfil</h1>
      </header>

      {/* Active Profile Card */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
          <span className="text-lg font-bold text-foreground">
            {activeProfile?.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{activeProfile?.name}</p>
          {activeProfile?.goal ? (
            <p className="text-xs text-muted-foreground">{activeProfile.goal}</p>
          ) : (
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
          icon={Ruler}
          label="Datos físicos"
          subtitle={physicalSubtitle}
          onClick={openPhysicalDialog}
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
        <p className="text-[11px] text-muted-foreground/50">NutriApp v0.2.0</p>
        <p className="text-[10px] text-muted-foreground/30">Hecho con Next.js</p>
        <p className="text-[10px] text-muted-foreground/30">Powered by Matias Golonbek</p>
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
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveGoal() }}
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

      {/* Physical Data Dialog */}
      <Dialog open={physicalDialogOpen} onOpenChange={setPhysicalDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-card px-6 py-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Datos físicos
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Con tu edad y altura el asistente IA puede calcular tus calorías de mantenimiento (TDEE) y macros recomendados.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Edad (años)</label>
              <Input
                type="number"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                placeholder="Ej: 28"
                min={1}
                max={120}
                className="h-10 rounded-xl border-border bg-background text-foreground"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Altura (cm)</label>
              <Input
                type="number"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                placeholder="Ej: 175"
                min={50}
                max={300}
                className="h-10 rounded-xl border-border bg-background text-foreground"
              />
            </div>
            <div className="flex gap-2 mt-1">
              <Button
                variant="ghost"
                className="flex-1 rounded-xl"
                onClick={() => setPhysicalDialogOpen(false)}
                disabled={savingPhysical}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-xl bg-foreground text-background hover:bg-foreground/90"
                onClick={handleSavePhysical}
                disabled={savingPhysical}
              >
                {savingPhysical ? (
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
