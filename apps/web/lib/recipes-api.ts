import { apiFetch } from "@/lib/api"
import type {
  ApiRecipe,
  ApiRecipesResponse,
  ApiRecipeDetailResponse,
} from "@/lib/types"

const API_BASE = "http://localhost:4000"

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