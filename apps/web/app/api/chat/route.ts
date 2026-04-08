import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import type {
  AssistantMessage,
  AssistantRequest,
  AssistantResponse,
  ActiveProfileToolResult,
  FavoriteRecipesToolResult,
  TodayMealsToolResult,
  NutritionSummaryToolResult,
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
  "comidas",
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
  "como vengo",
  "cómo vengo",
  "como voy",
  "cómo voy",
  "mis comidas",
  "hoy",
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
    lower.includes("segun mi objetivo") ||
    lower.includes("según mi objetivo")
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
    lower.includes("como voy hoy") ||
    lower.includes("cómo voy hoy") ||
    lower.includes("como voy con mis comidas") ||
    lower.includes("cómo voy con mis comidas") ||
    lower.includes("como vengo con mis comidas") ||
    lower.includes("cómo vengo con mis comidas") ||
    lower.includes("que comi hoy") ||
    lower.includes("qué comí hoy") ||
    lower.includes("que me conviene cenar") ||
    lower.includes("qué me conviene cenar") ||
    lower.includes("que me conviene comer hoy") ||
    lower.includes("qué me conviene comer hoy") ||
    lower.includes("como vengo con la comida") ||
    lower.includes("cómo vengo con la comida") ||
    lower.includes("mis comidas") ||
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
    lower.includes("como voy hoy") ||
    lower.includes("cómo voy hoy") ||
    lower.includes("como voy con mis comidas") ||
    lower.includes("cómo voy con mis comidas") ||
    lower.includes("como vengo con mis comidas") ||
    lower.includes("cómo vengo con mis comidas") ||
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

function buildDirectObjectiveReply(profile: ActiveProfileToolResult | null) {
  if (!profile) {
    return "No pude obtener tu perfil activo en este momento."
  }

  return profile.goal
    ? `Tu objetivo actual es: ${profile.goal}.`
    : "Tu perfil activo no tiene un objetivo definido todavía."
}

function buildDirectMealsReply(
  summary: NutritionSummaryToolResult | null,
  todayMeals: TodayMealsToolResult | null,
  profile: ActiveProfileToolResult | null
) {
  if (!summary || !todayMeals) {
    return "No pude obtener tus comidas de hoy en este momento."
  }

  if (summary.mealsCount === 0) {
    return profile?.goal
      ? `Hoy no tenés comidas registradas todavía. Teniendo en cuenta tu objetivo (${profile.goal}), podrías empezar cargando tu próxima comida para poder orientarte mejor.`
      : "Hoy no tenés comidas registradas todavía."
  }

  const mealNames =
    todayMeals.meals.length > 0
      ? todayMeals.meals.map((meal) => meal.title).join(", ")
      : "sin detalle"

  return profile?.goal
    ? `Hoy llevás ${summary.mealsCount} comida(s) registrada(s): ${mealNames}. Acumulás ${summary.totalCalories} kcal, ${summary.totalProtein} g de proteína, ${summary.totalCarbs} g de carbohidratos y ${summary.totalFat} g de grasas. Esto lo estoy leyendo en el contexto de tu objetivo actual: ${profile.goal}.`
    : `Hoy llevás ${summary.mealsCount} comida(s) registrada(s): ${mealNames}. Acumulás ${summary.totalCalories} kcal, ${summary.totalProtein} g de proteína, ${summary.totalCarbs} g de carbohidratos y ${summary.totalFat} g de grasas.`
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
          "Esta IA solo responde consultas sobre alimentación y nutrición. Podés preguntarme sobre proteínas, calorías, recetas saludables, macronutrientes, hidratación, objetivos del perfil y comidas del día.",
        usedTools: [],
        isNutritionRelated: false,
      }

      return NextResponse.json(response)
    }

    const usedTools: string[] = []
    const contextBlocks: string[] = []

    let activeProfile: ActiveProfileToolResult | null = null
    let favoriteRecipes: FavoriteRecipesToolResult | null = null
    let todayMeals: TodayMealsToolResult | null = null
    let nutritionSummary: NutritionSummaryToolResult | null = null

    if (shouldUseActiveProfileTool(lastUserMessage)) {
      try {
        activeProfile = await getActiveProfileTool({ token, profileId })
        usedTools.push("getActiveProfile")

        contextBlocks.push(
          `Perfil activo:
- id: ${activeProfile.id}
- nombre: ${activeProfile.name}
- objetivo: ${activeProfile.goal ?? "sin objetivo definido"}
- avatarUrl: ${activeProfile.avatarUrl ?? "sin avatar"}`
        )
      } catch (error) {
        console.error("getActiveProfileTool error:", error)
        contextBlocks.push("No se pudo obtener el perfil activo en este momento.")
      }
    }

    if (shouldUseFavoriteRecipesTool(lastUserMessage)) {
      try {
        favoriteRecipes = await getFavoriteRecipesTool({ token, profileId })
        usedTools.push("getFavoriteRecipes")

        if (favoriteRecipes.recipes.length === 0) {
          contextBlocks.push(
            "Recetas favoritas: el perfil activo no tiene recetas favoritas guardadas."
          )
        } else {
          const recipesText = favoriteRecipes.recipes
            .map(
              (recipe) =>
                `- ${recipe.title} | descripción: ${recipe.description ?? "sin descripción"} | tiempo: ${
                  recipe.timeMinutes ?? "sin dato"
                } min | calorías: ${recipe.calories ?? "sin dato"}`
            )
            .join("\n")

          contextBlocks.push(`Recetas favoritas del perfil activo:\n${recipesText}`)
        }
      } catch (error) {
        console.error("getFavoriteRecipesTool error:", error)
        contextBlocks.push("No se pudieron obtener las recetas favoritas en este momento.")
      }
    }

    if (shouldUseTodayMealsTool(lastUserMessage)) {
      try {
        todayMeals = await getTodayMealsTool({ token, profileId })
        usedTools.push("getTodayMeals")

        if (todayMeals.meals.length === 0) {
          contextBlocks.push(
            `Comidas de hoy (${todayMeals.date}): no hay comidas registradas hoy.`
          )
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
      } catch (error) {
        console.error("getTodayMealsTool error:", error)
        contextBlocks.push("No se pudieron obtener las comidas de hoy en este momento.")
      }
    }

    if (shouldUseNutritionSummaryTool(lastUserMessage)) {
      try {
        nutritionSummary = await getNutritionSummaryTool({ token, profileId })
        usedTools.push("getNutritionSummary")

        contextBlocks.push(
          `Resumen nutricional de hoy (${nutritionSummary.date}):
- comidas registradas: ${nutritionSummary.mealsCount}
- calorías totales: ${nutritionSummary.totalCalories}
- proteína total: ${nutritionSummary.totalProtein}
- carbohidratos totales: ${nutritionSummary.totalCarbs}
- grasas totales: ${nutritionSummary.totalFat}`
        )
      } catch (error) {
        console.error("getNutritionSummaryTool error:", error)
        contextBlocks.push("No se pudo obtener el resumen nutricional de hoy en este momento.")
      }
    }

    // Respuestas directas para los casos críticos, sin depender de Gemini
    if (
      shouldUseActiveProfileTool(lastUserMessage) &&
      !shouldUseFavoriteRecipesTool(lastUserMessage) &&
      !shouldUseTodayMealsTool(lastUserMessage) &&
      !shouldUseNutritionSummaryTool(lastUserMessage)
    ) {
      const response: AssistantResponse = {
        reply: buildDirectObjectiveReply(activeProfile),
        usedTools,
        isNutritionRelated: true,
      }

      return NextResponse.json(response)
    }

    if (shouldUseTodayMealsTool(lastUserMessage) || shouldUseNutritionSummaryTool(lastUserMessage)) {
      if (activeProfile === null && shouldUseActiveProfileTool(lastUserMessage)) {
        try {
          activeProfile = await getActiveProfileTool({ token, profileId })
          if (!usedTools.includes("getActiveProfile")) {
            usedTools.push("getActiveProfile")
          }
        } catch (error) {
          console.error("late getActiveProfileTool error:", error)
        }
      }

      const directMealsReply = buildDirectMealsReply(
        nutritionSummary,
        todayMeals,
        activeProfile
      )

      const response: AssistantResponse = {
        reply: directMealsReply,
        usedTools,
        isNutritionRelated: true,
      }

      return NextResponse.json(response)
    }

    const fullPrompt = `
${NUTRITION_ASSISTANT_SYSTEM_PROMPT}

${contextBlocks.length > 0 ? `Contexto real de la app:\n${contextBlocks.join("\n\n")}\n` : ""}

Conversación:
${buildConversation(messages)}

Instrucciones adicionales:
- Si usás contexto del perfil, comidas o recetas, basate solo en los datos recibidos.
- Si faltan datos relevantes, decilo de forma clara y no los inventes.
- Si una tool no devolvió datos, seguí respondiendo igual con prudencia.
- Respondé al último mensaje del usuario.
`.trim()

    try {
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
    } catch (geminiError) {
      console.error("Gemini generateContent error:", geminiError)

      const fallbackReply =
        activeProfile
          ? `Pude recuperar parte de tu contexto. Tu objetivo actual es ${
              activeProfile.goal ?? "sin objetivo definido"
            }, pero no pude generar una respuesta completa en este momento.`
          : "No pude generar una respuesta completa en este momento."

      const response: AssistantResponse = {
        reply: fallbackReply,
        usedTools,
        isNutritionRelated: true,
      }

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error("POST /api/chat fatal error:", error)

    return NextResponse.json(
      {
        reply: "Ocurrió un error interno al procesar la consulta.",
        usedTools: [],
        isNutritionRelated: true,
      },
      { status: 200 }
    )
  }
}