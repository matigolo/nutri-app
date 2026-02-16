"use client"

import { useState, useMemo, useCallback } from "react"
import { useProfiles, useMeals } from "@/lib/app-context"
import { calculateMacrosFromCatalog, calculateMealTotals, formatDate } from "@/lib/nutrition-helpers"
import { foodCatalog } from "@/lib/mock-data"
import { FoodSearchAdd } from "@/components/food-search-add"
import { MealItemsList } from "@/components/meal-items-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MealItem, MealEntry, FoodItem } from "@/lib/types"

const MEAL_TYPES: { value: MealEntry["type"]; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "merienda", label: "Merienda" },
  { value: "cena", label: "Cena" },
]

interface AddMealDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: string
}

export function AddMealDrawer({ open, onOpenChange, selectedDate }: AddMealDrawerProps) {
  const { activeProfile } = useProfiles()
  const { addMeal } = useMeals()

  const [date, setDate] = useState(selectedDate)
  const [mealType, setMealType] = useState<MealEntry["type"] | null>(null)
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<MealItem[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Sync date when drawer opens with new selectedDate
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

  const handleSelectFood = useCallback((food: FoodItem) => {
    const macros = calculateMacrosFromCatalog(food, 100, "gramos")
    const newItem: MealItem = {
      id: `mi-${Date.now()}-${Math.random()}`,
      foodId: food.id,
      customName: food.name,
      quantity: 100,
      unit: "gramos",
      macros,
      advancedOpen: false,
    }
    setItems((prev) => [...prev, newItem])
  }, [])

  const handleAddManual = useCallback(() => {
    const newItem: MealItem = {
      id: `mi-${Date.now()}-${Math.random()}`,
      foodId: null,
      customName: "",
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
        const updated = { ...item, ...updates }
        if (item.foodId && (updates.quantity !== undefined || updates.unit !== undefined)) {
          const food = foodCatalog.find((f) => f.id === item.foodId)
          if (food) {
            updated.macros = calculateMacrosFromCatalog(
              food,
              updates.quantity ?? item.quantity,
              updates.unit ?? item.unit
            )
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
      if (!item.foodId && !item.customName.trim()) errs.push(`Alimento ${idx + 1}: ingresa un nombre`)
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

    // TODO: POST /api/meals
    await new Promise((r) => setTimeout(r, 300))
    addMeal(meal)
    setSaving(false)
    handleOpenChange(false)
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
              <X className="size-5" />
            </button>
          </div>
          <SheetDescription className="sr-only">
            Formulario para agregar una comida al dia seleccionado
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(85dvh-140px)] px-5 py-4">
          <div className="flex flex-col gap-5 pb-4">
            {/* Date & Time */}
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Fecha</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-foreground [color-scheme:dark]"
                />
              </div>
              <div className="flex w-28 flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Hora (opc.)</label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-foreground [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Meal Type */}
            <div>
              <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
                Tipo de comida
              </label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setMealType(t.value); setErrors([]) }}
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

            {/* Food Search */}
            <div>
              <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
                Buscar alimento
              </label>
              <FoodSearchAdd onSelectFood={handleSelectFood} onAddManual={handleAddManual} />
            </div>

            {/* Items */}
            <MealItemsList items={items} onUpdateItem={handleUpdateItem} onRemoveItem={handleRemoveItem} />

            {/* Notes */}
            <div>
              <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Comi rapido, no tenia mucha hambre..."
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/50"
              />
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err}</p>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Sticky Footer */}
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
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">{m.value}</span>
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
