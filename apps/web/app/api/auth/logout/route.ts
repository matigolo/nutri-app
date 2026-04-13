import { NextResponse } from "next/server"

/**
 * Limpia la cookie de autenticación al cerrar sesión.
 * Setea la cookie con maxAge 0 para que el browser la elimine inmediatamente.
 *
 * @returns {200} { ok: true }
 */
export async function POST() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set("auth-token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  })

  return response
}
