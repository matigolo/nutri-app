import type {
  ActiveProfileToolResult,
  FavoriteRecipesToolResult,
  TodayMealsToolResult,
  NutritionSummaryToolResult,
} from "@/lib/assistant/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"  //Este archivo es mi backend de la API de IA con sus "endpoints"

function buildHeaders(token: string, profileId: string) {
  return {
    Authorization: `Bearer ${token}`,
    "X-Profile-Id": profileId,
    "Content-Type": "application/json",
  }
}

export async function getActiveProfileTool(params: {
  token: string
  profileId: string
}): Promise<ActiveProfileToolResult> {
  const { token, profileId } = params

  const res = await fetch(`${API_BASE}/profiles`, {
    method: "GET",
    headers: buildHeaders(token, profileId),
    cache: "no-store",
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "No se pudo obtener el perfil activo")
  }

  const profiles = Array.isArray(data.profiles) ? data.profiles : []
  const activeProfile = profiles.find((p: any) => String(p.id) === String(profileId))

  if (!activeProfile) {
    throw new Error("No se encontró el perfil activo")
  }

  return {
    id: String(activeProfile.id),
    name: activeProfile.name,
    goal: activeProfile.goal ?? null,
    avatarUrl: activeProfile.avatarUrl ?? null,
  }
}

export async function getFavoriteRecipesTool(params: {
  token: string
  profileId: string
}): Promise<FavoriteRecipesToolResult> {
  const { token, profileId } = params

  const res = await fetch(`${API_BASE}/recipes/favorites`, {
    method: "GET",
    headers: buildHeaders(token, profileId),
    cache: "no-store",
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "No se pudieron obtener las recetas favoritas")
  }

  const recipes = Array.isArray(data.recipes) ? data.recipes : []

  return {
    recipes: recipes.map((recipe: any) => ({
      id: String(recipe.id),
      title: recipe.title,
      description: recipe.description ?? null,
      timeMinutes: recipe.timeMinutes ?? null,
      calories: recipe.calories ?? null,
      isFavorite: true as const,
    })),
  }
}

export async function getTodayMealsTool(params: {
  token: string
  profileId: string
}): Promise<TodayMealsToolResult> {
  const { token, profileId } = params

  const res = await fetch(`${API_BASE}/meals`, {
    method: "GET",
    headers: buildHeaders(token, profileId),
    cache: "no-store",
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "No se pudieron obtener las comidas")
  }

  const meals = Array.isArray(data.meals) ? data.meals : []

  const today = new Date().toISOString().slice(0, 10)

  const todayMeals = meals.filter((meal: any) => {
    const mealDate = typeof meal.date === "string" ? meal.date.slice(0, 10) : ""
    return mealDate === today
  })

  return {
    date: today,
    meals: todayMeals.map((meal: any) => ({
      id: String(meal.id),
      title: meal.title ?? "Comida",
      type: meal.type ?? "meal",
      date: meal.date,
      calories: meal.calories ?? null,
      protein: meal.protein ?? null,
      carbs: meal.carbs ?? null,
      fat: meal.fat ?? null,
    })),
  }
}

export async function getNutritionSummaryTool(params: {
  token: string
  profileId: string
}): Promise<NutritionSummaryToolResult> {
  const todayMeals = await getTodayMealsTool(params)

  const totals = todayMeals.meals.reduce(
    (acc, meal) => {
      acc.totalCalories += meal.calories ?? 0
      acc.totalProtein += meal.protein ?? 0
      acc.totalCarbs += meal.carbs ?? 0
      acc.totalFat += meal.fat ?? 0
      return acc
    },
    {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    }
  )

  return {
    date: todayMeals.date,
    totalCalories: totals.totalCalories,
    totalProtein: totals.totalProtein,
    totalCarbs: totals.totalCarbs,
    totalFat: totals.totalFat,
    mealsCount: todayMeals.meals.length,
  }
}