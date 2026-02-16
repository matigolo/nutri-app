"use client"

import { useState, useMemo } from "react"
import { useFavorites } from "@/lib/app-context"
import { recipes } from "@/lib/mock-data"
import { RecipeCard } from "@/components/recipe-card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X, ArrowLeft, Heart, Clock, Flame, Users } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Recipe } from "@/lib/types"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"

export default function RecipesPage() {
  const { isFavorite, toggleFavorite, favorites } = useFavorites()
  const [search, setSearch] = useState("")
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)

  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return recipes
    const q = search.toLowerCase()
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [search])

  const favoriteRecipes = useMemo(
    () => recipes.filter((r) => favorites.includes(r.id)),
    [favorites]
  )

  return (
    <div className="page-transition mx-auto max-w-lg px-4 pt-6">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Recetas</h1>
        <p className="text-sm text-muted-foreground">Descubri recetas saludables</p>
      </header>

      {/* Search */}
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
            aria-label="Limpiar busqueda"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="explorar">
        <TabsList className="mb-4 w-full rounded-xl bg-secondary">
          <TabsTrigger value="explorar" className="flex-1 rounded-lg text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
            Explorar
          </TabsTrigger>
          <TabsTrigger value="favoritos" className="flex-1 rounded-lg text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
            Favoritos ({favorites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explorar">
          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => setSelectedRecipe(recipe)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No se encontraron recetas</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="favoritos">
          {favoriteRecipes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {favoriteRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => setSelectedRecipe(recipe)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Aun no tenes recetas favoritas</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Toca el corazon en una receta para guardarla</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recipe Detail Drawer */}
      <Drawer open={!!selectedRecipe} onOpenChange={(open) => { if (!open) setSelectedRecipe(null) }}>
        <DrawerContent className="mx-auto max-h-[90dvh] max-w-lg">
          {selectedRecipe && (
            <>
              {/* Image Placeholder */}
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
                  onClick={() => toggleFavorite(selectedRecipe.id)}
                  className={cn(
                    "absolute right-3 top-3 flex size-8 items-center justify-center rounded-full transition-all",
                    isFavorite(selectedRecipe.id)
                      ? "bg-foreground text-background"
                      : "bg-background/60 text-foreground backdrop-blur-sm"
                  )}
                  aria-label={isFavorite(selectedRecipe.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                  <Heart className={cn("size-4", isFavorite(selectedRecipe.id) && "fill-current")} />
                </button>
              </div>

              <div className="overflow-y-auto px-4 pb-8 pt-4">
                {/* Title & Description */}
                <h2 className="text-xl font-bold text-foreground text-balance">{selectedRecipe.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{selectedRecipe.description}</p>

                {/* Meta */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-4" />
                    <span className="text-sm">{selectedRecipe.prepTime} min</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-4" />
                    <span className="text-sm">{selectedRecipe.servings} porcion{selectedRecipe.servings > 1 ? "es" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Flame className="size-4" />
                    <span className="text-sm">{selectedRecipe.calories} kcal</span>
                  </div>
                </div>

                {/* Nutrition */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    { label: "Kcal", value: selectedRecipe.calories },
                    { label: "Prot", value: `${selectedRecipe.protein}g` },
                    { label: "Carbs", value: `${selectedRecipe.carbs}g` },
                    { label: "Grasa", value: `${selectedRecipe.fat}g` },
                  ].map((m) => (
                    <div key={m.label} className="flex flex-col items-center rounded-xl border border-border bg-card px-2 py-2">
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">{m.value}</span>
                    </div>
                  ))}
                </div>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selectedRecipe.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-lg text-xs text-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Ingredients */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Ingredientes</h3>
                  <ul className="flex flex-col gap-1.5">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-foreground/30" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Preparacion</h3>
                  <ol className="flex flex-col gap-3">
                    {selectedRecipe.instructions.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                          {i + 1}
                        </span>
                        <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}
