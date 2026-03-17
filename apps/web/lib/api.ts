export async function apiFetch(input: string, init: RequestInit = {}) {
  // leer token y perfil
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null

  const profileId =
    typeof window !== "undefined"
      ? localStorage.getItem("activeProfileId")
      : null

  // construir headers
  const headers = new Headers(init.headers || {})

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  if (profileId) {
    headers.set("X-Profile-Id", profileId)
  }

  // ejecutar request
  const response = await fetch(input, {
    ...init,
    headers,
  })

  // manejar token vencido
  if (response.status === 401) {
    console.warn("Token inválido o expirado")

    localStorage.removeItem("token")
    localStorage.removeItem("activeProfileId")
    localStorage.removeItem("profiles")

    window.location.href = "/login"

    throw new Error("Sesión expirada")
  }

  return response
}