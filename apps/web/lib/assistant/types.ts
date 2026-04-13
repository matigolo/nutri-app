export type AssistantMessage = {
  role: "user" | "assistant"
  content: string
}

export type AssistantRequest =
  | {
      message: string
      messages?: never
    }
  | {
      message?: never
      messages: AssistantMessage[]
    }

export type AssistantResponse = {
  reply: string
  usedTools: string[]
  isNutritionRelated: boolean
}

export type ActiveProfileToolResult = {
  id: string
  name: string
  goal: string | null
  avatarUrl: string | null
}

export type FavoriteRecipeToolItem = {
  id: string
  title: string
  description: string | null
  timeMinutes: number | null
  calories: number | null
  isFavorite: true
}

export type FavoriteRecipesToolResult = {
  recipes: FavoriteRecipeToolItem[]
}

export type TodayMealToolItem = {
  id: string
  title: string
  type: string
  date: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export type TodayMealsToolResult = {
  date: string
  meals: TodayMealToolItem[]
}

export type NutritionSummaryToolResult = {
  date: string
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  mealsCount: number
}

// V2: resumen de la semana agrupado por día
export type WeeklyDaySummary = {
  date: string          // "2026-04-13"
  dayName: string       // "domingo"
  mealsCount: number
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  hasData: boolean      // false si no hubo comidas ese día
}

export type WeeklySummaryToolResult = {
  weekStart: string         // primer día del rango
  weekEnd: string           // último día (hoy)
  days: WeeklyDaySummary[]  // 7 días, más reciente al final
  daysWithData: number      // cuántos días tuvieron al menos 1 comida
  avgCalories: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
}