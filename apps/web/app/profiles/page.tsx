"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useProfiles } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, LogOut, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const AVATAR_COLORS = [
  "oklch(0.985 0 0)",
  "oklch(0.70 0 0)",
  "oklch(0.85 0.08 60)",
  "oklch(0.70 0.12 200)",
  "oklch(0.65 0.15 150)",
]

export default function ProfilesPage() {
  const router = useRouter()
  const { profiles, activeProfile, setActiveProfile, addProfile, removeProfile, logout } = useProfiles()
  const [managing, setManaging] = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState("")

  function handleSelectProfile(profile: typeof profiles[0]) {
    if (managing) return
    setActiveProfile(profile)
    router.push("/home")
  }

  function handleAddProfile() {
    if (!newName.trim()) return
    addProfile(newName.trim())
    setNewName("")
    setAddingNew(false)
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
            {managing ? "Administrar perfiles" : "Quien esta viendo?"}
          </h1>
          {!managing && (
            <p className="mt-1 text-sm text-muted-foreground">Selecciona tu perfil para continuar</p>
          )}
        </div>

        {/* Profile Grid */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleSelectProfile(profile)}
              className={cn(
                "group relative flex flex-col items-center gap-2 outline-none transition-transform",
                !managing && "hover:scale-105 focus-visible:scale-105",
                managing && "cursor-default"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "relative flex size-20 items-center justify-center rounded-2xl border-2 transition-all",
                  activeProfile?.id === profile.id && !managing
                    ? "border-foreground"
                    : "border-border",
                  !managing && "group-hover:border-foreground/60"
                )}
                style={{ backgroundColor: `color-mix(in oklch, ${profile.avatarColor} 15%, transparent)` }}
              >
                <span
                  className="text-xl font-bold"
                  style={{ color: profile.avatarColor }}
                >
                  {profile.initials}
                </span>

                {/* Delete button in managing mode */}
                {managing && profiles.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeProfile(profile.id)
                    }}
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-transform hover:scale-110"
                    aria-label={`Eliminar perfil ${profile.name}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {profile.name}
              </span>
            </button>
          ))}

          {/* Add Profile Button */}
          {profiles.length < 5 && !addingNew && (
            <button
              onClick={() => setAddingNew(true)}
              className="group flex flex-col items-center gap-2 outline-none transition-transform hover:scale-105"
            >
              <div className="flex size-20 items-center justify-center rounded-2xl border-2 border-dashed border-border transition-colors group-hover:border-muted-foreground">
                <Plus className="size-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <span className="text-sm text-muted-foreground">Agregar</span>
            </button>
          )}
        </div>

        {/* Add Profile Form */}
        {addingNew && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddProfile()
                if (e.key === "Escape") { setAddingNew(false); setNewName("") }
              }}
              placeholder="Nombre del perfil"
              className="h-10 max-w-48 rounded-xl border-border bg-card text-foreground"
              maxLength={20}
            />
            <Button
              size="icon"
              onClick={handleAddProfile}
              className="size-10 rounded-xl bg-foreground text-background hover:bg-foreground/90"
              aria-label="Confirmar"
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { setAddingNew(false); setNewName("") }}
              className="size-10 rounded-xl"
              aria-label="Cancelar"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <Button
            variant="outline"
            onClick={() => { setManaging(!managing); setAddingNew(false) }}
            className="h-10 rounded-xl border-border bg-transparent text-muted-foreground hover:text-foreground"
          >
            {managing ? (
              <>
                <Check className="size-4" />
                Listo
              </>
            ) : (
              <>
                <Pencil className="size-4" />
                Administrar perfiles
              </>
            )}
          </Button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="size-3.5" />
            Cerrar sesion
          </button>
        </div>
      </div>
    </main>
  )
}
