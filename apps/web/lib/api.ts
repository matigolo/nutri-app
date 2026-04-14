/**
 * URL base del backend Express. Se usa solo para detectar y reescribir URLs absolutas.
 * El valor real de las llamadas va siempre a través del proxy en /api/proxy.
 */
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"

/**
 * Wrapper de fetch para llamadas autenticadas al backend.
 *
 * Convierte URLs absolutas del backend (http://localhost:4000/...) en llamadas
 * relativas al proxy interno de Next.js (/api/proxy/...). Esto permite que el
 * token JWT viva en una cookie HttpOnly (invisible para JavaScript) en lugar de
 * localStorage, eliminando el riesgo de robo de tokens vía ataques XSS.
 *
 * Adjunta automáticamente el header X-Profile-Id desde localStorage (el profileId
 * no es un secreto de autenticación, solo un identificador de perfil activo).
 *
 * En caso de recibir un 401, limpia el estado de sesión y redirige al login.
 *
 * @param input - URL completa del backend o path relativo
 * @param init  - RequestInit estándar (method, headers, body, signal, etc.)
 * @returns Response de fetch
 *
 * @example
 * // Todos estos formatos funcionan igual:
 * await apiFetch("http://localhost:4000/meals")
 * await apiFetch("/meals")
 * await apiFetch(`http://localhost:4000/recipes/${id}/favorite`, { method: "DELETE" })
 */
export async function apiFetch(input: string, init: RequestInit = {}) {
  // Reescribir URL absoluta del backend a path relativo del proxy.
  // Si el input es una URL absoluta (cualquier origen), extraemos solo pathname+search
  // para que funcione tanto en local (localhost:4000) como en producción (Railway URL).
  let path: string
  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      const u = new URL(input)
      path = u.pathname + u.search
    } catch {
      path = input
    }
  } else {
    path = input
  }

  const proxyUrl = `/api/proxy${path}`

  const headers = new Headers(init.headers || {})

  // profileId no es sensible (es solo un ID numérico), se puede leer en JS
  const profileId =
    typeof window !== "undefined"
      ? localStorage.getItem("activeProfileId")
      : null

  if (profileId) {
    headers.set("X-Profile-Id", profileId)
  }

  // No se inyecta Authorization header — el proxy lo agrega desde la cookie HttpOnly

  const response = await fetch(proxyUrl, {
    ...init,
    headers,
  })

  // Cookie expirada o token inválido: limpiar estado y redirigir al login
  if (response.status === 401) {
    console.warn("Sesión expirada o no autorizado")

    if (typeof window !== "undefined") {
      localStorage.removeItem("activeProfileId")
      localStorage.removeItem("profiles")
      localStorage.removeItem("nutri-logged-in")
      localStorage.removeItem("nutri-active-profile")
      window.location.href = "/login"
    }

    throw new Error("Sesión expirada")
  }

  return response
}
