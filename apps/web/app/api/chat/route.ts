import { NextRequest, NextResponse } from "next/server"
import { nutritionResponses } from "@/lib/mock-data"

// Nutrition-related keywords for filtering
const NUTRITION_KEYWORDS = [
  "proteina", "proteinas", "protein", "caloria", "calorias", "calories",
  "carbohidrato", "carbohidratos", "carbs", "grasa", "grasas", "fat",
  "dieta", "nutricion", "nutriente", "vitamina", "mineral", "fiber", "fibra",
  "comida", "comer", "alimento", "alimentacion", "desayuno", "almuerzo",
  "cena", "merienda", "receta", "cocinar", "saludable", "peso", "engordar",
  "adelgazar", "bajar", "subir", "masa muscular", "musculo", "vegano",
  "vegetariano", "ayuno", "intermitente", "suplemento", "batido",
  "hidratacion", "agua", "leche", "fruta", "verdura", "carne", "pescado",
  "huevo", "arroz", "pan", "pasta", "legumbre", "cereal", "avena", "yogur",
  "queso", "aceite", "azucar", "sal", "macro", "macros", "micronutriente",
  "metabolismo", "digestion", "intestino", "hambre", "saciedad", "porcion",
  "kcal", "kilocalorias", "indice glucemico", "colesterol", "sodio",
]

function isNutritionRelated(message: string): boolean {
  const lower = message.toLowerCase()
  return NUTRITION_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function getMockResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes("proteina") || lower.includes("protein")) {
    return nutritionResponses.proteinas
  }
  if (lower.includes("caloria") || lower.includes("kcal")) {
    return nutritionResponses.calorias
  }
  if (lower.includes("carbohidrato") || lower.includes("carbs")) {
    return nutritionResponses.carbohidratos
  }
  if (lower.includes("grasa") || lower.includes("fat")) {
    return nutritionResponses.grasas
  }
  if (lower.includes("agua") || lower.includes("hidratacion") || lower.includes("tomar")) {
    return nutritionResponses.hidratacion
  }

  return nutritionResponses.default
}

/**
 * POST /api/chat
 * 
 * Receives a user message and returns a mock AI response.
 * 
 * TODO: Connect to real AI backend (e.g., OpenAI, your Node.js backend)
 * 
 * Expected request body: { message: string }
 * Response: { reply: string, isNutritionRelated: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700))

    const isRelated = isNutritionRelated(message)

    if (!isRelated) {
      return NextResponse.json({
        reply: "Esta IA solo responde consultas sobre alimentacion y nutricion. Podes preguntarme sobre proteinas, calorias, recetas saludables, macronutrientes, y mucho mas.",
        isNutritionRelated: false,
      })
    }

    const reply = getMockResponse(message)

    return NextResponse.json({
      reply,
      isNutritionRelated: true,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
