import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import type {
  AssistantMessage,
  AssistantRequest,
  AssistantResponse,
} from "@/lib/assistant/types"
import { NUTRITION_ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant/system-prompt"
import {
  getActiveProfileTool,
  getFavoriteRecipesTool,
  getTodayMealsTool,
  getNutritionSummaryTool,
} from "@/lib/assistant/tool-impl"

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"

const NUTRITION_KEYWORDS = [
  "proteina",
  "proteinas",
  "protein",
  "caloria",
  "calorias",
  "calories",
  "carbohidrato",
  "carbohidratos",
  "carbs",
  "grasa",
  "grasas",
  "fat",
  "dieta",
  "nutricion",
  "nutriente",
  "vitamina",
  "mineral",
  "fiber",
  "fibra",
  "comida",
  "comer",
  "alimento",
  "alimentacion",
  "desayuno",
  "almuerzo",
  "cena",
  "merienda",
  "receta",
  "recetas",
  "cocinar",
  "saludable",
  "peso",
  "engordar",
  "adelgazar",
  "bajar",
  "subir",
  "masa muscular",
  "musculo",
  "vegano",
  "vegetariano",
  "ayuno",
  "intermitente",
  "suplemento",
  "batido",
  "hidratacion",
  "agua",
  "leche",
  "fruta",
  "verdura",
  "carne",
  "pescado",
  "huevo",
  "arroz",
  "pan",
  "pasta",
  "legumbre",
  "cereal",
  "avena",
  "yogur",
  "queso",
  "aceite",
  "azucar",
  "sal",
  "macro",
  "macros",
  "micronutriente",
  "metabolismo",
  "digestion",
  "intestino",
  "hambre",
  "saciedad",
  "porcion",
  "kcal",
  "kilocalorias",
  "indice glucemico",
  "colesterol",
  "sodio",
  "perfil",
  "objetivo",
  "favorita",
  "favoritas",
]

function isNutritionRelated(text: string): boolean {
  const lower = text.toLowerCase()
  return NUTRITION_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function normalizeMessages(body: AssistantRequest): AssistantMessage[] {
  if ("messages" in body && Array.isArray(body.messages) && body.messages.length > 0) {
    return body.messages
  }

  if ("message" in body && typeof body.message === "string" && body.message.trim()) {
    return [{ role: "user", content: body.message.trim() }]
  }

  return []
}

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null
  return authHeader.slice(7).trim() || null
}

function shouldUseActiveProfileTool(text: string): boolean {
  const lower = text.toLowerCase()

  return (
    lower.includes("mi objetivo") ||
    lower.includes("objetivo actual") ||
    lower.includes("mi perfil") ||
    lower.includes("perfil activo") ||
    lower.includes("teniendo en cuenta mi objetivo") ||
    lower.includes("segun mi objetivo")
  )
}

function shouldUseFavoriteRecipesTool(text: string): boolean {
  const lower = text.toLowerCase()

  return (
    lower.includes("favorita") ||
    lower.includes("favoritas") ||
    lower.includes("mis recetas") ||
    lower.includes("mis recetas favoritas") ||
    lower.includes("que receta") ||
    lower.includes("qué receta") ||
    lower.includes("que puedo cocinar") ||
    lower.includes("qué puedo cocinar")
  )
}
function shouldUseTodayMealsTool(text: string): boolean {
  const lower = text.toLowerCase()

  return (
    lower.includes("como vengo hoy") ||
    lower.includes("cómo vengo hoy") ||
    lower.includes("que comi hoy") ||
    lower.includes("qué comí hoy") ||
    lower.includes("que me conviene cenar") ||
    lower.includes("qué me conviene cenar") ||
    lower.includes("que me conviene comer hoy") ||
    lower.includes("qué me conviene comer hoy") ||
    lower.includes("como vengo con la comida") ||
    lower.includes("cómo vengo con la comida") ||
    lower.includes("hoy")
  )
}

function shouldUseNutritionSummaryTool(text: string): boolean {
  const lower = text.toLowerCase()

  return (
    lower.includes("proteina") ||
    lower.includes("proteínas") ||
    lower.includes("proteinas") ||
    lower.includes("calorias") ||
    lower.includes("calorías") ||
    lower.includes("macros") ||
    lower.includes("como vengo hoy") ||
    lower.includes("cómo vengo hoy") ||
    lower.includes("me conviene cenar") ||
    lower.includes("me conviene comer")
  )
}

function buildConversation(messages: AssistantMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role === "assistant" ? "Asistente" : "Usuario"
      return `${role}: ${msg.content}`
    })
    .join("\n\n")
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta GEMINI_API_KEY en el backend web" },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get("authorization")
    const profileId = request.headers.get("x-profile-id")
    const token = getBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: "Falta Authorization Bearer token" },
        { status: 401 }
      )
    }

    if (!profileId) {
      return NextResponse.json(
        { error: "Falta X-Profile-Id" },
        { status: 400 }
      )
    }

    const body = (await request.json()) as AssistantRequest
    const messages = normalizeMessages(body)

    if (messages.length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === "user")?.content || ""

    if (!isNutritionRelated(lastUserMessage)) {
      const response: AssistantResponse = {
        reply:
          "Esta IA solo responde consultas sobre alimentación y nutrición. Podés preguntarme sobre proteínas, calorías, recetas saludables, macronutrientes, hidratación, objetivos del perfil y recetas favoritas.",
        usedTools: [],
        isNutritionRelated: false,
      }

      return NextResponse.json(response)
    }

    const usedTools: string[] = []
    const contextBlocks: string[] = []

    if (shouldUseActiveProfileTool(lastUserMessage)) {
      const activeProfile = await getActiveProfileTool({ token, profileId })
      usedTools.push("getActiveProfile")

      contextBlocks.push(
        `Perfil activo:
- id: ${activeProfile.id}
- nombre: ${activeProfile.name}
- objetivo: ${activeProfile.goal ?? "sin objetivo definido"}
- avatarUrl: ${activeProfile.avatarUrl ?? "sin avatar"}`
      )
    }

    if (shouldUseFavoriteRecipesTool(lastUserMessage)) {
      const favorites = await getFavoriteRecipesTool({ token, profileId })
      usedTools.push("getFavoriteRecipes")

      if (favorites.recipes.length === 0) {
        contextBlocks.push("Recetas favoritas: el perfil activo no tiene recetas favoritas guardadas.")
      } else {
        const recipesText = favorites.recipes
          .map(
            (recipe) =>
              `- ${recipe.title} | descripción: ${recipe.description ?? "sin descripción"} | tiempo: ${
                recipe.timeMinutes ?? "sin dato"
              } min | calorías: ${recipe.calories ?? "sin dato"}`
          )
          .join("\n")

        contextBlocks.push(`Recetas favoritas del perfil activo:\n${recipesText}`)
      }
    }
        if (shouldUseTodayMealsTool(lastUserMessage)) {
      const todayMeals = await getTodayMealsTool({ token, profileId })
      usedTools.push("getTodayMeals")

      if (todayMeals.meals.length === 0) {
        contextBlocks.push(`Comidas de hoy (${todayMeals.date}): no hay comidas registradas hoy.`)
      } else {
        const mealsText = todayMeals.meals
          .map(
            (meal) =>
              `- ${meal.title} | tipo: ${meal.type} | calorías: ${meal.calories ?? "sin dato"} | proteína: ${
                meal.protein ?? "sin dato"
              } | carbs: ${meal.carbs ?? "sin dato"} | grasas: ${meal.fat ?? "sin dato"}`
          )
          .join("\n")

        contextBlocks.push(`Comidas registradas hoy (${todayMeals.date}):\n${mealsText}`)
      }
    }

    if (shouldUseNutritionSummaryTool(lastUserMessage)) {
      const summary = await getNutritionSummaryTool({ token, profileId })
      usedTools.push("getNutritionSummary")

      contextBlocks.push(
        `Resumen nutricional de hoy (${summary.date}):
- comidas registradas: ${summary.mealsCount}
- calorías totales: ${summary.totalCalories}
- proteína total: ${summary.totalProtein}
- carbohidratos totales: ${summary.totalCarbs}
- grasas totales: ${summary.totalFat}`
      )
    }

    const fullPrompt = `
${NUTRITION_ASSISTANT_SYSTEM_PROMPT}

${contextBlocks.length > 0 ? `Contexto real de la app:\n${contextBlocks.join("\n\n")}\n` : ""}

Conversación:
${buildConversation(messages)}

Instrucciones adicionales:
- Si usás contexto del perfil o recetas favoritas, basate solo en los datos recibidos.
- Si faltan datos relevantes, decilo de forma clara y no los inventes.
- Respondé al último mensaje del usuario.
`.trim()

    const ai = new GoogleGenAI({ apiKey })

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: fullPrompt,
    })

    const reply =
      result.text?.trim() ||
      "No pude generar una respuesta en este momento. Intentá de nuevo."

    const response: AssistantResponse = {
      reply,
      usedTools,
      isNutritionRelated: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("POST /api/chat error:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}