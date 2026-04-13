import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.API_URL || "http://localhost:4000"

/**
 * Proxy de registro. Reenvía los datos al backend Express.
 * No setea cookie porque el registro no devuelve token;
 * el usuario es redirigido al login tras registrarse.
 *
 * @body {string} email
 * @body {string} password
 * @body {string} [firstProfileName]
 * @body {string} [firstProfileGoal]
 * @returns {201} Usuario creado
 */
export async function POST(request: NextRequest) {
  const body = await request.json()

  const backendRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await backendRes.json()

  return NextResponse.json(data, { status: backendRes.status })
}
