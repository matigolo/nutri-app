"use client"

import { Heart, Clock, Flame } from "lucide-react"
import { useFavorites } from "@/lib/app-context"
import { cn } from "@/lib/utils"
import type { Recipe } from "@/lib/types"

interface RecipeCardProps {
  recipe: Recipe
  onClick: () => void
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = isFavorite(recipe.id)

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all glow-hover cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick() }}
      aria-label={`Ver receta: ${recipe.title}`}
    >
      {/* Image Placeholder */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <div className="flex h-full items-center justify-center">
          <span className="text-3xl font-bold text-muted-foreground/30">{recipe.title.charAt(0)}</span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe.id) }}
          className={cn(
            "absolute right-2 top-2 flex size-8 items-center justify-center rounded-full transition-all",
            fav
              ? "bg-foreground text-background"
              : "bg-background/60 text-foreground backdrop-blur-sm hover:bg-background/80"
          )}
          aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Heart className={cn("size-4", fav && "fill-current")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-foreground leading-tight text-balance">{recipe.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">{recipe.description}</p>

        <div className="mt-2.5 flex items-center gap-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3" />
            <span className="text-[11px]">{recipe.prepTime} min</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Flame className="size-3" />
            <span className="text-[11px]">{recipe.calories} kcal</span>
          </div>
        </div>
      </div>
    </div>
  )
}
