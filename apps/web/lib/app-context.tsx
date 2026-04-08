"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type {
  Profile,
  MealEntry,
  WeightRecord,
  ChatMessage,
  MealItem,
} from "./types"
import { defaultProfiles } from "./mock-data"
import { apiFetch } from "./api"

// --- Profile Context ---
interface ProfileContextType {
  profiles: Profile[]
  activeProfile: Profile | null
  setActiveProfile: (profile: Profile | null) => void
  addProfile: (name: string, goal: string | null) => void
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
  loadingMeals: boolean
  addMeal: (meal: MealEntry) => Promise<boolean>
  removeMeal: (id: string) => void
  refreshMeals: () => Promise<void>
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

// --- UI Context ---
interface UIContextType {
  addMealDrawerOpen: boolean
  setAddMealDrawerOpen: (v: boolean) => void
  selectedDate: string
  setSelectedDate: (date: string) => void
}

const UIContext = createContext<UIContextType | null>(null)

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error("useUI must be used within UIProvider")
  return ctx
}

// --- Helpers ---
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
  } catch {
    // ignore
  }
}

function mapBackendMealToMealEntry(meal: any): MealEntry {
  const mealDateRaw =
    typeof meal.mealDate === "string"
      ? meal.mealDate
      : new Date(meal.mealDate).toISOString()

  const mealDate = mealDateRaw.slice(0, 10)
  const mealTime = mealDateRaw.includes("T") ? mealDateRaw.slice(11, 16) : undefined

  const items: MealItem[] = Array.isArray(meal.items)
    ? meal.items.map((item: any) => ({
        id: String(item.id),
        name: item.name ?? "",
        quantity:
          typeof item.quantity === "number"
            ? item.quantity
            : Number(item.quantity ?? 0),
        unit: (item.unit ?? "gramos") as MealItem["unit"],
        macros: {
          kcal: Number(item.calories ?? 0),
          protein: Number(item.protein ?? 0),
          carbs: Number(item.carbs ?? 0),
          fat: Number(item.fat ?? 0),
        },
        advancedOpen: false,
      }))
    : []

  return {
    id: String(meal.id),
    profileId: String(meal.profileId),
    date: mealDate,
    type: meal.mealType as MealEntry["type"],
    time: mealTime,
    notes: meal.notes ?? undefined,
    items,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [loadingMeals, setLoadingMeals] = useState(false)
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [messagesByScope, setMessagesByScope] = useState<Record<string, ChatMessage[]>>({})
  const [addMealDrawerOpen, setAddMealDrawerOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const setActiveProfile = useCallback((profile: Profile | null) => {
    setActiveProfileState(profile)

    if (typeof window !== "undefined") {
      if (profile) {
        localStorage.setItem("activeProfileId", String(profile.id))
      } else {
        localStorage.removeItem("activeProfileId")
      }
    }
  }, [])

  useEffect(() => {
    setIsLoggedIn(loadFromStorage("nutri-logged-in", false))
    setProfiles(loadFromStorage("nutri-profiles", defaultProfiles))

    const storedActiveProfile = loadFromStorage<Profile | null>(
      "nutri-active-profile",
      null
    )
    setActiveProfileState(storedActiveProfile)

    if (typeof window !== "undefined") {
      if (storedActiveProfile?.id) {
        localStorage.setItem("activeProfileId", String(storedActiveProfile.id))
      } else {
        localStorage.removeItem("activeProfileId")
      }
    }

    setWeights(loadFromStorage("nutri-weights", []))
    setFavorites(loadFromStorage("nutri-favorites", []))
    setMessagesByScope(loadFromStorage("nutri-messages-by-scope", {}))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveToStorage("nutri-logged-in", isLoggedIn)
  }, [isLoggedIn, hydrated])

  useEffect(() => {
    if (hydrated) saveToStorage("nutri-profiles", profiles)
  }, [profiles, hydrated])

  useEffect(() => {
    if (hydrated) saveToStorage("nutri-active-profile", activeProfile)
  }, [activeProfile, hydrated])

  useEffect(() => {
    if (hydrated) saveToStorage("nutri-weights", weights)
  }, [weights, hydrated])

  useEffect(() => {
    if (hydrated) saveToStorage("nutri-favorites", favorites)
  }, [favorites, hydrated])

  useEffect(() => {
  if (hydrated) saveToStorage("nutri-messages-by-scope", messagesByScope)
}, [messagesByScope, hydrated])

  const addProfile = useCallback(
    (name: string, goal: string | null) => {
      if (profiles.length >= 5) return

      const newProfile: Profile = {
        id: `p-${Date.now()}`,
        userId: "",
        name,
        goal,
        avatarUrl: "",
        createdAt: new Date(),
      }

      setProfiles((prev) => [...prev, newProfile])
    },
    [profiles.length]
  )

  const removeProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      if (activeProfile?.id === id) setActiveProfile(null)
    },
    [activeProfile?.id, setActiveProfile]
  )

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setActiveProfile(null)
    setMeals([])
  }, [setActiveProfile])

  const refreshMeals = useCallback(async () => {
    if (!activeProfile?.id || !isLoggedIn) {
      setMeals([])
      return
    }

    try {
      setLoadingMeals(true)

      const res = await apiFetch("http://localhost:4000/meals", {
        method: "GET",
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("GET /meals error:", data)
        setMeals([])
        return
      }

      const mappedMeals = Array.isArray(data.meals)
        ? data.meals.map(mapBackendMealToMealEntry)
        : []

      setMeals(mappedMeals)
    } catch (error) {
      console.error("refreshMeals error:", error)
      setMeals([])
    } finally {
      setLoadingMeals(false)
    }
  }, [activeProfile?.id, isLoggedIn])

  const addMeal = useCallback(
    async (meal: MealEntry) => {
      try {
        const mealDate = meal.time
          ? new Date(`${meal.date}T${meal.time}`)
          : new Date(`${meal.date}T12:00`)

        const payload = {
          mealType: meal.type,
          mealDate: mealDate.toISOString(),
          notes: meal.notes?.trim() || null,
          items: meal.items.map((item) => ({
            name: item.name.trim(),
            quantity: item.quantity,
            unit: item.unit,
            calories: item.macros.kcal,
            protein: item.macros.protein,
            carbs: item.macros.carbs,
            fat: item.macros.fat,
          })),
        }

        const res = await apiFetch("http://localhost:4000/meals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        const text = await res.text()
        let data: any = {}

        try {
          data = text ? JSON.parse(text) : {}
        } catch {
          data = {}
        }

        if (!res.ok) {
          console.error("POST /meals status:", res.status)
          console.error("POST /meals raw response:", text)
          console.error("POST /meals parsed response:", data)
          return false
        }

        await refreshMeals()
        return true
      } catch (error) {
        console.error("addMeal error:", error)
        return false
      }
    },
    [refreshMeals]
  )

  const removeMeal = useCallback((id: string) => {
    console.warn("removeMeal todavía no está conectado al backend:", id)
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }, [])

  useEffect(() => {
    if (!hydrated) return

    if (!isLoggedIn || !activeProfile?.id) {
      setMeals([])
      return
    }

    refreshMeals()
  }, [hydrated, isLoggedIn, activeProfile?.id, refreshMeals])

  const getMealsByDate = useCallback(
    (date: string) => {
      if (!activeProfile) return []
      return meals.filter(
        (m) => m.date === date && m.profileId === activeProfile.id
      )
    },
    [meals, activeProfile]
  )

  const recentFoodIds = meals
    .filter((m) => m.profileId === activeProfile?.id)
    .flatMap((m) => m.items)
    .filter((i) => i.id)
    .map((i) => i.id)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(-5) as string[]

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
      return weights.find(
        (w) => w.date === date && w.profileId === activeProfile.id
      )
    },
    [weights, activeProfile]
  )

  const toggleFavorite = useCallback((recipeId: string) => {
    setFavorites((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    )
  }, [])

  const isFavorite = useCallback(
    (recipeId: string) => favorites.includes(recipeId),
    [favorites]
  )
  const chatScopeKey =
    activeProfile?.id && activeProfile?.userId
      ? `${activeProfile.userId}:${activeProfile.id}`
      : activeProfile?.id
        ? `profile:${activeProfile.id}`
        : "no-profile"

  const messages = messagesByScope[chatScopeKey] ?? []


  const addMessage = useCallback((msg: ChatMessage) => {
    setMessagesByScope((prev) => {
      const current = prev[chatScopeKey] ?? []
      return {
        ...prev,
        [chatScopeKey]: [...current, msg],
      }
    })
  }, [chatScopeKey])

  const clearMessages = useCallback(() => {
    setMessagesByScope((prev) => ({
      ...prev,
      [chatScopeKey]: [],
    }))
  }, [chatScopeKey])

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <UIContext.Provider value={{ addMealDrawerOpen, setAddMealDrawerOpen, selectedDate,setSelectedDate }}>
      <ProfileContext.Provider
        value={{
          profiles,
          activeProfile,
          setActiveProfile,
          addProfile,
          removeProfile,
          logout,
          isLoggedIn,
          setIsLoggedIn,
        }}
      >
        <MealContext.Provider
          value={{
            meals,
            loadingMeals,
            addMeal,
            removeMeal,
            refreshMeals,
            getMealsByDate,
            recentFoodIds,
          }}
        >
          <WeightContext.Provider value={{ weights, addWeight, getWeightByDate }}>
            <FavoritesContext.Provider
              value={{ favorites, toggleFavorite, isFavorite }}
            >
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