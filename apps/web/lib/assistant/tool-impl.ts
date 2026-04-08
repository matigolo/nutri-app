import type {
  ActiveProfileToolResult,
  FavoriteRecipesToolResult,
  TodayMealsToolResult,
  NutritionSummaryToolResult,
} from "@/lib/assistant/types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"

function buildHeaders(token: string, profileId: string) {
  return {
    Authorization: `Bearer ${token}`,
    "X-Profile-Id": profileId,
    "Content-Type": "application/json",
  }
}

function getTodayLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
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

  const text = await res.text()
  let data: any = {}

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }

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

  const text = await res.text()
  let data: any = {}

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }

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

  const text = await res.text()
  let data: any = {}

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    throw new Error(data.error || "No se pudieron obtener las comidas")
  }

  const meals = Array.isArray(data.meals) ? data.meals : []
  const today = getTodayLocalDateString()

  const todayMeals = meals.filter((meal: any) => {
    const raw = typeof meal.mealDate === "string" ? meal.mealDate : ""
    const mealDate = raw ? raw.slice(0, 10) : ""
    return mealDate === today
  })

  return {
    date: today,
    meals: todayMeals.map((meal: any) => {
      const items = Array.isArray(meal.items) ? meal.items : []

      const totals = items.reduce(
        (acc: any, item: any) => {
          acc.calories += Number(item.calories ?? 0)
          acc.protein += Number(item.protein ?? 0)
          acc.carbs += Number(item.carbs ?? 0)
          acc.fat += Number(item.fat ?? 0)
          return acc
        },
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      )

      return {
        id: String(meal.id),
        title:
          meal.notes?.trim() ||
          `Comida ${meal.mealType ?? ""}`.trim() ||
          "Comida",
        type: meal.mealType ?? "meal",
        date: meal.mealDate,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      }
    }),
  }
}

export async function getNutritionSummaryTool(params: {
  token: string
  profileId: string
}): Promise<NutritionSummaryToolResult> {
  const todayMeals = await getTodayMealsTool(params)

  const totals = todayMeals.meals.reduce(
    (acc, meal) => {
      acc.totalCalories += Number(meal.calories ?? 0)
      acc.totalProtein += Number(meal.protein ?? 0)
      acc.totalCarbs += Number(meal.carbs ?? 0)
      acc.totalFat += Number(meal.fat ?? 0)
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