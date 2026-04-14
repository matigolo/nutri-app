"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useProfiles, useMeals, useUI } from "@/lib/app-context"
import { calculateMealTotals } from "@/lib/nutrition-helpers"
import { FoodSearchAdd } from "@/components/food-search-add"
import { MealItemsList } from "@/components/meal-items-list"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MealEntry, MealItem, FoodSearchItem } from "@/lib/types"

const MEAL_TYPES: { value: MealEntry["type"]; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "merienda", label: "Merienda" },
  { value: "cena", label: "Cena" },
]

interface AddMealDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddMealDrawer({
  open,
  onOpenChange,
}: AddMealDrawerProps) {
  const { activeProfile } = useProfiles()
  const { addMeal } = useMeals()
  const { selectedDate } = useUI()

  const [date, setDate] = useState(selectedDate)
  const [mealType, setMealType] = useState<MealEntry["type"] | null>(null)
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<MealItem[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(selectedDate)
    setMealType(null)
    setTime("")
    setNotes("")
    setItems([])
    setErrors([])
    setSaving(false)
  }, [open, selectedDate])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setDate(selectedDate)
        setMealType(null)
        setTime("")
        setNotes("")
        setItems([])
        setErrors([])
        setSaving(false)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, selectedDate]
  )

  const totals = useMemo(() => calculateMealTotals(items), [items])

  const handleSelectFood = useCallback((food: FoodSearchItem) => {
    const newItem: MealItem = {
      id: `mi-${Date.now()}-${Math.random()}`,
      name: food.description,
      quantity: 100,
      unit: "gramos",
      macros: {
        kcal: food.calories ?? 0,
        protein: food.protein ?? 0,
        carbs: food.carbs ?? 0,
        fat: food.fat ?? 0,
      },
      referenceMacros: {
        kcal: food.calories ?? 0,
        protein: food.protein ?? 0,
        carbs: food.carbs ?? 0,
        fat: food.fat ?? 0,
      },
      advancedOpen: false,
    }

    setItems((prev) => [...prev, newItem])
  }, [])

  const handleAddManual = useCallback(() => {
    const newItem: MealItem = {
      id: `mi-${Date.now()}-${Math.random()}`,
      name: "",
      quantity: 0,
      unit: "gramos",
      macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      advancedOpen: true,
    }
    setItems((prev) => [...prev, newItem])
  }, [])

  const handleUpdateItem = useCallback((id: string, updates: Partial<MealItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item

        // Al cambiar la unidad a porcion/unidad, resetear cantidad a 1
        const newUnit = updates.unit ?? item.unit
        const unitChanged = updates.unit !== undefined && updates.unit !== item.unit
        if (unitChanged && updates.quantity === undefined) {
          if (newUnit === "porcion" || newUnit === "unidad") {
            updates = { ...updates, quantity: 1 }
          } else if ((item.unit === "porcion" || item.unit === "unidad") && (newUnit === "gramos" || newUnit === "ml")) {
            updates = { ...updates, quantity: 100 }
          }
        }

        const updated = { ...item, ...updates }

        if (
          item.referenceMacros &&
          (updates.quantity !== undefined || updates.unit !== undefined)
        ) {
          let grams = updates.quantity ?? item.quantity

          if ((updates.unit ?? item.unit) === "porcion") {
            grams = (updates.quantity ?? item.quantity) * 100
          } else if ((updates.unit ?? item.unit) === "unidad") {
            grams = (updates.quantity ?? item.quantity) * 50
          } else if ((updates.unit ?? item.unit) === "ml") {
            grams = updates.quantity ?? item.quantity
          }

          const factor = grams / 100

          updated.macros = {
            kcal: Math.round(item.referenceMacros.kcal * factor),
            protein: Math.round(item.referenceMacros.protein * factor * 10) / 10,
            carbs: Math.round(item.referenceMacros.carbs * factor * 10) / 10,
            fat: Math.round(item.referenceMacros.fat * factor * 10) / 10,
          }
        }

        return updated
      })
    )
  }, [])

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  function validate(): string[] {
    const errs: string[] = []
    if (!mealType) errs.push("Selecciona un tipo de comida")
    if (items.length === 0) errs.push("Agrega al menos un alimento")

    items.forEach((item, idx) => {
      if (item.quantity <= 0) errs.push(`Alimento ${idx + 1}: cantidad > 0`)
      if (!item.name?.trim()) errs.push(`Alimento ${idx + 1}: ingresa un nombre`)
    })

    return errs
  }

  async function handleSave() {
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    if (!activeProfile || !mealType) return

    setSaving(true)
    setErrors([])

    const meal: MealEntry = {
      id: `meal-${Date.now()}`,
      profileId: activeProfile.id,
      date,
      type: mealType,
      time: time || undefined,
      notes: notes || undefined,
      items,
    }

    try {
      const ok = await addMeal(meal)

      if (!ok) {
        setErrors(["No se pudo guardar la comida"])
        return
      }

      setSaving(false)
      handleOpenChange(false)
    } catch (error) {
      console.error(error)
      setErrors(["Ocurrió un error al guardar la comida"])
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto h-[85dvh] max-w-lg rounded-t-2xl border-border bg-background p-0"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold text-foreground">
              Agregar comida
            </SheetTitle>
            <button
              onClick={() => handleOpenChange(false)}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cerrar"
            >
            </button>
          </div>
          <SheetDescription className="sr-only">
            Formulario para agregar una comida al día seleccionado
          </SheetDescription>
        </SheetHeader>

        <div className="h-[calc(85dvh-140px)] overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-5 pb-4">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Fecha
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-foreground [color-scheme:dark]"
                />
              </div>
              <div className="flex w-28 flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Hora (opc.)
                </label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-foreground [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
                Tipo de comida
              </label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setMealType(t.value)
                      setErrors([])
                    }}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-medium transition-all",
                      mealType === t.value
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
                Buscar alimento
              </label>
              <FoodSearchAdd
                onSelectFood={handleSelectFood}
                onAddManual={handleAddManual}
              />
            </div>

            <MealItemsList
              items={items}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
            />

            <div>
              <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Comí rápido, no tenía mucha hambre..."
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/50"
              />
            </div>

            {errors.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {[
                { label: "Kcal", value: totals.kcal },
                { label: "P", value: `${totals.protein.toFixed(1)}g` },
                { label: "C", value: `${totals.carbs.toFixed(1)}g` },
                { label: "G", value: `${totals.fat.toFixed(1)}g` },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">
                    {m.label}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {m.value}
                  </span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-10 rounded-xl bg-foreground px-6 text-background font-semibold hover:bg-foreground/90"
            >
              {saving ? (
                <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                <>
                  <Check className="mr-1.5 size-4" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}