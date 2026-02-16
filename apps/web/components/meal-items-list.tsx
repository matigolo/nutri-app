"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MealItem, FoodUnit } from "@/lib/types"

interface MealItemsListProps {
  items: MealItem[]
  onUpdateItem: (id: string, updates: Partial<MealItem>) => void
  onRemoveItem: (id: string) => void
}

const UNITS: { value: FoodUnit; label: string }[] = [
  { value: "gramos", label: "g" },
  { value: "ml", label: "ml" },
  { value: "porcion", label: "porcion" },
  { value: "unidad", label: "unidad" },
]

export function MealItemsList({ items, onUpdateItem, onRemoveItem }: MealItemsListProps) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">
        Alimentos agregados ({items.length})
      </span>

      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-border bg-card p-3"
        >
          {/* Item Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {item.foodId ? (
                <p className="text-sm font-medium text-foreground">{item.customName}</p>
              ) : (
                <Input
                  value={item.customName}
                  onChange={(e) => onUpdateItem(item.id, { customName: e.target.value })}
                  placeholder="Nombre del alimento"
                  className="h-8 rounded-lg border-border bg-transparent text-sm text-foreground"
                />
              )}
            </div>
            <button
              onClick={() => onRemoveItem(item.id)}
              className="rounded-lg p-1 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Eliminar alimento"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          {/* Quantity & Unit */}
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              value={item.quantity || ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                onUpdateItem(item.id, { quantity: isNaN(val) ? 0 : val })
              }}
              placeholder="Cantidad"
              min="0"
              className="h-9 w-24 rounded-lg border-border bg-secondary/50 text-center text-sm tabular-nums text-foreground"
            />
            <div className="flex gap-1">
              {UNITS.map((u) => (
                <button
                  key={u.value}
                  onClick={() => onUpdateItem(item.id, { unit: u.value })}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                    item.unit === u.value
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Macros (auto-calculated or manual) */}
          <div className="mt-2">
            <button
              onClick={() => onUpdateItem(item.id, { advancedOpen: !item.advancedOpen })}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.advancedOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              Opciones avanzadas
            </button>

            {item.advancedOpen && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {(["kcal", "protein", "carbs", "fat"] as const).map((key) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[10px] text-muted-foreground">
                      {key === "kcal" ? "Kcal" : key === "protein" ? "Prot" : key === "carbs" ? "Carbs" : "Grasa"}
                    </label>
                    <Input
                      type="number"
                      value={item.macros[key] || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        onUpdateItem(item.id, {
                          macros: { ...item.macros, [key]: isNaN(val) ? 0 : val },
                        })
                      }}
                      min="0"
                      className="h-8 rounded-lg border-border bg-secondary/50 text-center text-xs tabular-nums text-foreground"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Macro Display */}
          {!item.advancedOpen && item.macros.kcal > 0 && (
            <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
              {item.macros.kcal} kcal | {item.macros.protein}g prot | {item.macros.carbs}g carbs | {item.macros.fat}g grasa
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
