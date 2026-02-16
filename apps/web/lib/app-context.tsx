"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Profile, MealEntry, WeightRecord, ChatMessage } from "./types"
import { defaultProfiles } from "./mock-data"

// --- Profile Context ---
interface ProfileContextType {
  profiles: Profile[]
  activeProfile: Profile | null
  setActiveProfile: (profile: Profile) => void
  addProfile: (name: string) => void
  removeProfile: (id: string) => void
  logout: () => void
  isLoggedIn: boolean
  setIsLoggedIn: (v: boolean) => void
}

const ProfileContext = createContext<ProfileContextType | null>(null)

export function useProfiles() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error("useProfiles must be used within ProfileProvider")
  return ctx
}

// --- Meal Context ---
interface MealContextType {
  meals: MealEntry[]
  addMeal: (meal: MealEntry) => void
  removeMeal: (id: string) => void
  getMealsByDate: (date: string) => MealEntry[]
  recentFoodIds: string[]
}

const MealContext = createContext<MealContextType | null>(null)

export function useMeals() {
  const ctx = useContext(MealContext)
  if (!ctx) throw new Error("useMeals must be used within MealProvider")
  return ctx
}

// --- Weight Context ---
interface WeightContextType {
  weights: WeightRecord[]
  addWeight: (record: WeightRecord) => void
  getWeightByDate: (date: string) => WeightRecord | undefined
}

const WeightContext = createContext<WeightContextType | null>(null)

export function useWeights() {
  const ctx = useContext(WeightContext)
  if (!ctx) throw new Error("useWeights must be used within WeightProvider")
  return ctx
}

// --- Favorites Context ---
interface FavoritesContextType {
  favorites: string[]
  toggleFavorite: (recipeId: string) => void
  isFavorite: (recipeId: string) => boolean
}

const FavoritesContext = createContext<FavoritesContextType | null>(null)

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider")
  return ctx
}

// --- Chat Context ---
interface ChatContextType {
  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within ChatProvider")
  return ctx
}

// --- UI Context (for global drawer state) ---
interface UIContextType {
  addMealDrawerOpen: boolean
  setAddMealDrawerOpen: (v: boolean) => void
}

const UIContext = createContext<UIContextType | null>(null)

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error("useUI must be used within UIProvider")
  return ctx
}

// --- Combined Provider ---
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore */ }
}

const AVATAR_COLORS = [
  "oklch(0.985 0 0)",
  "oklch(0.70 0 0)",
  "oklch(0.50 0 0)",
  "oklch(0.80 0.10 80)",
  "oklch(0.70 0.15 200)",
]

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [addMealDrawerOpen, setAddMealDrawerOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setIsLoggedIn(loadFromStorage("nutri-logged-in", false))
    setProfiles(loadFromStorage("nutri-profiles", defaultProfiles))
    setActiveProfile(loadFromStorage("nutri-active-profile", null))
    setMeals(loadFromStorage("nutri-meals", []))
    setWeights(loadFromStorage("nutri-weights", []))
    setFavorites(loadFromStorage("nutri-favorites", []))
    setMessages(loadFromStorage("nutri-messages", []))
    setHydrated(true)
  }, [])

  useEffect(() => { if (hydrated) saveToStorage("nutri-logged-in", isLoggedIn) }, [isLoggedIn, hydrated])
  useEffect(() => { if (hydrated) saveToStorage("nutri-profiles", profiles) }, [profiles, hydrated])
  useEffect(() => { if (hydrated) saveToStorage("nutri-active-profile", activeProfile) }, [activeProfile, hydrated])
  useEffect(() => { if (hydrated) saveToStorage("nutri-meals", meals) }, [meals, hydrated])
  useEffect(() => { if (hydrated) saveToStorage("nutri-weights", weights) }, [weights, hydrated])
  useEffect(() => { if (hydrated) saveToStorage("nutri-favorites", favorites) }, [favorites, hydrated])
  useEffect(() => { if (hydrated) saveToStorage("nutri-messages", messages) }, [messages, hydrated])

  const addProfile = useCallback((name: string) => {
    if (profiles.length >= 5) return
    const newProfile: Profile = {
      id: `p-${Date.now()}`,
      name,
      avatarColor: AVATAR_COLORS[profiles.length % AVATAR_COLORS.length],
      initials: name.slice(0, 2).toUpperCase(),
      createdAt: new Date().toISOString(),
    }
    setProfiles((prev) => [...prev, newProfile])
  }, [profiles.length])

  const removeProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id))
    if (activeProfile?.id === id) setActiveProfile(null)
  }, [activeProfile?.id])

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setActiveProfile(null)
  }, [])

  const addMeal = useCallback((meal: MealEntry) => {
    setMeals((prev) => [...prev, meal])
  }, [])

  const removeMeal = useCallback((id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const getMealsByDate = useCallback(
    (date: string) => {
      if (!activeProfile) return []
      return meals.filter((m) => m.date === date && m.profileId === activeProfile.id)
    },
    [meals, activeProfile]
  )

  const recentFoodIds = meals
    .filter((m) => m.profileId === activeProfile?.id)
    .flatMap((m) => m.items)
    .filter((i) => i.foodId)
    .map((i) => i.foodId!)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(-5)

  const addWeight = useCallback((record: WeightRecord) => {
    setWeights((prev) => {
      const filtered = prev.filter(
        (w) => !(w.date === record.date && w.profileId === record.profileId)
      )
      return [...filtered, record]
    })
  }, [])

  const getWeightByDate = useCallback(
    (date: string) => {
      if (!activeProfile) return undefined
      return weights.find((w) => w.date === date && w.profileId === activeProfile.id)
    },
    [weights, activeProfile]
  )

  const toggleFavorite = useCallback((recipeId: string) => {
    setFavorites((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
    )
  }, [])

  const isFavorite = useCallback(
    (recipeId: string) => favorites.includes(recipeId),
    [favorites]
  )

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <UIContext.Provider value={{ addMealDrawerOpen, setAddMealDrawerOpen }}>
      <ProfileContext.Provider
        value={{ profiles, activeProfile, setActiveProfile, addProfile, removeProfile, logout, isLoggedIn, setIsLoggedIn }}
      >
        <MealContext.Provider value={{ meals, addMeal, removeMeal, getMealsByDate, recentFoodIds }}>
          <WeightContext.Provider value={{ weights, addWeight, getWeightByDate }}>
            <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
              <ChatContext.Provider value={{ messages, addMessage, clearMessages }}>
                {children}
              </ChatContext.Provider>
            </FavoritesContext.Provider>
          </WeightContext.Provider>
        </MealContext.Provider>
      </ProfileContext.Provider>
    </UIContext.Provider>
  )
}
