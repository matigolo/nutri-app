"use client"

import { useMemo } from "react"
import { useMeals, useWeights } from "@/lib/app-context"
import { calculateMealTotals, calculateDayTotals, getMealTypeLabel } from "@/lib/nutrition-helpers"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Coffee, Sun, CupSoda, Moon, Trash2, X, Clock, Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MealEntry } from "@/lib/types"

const MEAL_ICONS: Record<MealEntry["type"], typeof Coffee> = {
  desayuno: Coffee,
  almuerzo: Sun,
  merienda: CupSoda,
  cena: Moon,
}

const MEAL_ORDER: MealEntry["type"][] = ["desayuno", "almuerzo", "merienda", "cena"]

interface DayDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: string
  onAddMeal: () => void
}

export function DayDetailDrawer({ open, onOpenChange, selectedDate, onAddMeal }: DayDetailDrawerProps) {
  const { getMealsByDate, removeMeal } = useMeals()
  const { getWeightByDate } = useWeights()

  const dayMeals = getMealsByDate(selectedDate)
  const dayWeight = getWeightByDate(selectedDate)
  const dayTotals = useMemo(() => calculateDayTotals(dayMeals), [dayMeals])

  const selectedDateObj = new Date(selectedDate + "T12:00:00")
  const dayLabel = selectedDateObj.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  // Sort meals: group by type in order, within each type sort by time
  const sortedGroupedMeals = useMemo(() => {
    const groups: { type: MealEntry["type"]; meals: MealEntry[] }[] = []
    for (const type of MEAL_ORDER) {
      const mealsOfType = dayMeals
        .filter((m) => m.type === type)
        .sort((a, b) => {
          if (a.time && b.time) return a.time.localeCompare(b.time)
          if (a.time) return -1
          if (b.time) return 1
          return 0
        })
      if (mealsOfType.length > 0) {
        groups.push({ type, meals: mealsOfType })
      }
    }
    return groups
  }, [dayMeals])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto h-[75dvh] max-w-lg rounded-t-2xl border-border bg-background p-0"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-bold capitalize text-foreground">
                {dayLabel}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {dayMeals.length > 0
                  ? `${dayMeals.length} comida${dayMeals.length > 1 ? "s" : ""} registrada${dayMeals.length > 1 ? "s" : ""}`
                  : "Sin comidas registradas"}
              </SheetDescription>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(75dvh-160px)] px-5 py-4">
          <div className="flex flex-col gap-4 pb-4">
            {/* Weight */}
            {dayWeight && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-secondary">
                  <Scale className="size-3.5 text-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Peso</p>
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {dayWeight.weight.toFixed(1)} kg
                  </p>
                </div>
              </div>
            )}

            {/* Meals grouped by type, sorted by time */}
            {sortedGroupedMeals.length > 0 ? (
              sortedGroupedMeals.map(({ type, meals }) => {
                const Icon = MEAL_ICONS[type]
                return (
                  <div key={type}>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        {getMealTypeLabel(type)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {meals.map((meal) => {
                        const totals = calculateMealTotals(meal.items)
                        return (
                          <div
                            key={meal.id}
                            className="rounded-xl border border-border bg-card p-3"
                          >
                            {/* Time badge */}
                            {meal.time && (
                              <div className="mb-2 flex items-center gap-1 text-muted-foreground">
                                <Clock className="size-3" />
                                <span className="text-[10px] tabular-nums">{meal.time}</span>
                              </div>
                            )}

                            {/* Items */}
                            <div className="flex flex-col gap-1.5">
                              {meal.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm text-foreground">
                                      {item.customName || item.foodId}
                                    </p>
                                    <p className="text-[10px] tabular-nums text-muted-foreground">
                                      {item.quantity}{item.unit === "gramos" ? "g" : item.unit === "ml" ? "ml" : ` ${item.unit}`}
                                      {" - "}
                                      {item.macros.kcal} kcal | P: {item.macros.protein}g | C: {item.macros.carbs}g | G: {item.macros.fat}g
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Meal footer */}
                            <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2">
                              <p className="text-[11px] font-medium tabular-nums text-foreground">
                                Total: {totals.kcal} kcal
                              </p>
                              <button
                                onClick={() => removeMeal(meal.id)}
                                className="rounded-lg p-1 text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Eliminar comida"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>

                            {/* Notes */}
                            {meal.notes && (
                              <p className="mt-1.5 text-[10px] italic text-muted-foreground">
                                {meal.notes}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed border-border py-10 text-center">
                <p className="text-sm text-muted-foreground">Sin comidas registradas</p>
                <button
                  onClick={onAddMeal}
                  className="mt-2 text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
                >
                  Agregar comida
                </button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer: Macro Summary + Add button */}
        <div className="border-t border-border bg-background px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {[
                { label: "Kcal", value: dayTotals.kcal },
                { label: "P", value: `${dayTotals.protein.toFixed(1)}g` },
                { label: "C", value: `${dayTotals.carbs.toFixed(1)}g` },
                { label: "G", value: `${dayTotals.fat.toFixed(1)}g` },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  <span className={cn(
                    "text-xs font-bold tabular-nums",
                    m.label === "Kcal" ? "text-foreground" : "text-foreground/70"
                  )}>{m.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={onAddMeal}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              + Agregar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
