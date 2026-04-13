"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProfiles } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, LogOut, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Profile } from "@/lib/types"
import { apiFetch } from "@/lib/api"

const AVATAR_COLORS = [
  "oklch(0.985 0 0)",
  "oklch(0.70 0 0)",
  "oklch(0.85 0.08 60)",
  "oklch(0.70 0.12 200)",
  "oklch(0.65 0.15 150)",
]
const PROFILE_GOALS = [
  "Bajar grasa",
  "Mantener peso",
  "Ganar masa muscular",
  "Comer más saludable",
  "Mejorar hábitos",
  "Aumentar proteína",
  "Otro",
]
export default function ProfilesPage() {
  const router = useRouter()
  const {activeProfile, setActiveProfile, addProfile, removeProfile, logout } = useProfiles()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [managing, setManaging] = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newGoal, setNewGoal] = useState("")

    async function fetchProfiles() {
      // apiFetch usa el proxy: el token viaja en la cookie HttpOnly, no en localStorage
      const res = await apiFetch("http://localhost:4000/profiles", {});

      const data = await res.json();
      setProfiles(data.profiles);
    }

    useEffect(() => {
      fetchProfiles()
    }, []);

  function handleSelectProfile(profile: Profile) {
    if (managing) return
    setActiveProfile(profile)
    router.push("/home")
  }

  async function handleAddProfile() {
  if (!newName.trim()) return

  if (!newGoal) {
    alert("Seleccioná un objetivo para el perfil")
    return
  }

  // apiFetch usa el proxy con la cookie HttpOnly — sin necesidad de leer el token
  const res = await apiFetch("http://localhost:4000/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: newName.trim(),
      goal: newGoal,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.log("Error create profile:", data)
    alert(data.error || "No se pudo crear el perfil")
    return
  }

  setNewName("")
  setNewGoal("")
  setAddingNew(false)

  await fetchProfiles()
}
  



async function handleDeleteProfile(profile: Profile) {
  const res = await apiFetch(`http://localhost:4000/profiles/${profile.id}`, {
    method: "DELETE",
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || "Error al eliminar perfil")
    return
  }

  await fetchProfiles()
}

async function handleLogout() {
  // Limpiar la cookie HttpOnly server-side (el browser no puede hacerlo con JS)
  await fetch("/api/auth/logout", { method: "POST" })
  logout()
  localStorage.removeItem("activeProfileId")
  localStorage.removeItem("userId")
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
          {(profiles ?? []).map((profile: Profile) => (
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
                style={{ backgroundColor: `color-mix(in oklch, blue 15%, transparent)` }} // en vez de red, ${profile.avatarUrl}
              >
                <span
                  className="text-xl font-bold"
                  style={{ color: "red" /*profile.avatarUrl*/ }}
                >
                  {profile.name}
                </span>

                {/* Delete button in managing mode */}
                {managing && profiles.length > 1 && (
                  <button
                    onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteProfile(profile)
                  }}
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-transform hover:scale-110"
                    aria-label={`Eliminar perfil ${profile.name}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
              <div className="text-center">
                <span className="block text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {profile.name}
                </span>
                {profile.goal ? (
                  <span className="block text-[11px] text-muted-foreground/70">
                    {profile.goal}
                  </span>
                ) : null}
              </div>
            </button>
          ))}

          {/* Add Profile Button */}
          {(profiles ?? []).length < 5 && !addingNew && (
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
          <div className="mt-8 mx-auto max-w-sm space-y-3">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddProfile()
                if (e.key === "Escape") {
                  setAddingNew(false)
                  setNewName("")
                  setNewGoal("")
                }
              }}
              placeholder="Nombre del perfil"
              className="h-10 rounded-xl border-border bg-card text-foreground"
              maxLength={20}
            />

            <select
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none"
            >
              <option value="">Seleccionar objetivo</option>
              {PROFILE_GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-center gap-2">
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
                onClick={() => {
                  setAddingNew(false)
                  setNewName("")
                  setNewGoal("")
                }}
                className="size-10 rounded-xl"
                aria-label="Cancelar"
              >
                <X className="size-4" />
              </Button>
            </div>
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
