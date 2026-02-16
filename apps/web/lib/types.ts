export interface Profile {
  id: string
  name: string
  avatarColor: string
  initials: string
  createdAt: string
}

export interface Account {
  id: string
  email: string
  name: string
  profiles: Profile[]
}

export interface FoodItem {
  id: string
  name: string
  brand?: string
  unitBase: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

export interface MealItem {
  id: string
  foodId: string | null
  customName: string
  quantity: number
  unit: "gramos" | "ml" | "porcion" | "unidad"
  macros: {
    kcal: number
    protein: number
    carbs: number
    fat: number
  }
  advancedOpen: boolean
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

export type MealType = MealEntry["type"]
export type FoodUnit = MealItem["unit"]
