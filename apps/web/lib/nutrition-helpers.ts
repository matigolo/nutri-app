import type { FoodItem, MealItem, MealEntry } from "./types"

export function calculateMacrosFromCatalog(
  food: FoodItem,
  quantity: number,
  unit: MealItem["unit"]
): MealItem["macros"] {
  let grams = quantity
  if (unit === "porcion") grams = quantity * 100
  else if (unit === "unidad") grams = quantity * 50
  else if (unit === "ml") grams = quantity

  const factor = grams / 100
  return {
    kcal: Math.round(food.kcalPer100g * factor),
    protein: Math.round(food.proteinPer100g * factor * 10) / 10,
    carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
    fat: Math.round(food.fatPer100g * factor * 10) / 10,
  }
}

export function calculateMealTotals(items: MealItem[]): MealItem["macros"] {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.macros.kcal,
      protein: acc.protein + item.macros.protein,
      carbs: acc.carbs + item.macros.carbs,
      fat: acc.fat + item.macros.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

export function calculateDayTotals(meals: MealEntry[]): MealItem["macros"] {
  return meals.reduce(
    (acc, meal) => {
      const mealTotals = calculateMealTotals(meal.items)
      return {
        kcal: acc.kcal + mealTotals.kcal,
        protein: acc.protein + mealTotals.protein,
        carbs: acc.carbs + mealTotals.carbs,
        fat: acc.fat + mealTotals.fat,
      }
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function getMealTypeLabel(type: MealEntry["type"]): string {
  const labels: Record<MealEntry["type"], string> = {
    desayuno: "Desayuno",
    almuerzo: "Almuerzo",
    merienda: "Merienda",
    cena: "Cena",
  }
  return labels[type]
}

export function getMealTypeIcon(type: MealEntry["type"]): string {
  const icons: Record<MealEntry["type"], string> = {
    desayuno: "sunrise",
    almuerzo: "sun",
    merienda: "coffee",
    cena: "moon",
  }
  return icons[type]
}
