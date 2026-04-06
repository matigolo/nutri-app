export interface Profile {
  id: string
  userId: string
  name: string
  goal: string | null
  avatarUrl: string,
  createdAt: Date
}

export interface Account {
  id: string
  email: string
  name: string
  profiles: Profile[]
}

export type FoodSearchItem = {
  fdcId: number
  description: string
  brandName: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export type MealItem = {
  id: string
  name: string
  quantity: number
  unit: "gramos" | "ml" | "porcion" | "unidad"
  macros: {
    kcal: number
    protein: number
    carbs: number
    fat: number
  }
  referenceMacros?: {
    kcal: number
    protein: number
    carbs: number
    fat: number
  }
  advancedOpen?: boolean
}

export interface MealEntry {
  id: string
  profileId: string
  date: string
  type: "desayuno" | "almuerzo" | "merienda" | "cena"
  time?: string
  notes?: string
  items: MealItem[]
}

export interface WeightRecord {
  id: string
  profileId: string
  date: string
  weight: number
}

export interface Recipe {
  id: string
  title: string
  description: string
  imageUrl: string
  prepTime: number
  calories: number
  protein: number
  carbs: number
  fat: number
  servings: number
  ingredients: string[]
  instructions: string[]
  tags: string[]
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}
//ApiRecipe es el tipo que uso en todo momento y el que tiene la misma forma que en el back
export interface ApiRecipe {
  id: string
  title: string
  description: string | null
  ingredients: string[]
  steps: string[]
  timeMinutes: number | null
  calories: number | null
  imageUrl: string | null
  createdAt: string
  author: {
    id: string
    name: string
  }
  isFavorite: boolean
}

export interface CreateRecipeInput {
  title: string
  description?: string
  ingredients: string[]
  steps: string[]
  timeMinutes?: number | null
  calories?: number | null
  imageUrl?: string
}

export interface CreatedRecipeResponse {
  recipe: {
    id: string
    title: string
    description: string | null
    ingredients: string[]
    steps: string[]
    timeMinutes: number | null
    calories: number | null
    imageUrl: string | null
    createdAt: string
    profileId: string
  }
}
export interface ApiRecipesResponse {
  recipes: ApiRecipe[]
}

export interface ApiRecipeDetailResponse {
  recipe: ApiRecipe
}

export type MealType = MealEntry["type"]
export type FoodUnit = MealItem["unit"]
