"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, X, ArrowLeft, Heart, Clock, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiRecipe } from "@/lib/types"
import { RecipeCard } from "@/components/recipe-card"
import {
  getRecipes,
  getFavoriteRecipes,
  getRecipeById,
  addRecipeToFavorites,
  removeRecipeFromFavorites,
} from "@/lib/recipes-api"
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer"

export default function RecipesPage() {
  const [search, setSearch] = useState("")
  const [recipes, setRecipes] = useState<ApiRecipe[]>([])
  const [favoriteRecipes, setFavoriteRecipes] = useState<ApiRecipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<ApiRecipe | null>(null)

  const [loadingRecipes, setLoadingRecipes] = useState(true)
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null)

  const [recipesError, setRecipesError] = useState("")
  const [favoritesError, setFavoritesError] = useState("")
  const [detailError, setDetailError] = useState("")

  async function fetchRecipes(currentSearch = "") {
    try {
      setLoadingRecipes(true)
      setRecipesError("")
      const data = await getRecipes(currentSearch)
      setRecipes(data)
    } catch (error) {
      console.error(error)
      setRecipesError("No se pudieron cargar las recetas")
    } finally {
      setLoadingRecipes(false)
    }
  }

  async function fetchFavorites() {
    try {
      setLoadingFavorites(true)
      setFavoritesError("")
      const data = await getFavoriteRecipes()
      setFavoriteRecipes(data)
    } catch (error) {
      console.error(error)
      setFavoritesError("No se pudieron cargar los favoritos")
    } finally {
      setLoadingFavorites(false)
    }
  }

  useEffect(() => {
    fetchRecipes("")
    fetchFavorites()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRecipes(search)
    }, 400)

    return () => clearTimeout(timeout)
  }, [search])

  async function handleOpenRecipe(recipeId: string) {
    try {
      setLoadingDetail(true)
      setDetailError("")
      const recipe = await getRecipeById(recipeId)
      setSelectedRecipe(recipe)
    } catch (error) {
      console.error(error)
      setDetailError("No se pudo cargar el detalle de la receta")
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleToggleFavorite(recipeId: string) {
    try {
      setTogglingFavoriteId(recipeId)

      const targetRecipe =
        recipes.find((r) => r.id === recipeId) ||
        favoriteRecipes.find((r) => r.id === recipeId) ||
        (selectedRecipe?.id === recipeId ? selectedRecipe : null)

      const currentlyFavorite = !!targetRecipe?.isFavorite

      if (currentlyFavorite) {
        await removeRecipeFromFavorites(recipeId)
      } else {
        await addRecipeToFavorites(recipeId)
      }

      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId ? { ...r, isFavorite: !currentlyFavorite } : r
        )
      )

      setFavoriteRecipes((prev) => {
        if (currentlyFavorite) {
          return prev.filter((r) => r.id !== recipeId)
        }

        const fromRecipes = recipes.find((r) => r.id === recipeId)
        const fromSelected =
          selectedRecipe?.id === recipeId ? selectedRecipe : null

        const recipeToAdd = fromRecipes || fromSelected

        if (!recipeToAdd) return prev
        if (prev.some((r) => r.id === recipeId)) return prev

        return [{ ...recipeToAdd, isFavorite: true }, ...prev]
      })

      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe({
          ...selectedRecipe,
          isFavorite: !currentlyFavorite,
        })
      }

      await fetchFavorites()
    } catch (error) {
      console.error(error)
      alert("No se pudo actualizar favorito")
    } finally {
      setTogglingFavoriteId(null)
    }
  }

  const favoritesCount = favoriteRecipes.length

  const selectedRecipeInFavorites = useMemo(() => {
    if (!selectedRecipe) return false
    return selectedRecipe.isFavorite
  }, [selectedRecipe])

  return (
    <div className="page-transition mx-auto max-w-lg px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Recetas</h1>
        <p className="text-sm text-muted-foreground">
          Descubrí recetas saludables
        </p>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar recetas..."
          className="h-11 rounded-xl border-border bg-card pl-10 pr-9 text-foreground placeholder:text-muted-foreground"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <Tabs defaultValue="explorar">
        <TabsList className="mb-4 w-full rounded-xl bg-secondary">
          <TabsTrigger
            value="explorar"
            className="flex-1 rounded-lg text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Explorar
          </TabsTrigger>

          <TabsTrigger
            value="favoritos"
            className="flex-1 rounded-lg text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Favoritos ({favoritesCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explorar">
          {loadingRecipes ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Cargando recetas...</p>
            </div>
          ) : recipesError ? (
            <div className="py-12 text-center">
              <p className="text-sm text-destructive">{recipesError}</p>
            </div>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => handleOpenRecipe(recipe.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No se encontraron recetas
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="favoritos">
          {loadingFavorites ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Cargando favoritos...</p>
            </div>
          ) : favoritesError ? (
            <div className="py-12 text-center">
              <p className="text-sm text-destructive">{favoritesError}</p>
            </div>
          ) : favoriteRecipes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {favoriteRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => handleOpenRecipe(recipe.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Aún no tenés recetas favoritas
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Tocá el corazón en una receta para guardarla
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Drawer
        open={!!selectedRecipe || loadingDetail}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecipe(null)
            setDetailError("")
          }
        }}
      >
        <DrawerContent className="mx-auto max-h-[90dvh] max-w-lg">
          {loadingDetail ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Cargando detalle...</p>
            </div>
          ) : detailError ? (
            <div className="p-6 text-center">
              <p className="text-sm text-destructive">{detailError}</p>
            </div>
          ) : selectedRecipe ? (
            <>
              <div className="relative aspect-video w-full bg-secondary">
                <div className="flex h-full items-center justify-center">
                  <span className="text-5xl font-bold text-muted-foreground/20">
                    {selectedRecipe.title.charAt(0)}
                  </span>
                </div>

                <DrawerClose className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm">
                  <ArrowLeft className="size-4 text-foreground" />
                </DrawerClose>

                <button
                  onClick={() => handleToggleFavorite(selectedRecipe.id)}
                  disabled={togglingFavoriteId === selectedRecipe.id}
                  className={cn(
                    "absolute right-3 top-3 flex size-8 items-center justify-center rounded-full transition-all",
                    selectedRecipeInFavorites
                      ? "bg-foreground text-background"
                      : "bg-background/60 text-foreground backdrop-blur-sm"
                  )}
                  aria-label={
                    selectedRecipeInFavorites
                      ? "Quitar de favoritos"
                      : "Agregar a favoritos"
                  }
                >
                  <Heart
                    className={cn(
                      "size-4",
                      selectedRecipeInFavorites && "fill-current"
                    )}
                  />
                </button>
              </div>

              <div className="overflow-y-auto px-4 pb-8 pt-4">
                <h2 className="text-xl font-bold text-foreground text-balance">
                  {selectedRecipe.title}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {selectedRecipe.description || "Sin descripción"}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-4" />
                    <span className="text-sm">
                      {selectedRecipe.timeMinutes ?? 0} min
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Flame className="size-4" />
                    <span className="text-sm">
                      {selectedRecipe.calories ?? 0} kcal
                    </span>
                  </div>

                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {selectedRecipe.author.name}
                  </Badge>
                </div>

                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    Ingredientes
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-foreground/30" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    Preparación
                  </h3>
                  <ol className="flex flex-col gap-3">
                    {selectedRecipe.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                          {i + 1}
                        </span>
                        <p className="pt-0.5 text-sm leading-relaxed text-muted-foreground">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  )
}