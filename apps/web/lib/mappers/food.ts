import type { FoodItem } from "@/lib/types"
import type { FoodSearchItem } from "@/lib/hooks/useFoodSearch"

function toFoodItem(f: FoodSearchItem): FoodItem {
  return {
    // identificadores
    id: String(f.fdcId),          // o number si tu FoodItem usa number

    // campos de display
    name: f.description,
    brand: f.brandName ?? undefined,

    // base/unidad (poné lo que use tu app)
    unitBase: "g",

    // nutrición (USDA "Energy" no siempre es por 100g; por ahora lo tratamos como aproximación)
    kcalPer100g: f.calories ?? 0,

    proteinPer100g: f.protein ?? 0,
    carbsPer100g: f.carbs ?? 0,
    fatPer100g: f.fat ?? 0,
  }
}
