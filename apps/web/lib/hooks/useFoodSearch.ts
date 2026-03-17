import { useEffect, useRef, useState } from "react"
import { FoodSearchItem } from "../types"
import { apiFetch } from "../api"

const API_URL = "http://localhost:4000"

export function useFoodSearch(query: string) {
  const [results, setResults] = useState<FoodSearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    const q = query.trim()
    const token = localStorage.getItem("token")
    const profileId = localStorage.getItem("activeProfileId")

    console.log("hook query:", q)

    if (!q) {
      abortRef.current?.abort()
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(async () => {
      abortRef.current?.abort()

      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)

      try {

        const r = await apiFetch(`${API_URL}/foods/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })

        const data = await r.json()
        console.log("response:", data)

        if (!r.ok) {
          setResults([])
          setError(data?.error || "Error buscando alimentos")
          return
        }

        setResults((data.foods || []).slice(0, 8))
      } catch (e: any) {
        if (e?.name === "AbortError") return
        console.error("useFoodSearch error:", e)
        setResults([])
        setError(e?.message || "Error de red")
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [query])

  return { results, loading, error }
}