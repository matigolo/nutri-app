import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.API_URL || "http://localhost:4000"

/**
 * Proxy de login. Reenvía las credenciales al backend Express y, si son válidas,
 * setea el token JWT en una cookie HttpOnly para que JavaScript del browser
 * nunca pueda leerlo directamente (protección contra robo de tokens vía XSS).
 *
 * @body {string} email
 * @body {string} password
 * @returns {200} { user, profiles } — sin exponer el token al cliente
 */
export async function POST(request: NextRequest) {
  const body = await request.json()

  const backendRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await backendRes.json()

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status })
  }

  // Construimos la respuesta sin incluir el token en el body
  const response = NextResponse.json({
    user: data.user,
    profiles: data.profiles,
  })

  // Token en cookie HttpOnly: el browser la envía automáticamente pero
  // ningún script puede leerla con document.cookie ni localStorage
  response.cookies.set("auth-token", data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 días, igual que el JWT
  })

  return response
}
