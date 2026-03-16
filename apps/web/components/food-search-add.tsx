"use client"

import { useState, useMemo, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"
import { foodCatalog } from "@/lib/mock-data"
import { useMeals } from "@/lib/app-context"
import { cn } from "@/lib/utils"
import type { FoodItem } from "@/lib/types"

import { useFoodSearch, type FoodSearchItem } from "@/lib/hooks/useFoodSearch"

interface FoodSearchAddProps {
  onSelectFood: (food: FoodItem) => void
  onAddManual: () => void
}

// ✅ Adapter: FoodSearchItem (API) -> FoodItem (tu app)
function toFoodItem(f: FoodSearchItem): FoodItem {
  return {
    // OJO: ajustá si tu FoodItem usa number en vez de string para id
    id: String(f.fdcId),
    name: f.description,

    // Estos campos existen en tu FoodItem según el error.
    // Les ponemos defaults razonables para que compile.
    unitBase: "g",
    kcalPer100g: f.calories ?? 0,

    // Campos extra típicos (si en tu FoodItem se llaman distinto, avisame y lo adapto)
    proteinPer100g: f.protein ?? 0,
    carbsPer100g: f.carbs ?? 0,
    fatPer100g: f.fat ?? 0,

    // opcionales
    brand: f.brandName ?? undefined,
    fdcId: f.fdcId,
  } as unknown as FoodItem
  // 👆 El "as unknown as FoodItem" es para no trabarnos si tu FoodItem tiene
  // más propiedades obligatorias con otros nombres. Si me pegás el type FoodItem
  // completo, lo dejamos 100% tipado sin casts.
}

export function FoodSearchAdd({ onSelectFood, onAddManual }: FoodSearchAddProps) {
  const { recentFoodIds } = useMeals()
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)

  const recentFoods = useMemo(
    () =>
      recentFoodIds
        .map((id) => foodCatalog.find((f) => f.id === id))
        .filter(Boolean) as FoodItem[],
    [recentFoodIds]
  )

  // ✅ resultados de la API
  const { results, loading, error } = useFoodSearch(query)

  // ✅ para los recientes (ya FoodItem)
  const handleSelectFoodItem = useCallback(
    (food: FoodItem) => {
      onSelectFood(food)
      setQuery("")
      setFocused(false)
    },
    [onSelectFood]
  )

  // ✅ para los resultados de la API (FoodSearchItem)
  const handleSelectSearchItem = useCallback(
    (food: FoodSearchItem) => {
      onSelectFood(toFoodItem(food))
      setQuery("")
      setFocused(false)
    },
    [onSelectFood]
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Buscar alimento..."
          className="h-11 rounded-xl border-border bg-card pl-10 pr-9 text-foreground placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              setFocused(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar busqueda"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Recent Foods */}
      {!query && recentFoods.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Recientes</span>
          <div className="flex flex-wrap gap-1.5">
            {recentFoods.map((food) => (
              <Badge
                key={food.id}
                variant="secondary"
                className="cursor-pointer rounded-lg px-2.5 py-1 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                onClick={() => handleSelectFoodItem(food)}
              >
                {food.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Estado de búsqueda */}
      {query && loading && (
        <div className="rounded-xl border border-border py-4 text-center">
          <p className="text-sm text-muted-foreground">Buscando…</p>
        </div>
      )}

      {query && !loading && error && (
        <div className="rounded-xl border border-border py-4 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {query && !loading && !error && results.length > 0 && (
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          {results.map((food, idx) => (
            <button
              key={food.fdcId}
              onClick={() => handleSelectSearchItem(food)}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-secondary",
                idx > 0 && "border-t border-border"
              )}
            >
              <div>
                <p className="text-sm text-foreground">{food.description}</p>
                {food.brandName && <p className="text-[11px] text-muted-foreground">{food.brandName}</p>}
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {food.calories ?? "—"} kcal
              </span>
            </button>
          ))}
        </div>
      )}

      {query && !loading && !error && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-4 text-center">
          <p className="text-sm text-muted-foreground">Sin resultados</p>
        </div>
      )}

      {/* Add Manual Button */}
      <button
        onClick={onAddManual}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
      >
        Agregar alimento manualmente
      </button>
    </div>
  )
}
