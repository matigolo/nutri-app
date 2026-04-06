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