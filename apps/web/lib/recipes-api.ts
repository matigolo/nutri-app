import { apiFetch } from "@/lib/api"
import type {
  ApiRecipe,
  ApiRecipesResponse,
  ApiRecipeDetailResponse,
  CreateRecipeInput,
  CreatedRecipeResponse
  
} from "@/lib/types"

const API_BASE = "http://localhost:4000"
//EN ESTE ARCHIVO SE ENCUENTRAN FUNCIONE SQUE ACTIVAN LOS ENDPOINTS DE RECETAS(RECIPES)
export async function getRecipes(search = ""): Promise<ApiRecipe[]> {
  const query = search.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : ""

  const res = await apiFetch(`${API_BASE}/recipes${query}`)

  const data: ApiRecipesResponse = await res.json()

  if (!res.ok) {
    throw new Error((data as any).error || "Error obteniendo recetas")
  }

  return data.recipes
}

export async function getFavoriteRecipes(): Promise<ApiRecipe[]> {
  const res = await apiFetch(`${API_BASE}/recipes/favorites`)

  const data: ApiRecipesResponse = await res.json()

  if (!res.ok) {
    throw new Error((data as any).error || "Error obteniendo favoritas")
  }

  return data.recipes
}

export async function getRecipeById(recipeId: string): Promise<ApiRecipe> {
  const res = await apiFetch(`${API_BASE}/recipes/${recipeId}`)

  const data: ApiRecipeDetailResponse = await res.json()

  if (!res.ok) {
    throw new Error((data as any).error || "Error obteniendo receta")
  }

  return data.recipe
}

export async function addRecipeToFavorites(recipeId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/recipes/${recipeId}/favorite`, {
    method: "POST",
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Error agregando favorita")
  }
}

export async function removeRecipeFromFavorites(recipeId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/recipes/${recipeId}/favorite`, {
    method: "DELETE",
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Error eliminando favorita")
  }
}

export async function createRecipe(input: CreateRecipeInput) {
  const res = await apiFetch("http://localhost:4000/recipes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  const text = await res.text()
  let data: any = {}

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    console.error("POST /recipes status:", res.status)
    console.error("POST /recipes raw response:", text)
    console.error("POST /recipes parsed response:", data)
    throw new Error(data.error || `Error creando receta (${res.status})`)
  }

  return data.recipe
}