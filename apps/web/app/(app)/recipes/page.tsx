"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useProfiles } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, X, ArrowLeft, Heart, Clock, Flame, Plus, ImagePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiRecipe, CreateRecipeInput } from "@/lib/types"
import { RecipeCard } from "@/components/recipe-card"
import {
  getRecipes,
  getFavoriteRecipes,
  getRecipeById,
  addRecipeToFavorites,
  removeRecipeFromFavorites,
  createRecipe,
} from "@/lib/recipes-api"
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"

export default function RecipesPage() {
//usestates para agregar receta
  const [createOpen, setCreateOpen] = useState(false)
  const [creatingRecipe, setCreatingRecipe] = useState(false)
  const [createError, setCreateError] = useState("")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [ingredientsText, setIngredientsText] = useState("")
  const [stepsText, setStepsText] = useState("")
  const [timeMinutes, setTimeMinutes] = useState("")
  const [calories, setCalories] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imagePreview, setImagePreview] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
//usestates para navegar, search, favoritos
  const { activeProfile } = useProfiles()
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

  async function fetchRecipes(currentSearch = "", profileIdArg?: string) {
  const requestProfileId = profileIdArg || activeProfile?.id
  if (!requestProfileId) return

  try {
    setLoadingRecipes(true)
    setRecipesError("")

    const data = await getRecipes(currentSearch)

    if (activeProfile?.id !== requestProfileId) return

    setRecipes(data)
  } catch (error) {
    console.error(error)

    if (activeProfile?.id !== requestProfileId) return

    setRecipesError("No se pudieron cargar las recetas")
  } finally {
    if (activeProfile?.id !== requestProfileId) return

    setLoadingRecipes(false)
  }
}

async function fetchFavorites(profileIdArg?: string) {
  const requestProfileId = profileIdArg || activeProfile?.id
  if (!requestProfileId) return

  try {
    setLoadingFavorites(true)
    setFavoritesError("")

    const data = await getFavoriteRecipes()

    if (activeProfile?.id !== requestProfileId) return

    setFavoriteRecipes(data)
  } catch (error) {
    console.error(error)

    if (activeProfile?.id !== requestProfileId) return

    setFavoritesError("No se pudieron cargar los favoritos")
  } finally {
    if (activeProfile?.id !== requestProfileId) return

    setLoadingFavorites(false)
  }
}

  function resizeImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const MAX_W = 800
          const MAX_H = 600
          let w = img.width
          let h = img.height
          if (w > MAX_W || h > MAX_H) {
            const ratio = Math.min(MAX_W / w, MAX_H / h)
            w = Math.round(w * ratio)
            h = Math.round(h * ratio)
          }
          const canvas = document.createElement("canvas")
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext("2d")
          if (!ctx) return reject(new Error("canvas error"))
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL("image/jpeg", 0.75))
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await resizeImageToBase64(file)
      setImageUrl(base64)
      setImagePreview(base64)
    } catch {
      setCreateError("No se pudo procesar la imagen")
    }
  }

  function resetCreateForm() {
  setTitle("")
  setDescription("")
  setIngredientsText("")
  setStepsText("")
  setTimeMinutes("")
  setCalories("")
  setImageUrl("")
  setImagePreview("")
  setCreateError("")
  if (fileInputRef.current) fileInputRef.current.value = ""
}

async function handleCreateRecipe(e: React.FormEvent) {
  e.preventDefault()

  try {
    setCreatingRecipe(true)
    setCreateError("")

    const ingredients = ingredientsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    const steps = stepsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    if (!title.trim()) {
      setCreateError("El título es obligatorio")
      return
    }

    if (ingredients.length === 0) {
      setCreateError("Tenés que agregar al menos un ingrediente")
      return
    }

    if (steps.length === 0) {
      setCreateError("Tenés que agregar al menos un paso")
      return
    }

    const payload: CreateRecipeInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      ingredients,
      steps,
      timeMinutes: timeMinutes.trim() ? Number(timeMinutes) : null,
      calories: calories.trim() ? Number(calories) : null,
      imageUrl: imageUrl.trim() || undefined,
    }

    await createRecipe(payload)

    await fetchRecipes(search)
    await fetchFavorites()

    resetCreateForm()
    setCreateOpen(false)
  } catch (error) {
    console.error(error)
    setCreateError("No se pudo crear la receta")
  } finally {
    setCreatingRecipe(false)
  }
}
  useEffect(() => {
    if (!activeProfile?.id) return

    setRecipes([])
    setFavoriteRecipes([])
    setSelectedRecipe(null)
    setRecipesError("")
    setFavoritesError("")
    setDetailError("")

    fetchRecipes(search, activeProfile.id)
    fetchFavorites(activeProfile.id)
  }, [activeProfile?.id])

  useEffect(() => {
  if (!activeProfile?.id) return

  const timeout = setTimeout(() => {
    fetchRecipes(search, activeProfile.id)
  }, 400)

  return () => clearTimeout(timeout)
}, [search, activeProfile?.id])

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
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Recetas</h1>
          <p className="text-sm text-muted-foreground">
            Descubrí recetas saludables
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setCreateError("")
            setCreateOpen(true)
          }}
          className="rounded-xl"
        >
          <Plus className="mr-1 size-4" />
          Nueva receta
        </Button>
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
                {selectedRecipe.imageUrl ? (
                  <img
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-5xl font-bold text-muted-foreground/20">
                      {selectedRecipe.title.charAt(0)}
                    </span>
                  </div>
                )}

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
      <Drawer
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            resetCreateForm()
          }
        }}
      >
        <DrawerContent className="mx-auto max-h-[90dvh] max-w-lg">
  <DrawerHeader className="px-4 pt-4 text-left">
    <div className="flex items-start justify-between gap-3">
      <div>
        <DrawerTitle className="text-lg font-bold text-foreground">
          Nueva receta
        </DrawerTitle>
        <DrawerDescription className="text-sm text-muted-foreground">
          Completá los datos para cargar una receta
        </DrawerDescription>
      </div>

      <DrawerClose className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:text-foreground">
        Cerrar
      </DrawerClose>
    </div>
  </DrawerHeader>

  <div className="overflow-y-auto px-4 pb-8">

            <form onSubmit={handleCreateRecipe} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Título
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Tostadas con palta y huevo"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descripción de la receta"
                  className="min-h-[90px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Ingredientes
                </label>
                <textarea
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  placeholder={`Un ingrediente por línea
      Ej:
      2 huevos
      1/2 palta
      2 tostadas integrales`}
                  className="min-h-[120px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Pasos
                </label>
                <textarea
                  value={stepsText}
                  onChange={(e) => setStepsText(e.target.value)}
                  placeholder={`Un paso por línea
      Ej:
      Tostar el pan
      Pisar la palta
      Cocinar los huevos`}
                  className="min-h-[120px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Tiempo (min)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                    placeholder="10"
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Calorías
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="420"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Foto de la receta (opcional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {imagePreview ? (
                  <div className="relative overflow-hidden rounded-xl border border-border">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-40 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl("")
                        setImagePreview("")
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-sm hover:bg-background"
                      aria-label="Quitar imagen"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-6 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    <ImagePlus className="size-4" />
                    Elegir foto del dispositivo
                  </button>
                )}
              </div>

              {createError ? (
                <p className="text-sm text-destructive">{createError}</p>
              ) : null}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    resetCreateForm()
                    setCreateOpen(false)
                  }}
                  disabled={creatingRecipe}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  className="flex-1 rounded-xl"
                  disabled={creatingRecipe}
                >
                  {creatingRecipe ? "Guardando..." : "Guardar receta"}
                </Button>
              </div>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}