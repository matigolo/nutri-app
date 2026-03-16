import { useEffect, useRef, useState } from "react"


export type FoodSearchItem = {
  fdcId: number
  description: string
  brandName: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

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
        console.log("AAA: " , encodeURIComponent(q))
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`
        if (profileId) headers["X-Profile-Id"] = profileId

        const r = await fetch(`/foods/search?q=${encodeURIComponent(q)}`, {
        headers,
        signal: controller.signal,
        // ✅ NO credentials
        })


        const data = await r.json()

        if (!r.ok) {
          setResults([])
          setError(data?.error || "Error buscando alimentos")
          return
        }

        setResults((data.foods || []).slice(0, 8))
      } catch (e: any) {
        if (e?.name === "AbortError") return
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
