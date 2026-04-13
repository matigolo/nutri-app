import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.API_URL || "http://localhost:4000"

/**
 * Proxy catch-all para todas las llamadas al backend Express.
 *
 * Lee el token JWT de la cookie HttpOnly (invisible para JavaScript del browser)
 * y lo convierte en un header Authorization: Bearer antes de reenviar la solicitud
 * al backend. Así el browser nunca necesita leer ni guardar el token.
 *
 * Rutas cubiertas: /api/proxy/* → http://localhost:4000/*
 * Ejemplos:
 *   GET  /api/proxy/meals          → GET  http://localhost:4000/meals
 *   POST /api/proxy/recipes        → POST http://localhost:4000/recipes
 *   GET  /api/proxy/foods/search?q=... → GET http://localhost:4000/foods/search?q=...
 *
 * @param request - Request entrante del browser
 * @param context - Contiene `params.path`: segmentos de la ruta como array
 */
async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string
): Promise<NextResponse> {
  const token = request.cookies.get("auth-token")?.value
  const profileId = request.headers.get("x-profile-id")
  const contentType = request.headers.get("content-type")

  const backendPath = path.join("/")
  const search = request.nextUrl.search
  const url = `${API_BASE}/${backendPath}${search}`

  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (profileId) headers["X-Profile-Id"] = profileId
  if (contentType) headers["Content-Type"] = contentType

  const init: RequestInit = { method, headers }

  if (method !== "GET" && method !== "HEAD") {
    const body = await request.text()
    if (body) init.body = body
  }

  const backendRes = await fetch(url, init)
  const responseBody = await backendRes.text()

  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: {
      "Content-Type":
        backendRes.headers.get("content-type") || "application/json",
    },
  })
}

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyRequest(request, path, "GET")
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyRequest(request, path, "POST")
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyRequest(request, path, "DELETE")
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyRequest(request, path, "PUT")
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyRequest(request, path, "PATCH")
}
