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
  getWeeklySummaryTool,
} from "@/lib/assistant/tool-impl"

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"

/**
 * Palabras clave que indican que la consulta está relacionada con nutrición.
 * Si ninguna aparece en el texto, se rechaza con un mensaje informativo.
 */
const NUTRITION_KEYWORDS = [
  "proteina", "proteinas", "protein", "proteína", "proteínas",
  "caloria", "calorias", "calories", "caloría", "calorías", "kcal", "kilocalorias",
  "carbohidrato", "carbohidratos", "carbs", "hidrato",
  "grasa", "grasas", "fat",
  "dieta", "nutricion", "nutrición", "nutriente", "micronutriente",
  "vitamina", "mineral", "fibra", "fiber",
  "comida", "comidas", "comer", "alimento", "alimentacion", "alimentación",
  "desayuno", "almuerzo", "cena", "merienda",
  "receta", "recetas", "cocinar", "preparar",
  "saludable", "salud",
  "peso", "engordar", "adelgazar", "bajar", "subir", "masa muscular", "musculo",
  "vegano", "vegetariano", "ayuno", "intermitente",
  "suplemento", "batido", "shake",
  "hidratacion", "hidratación", "agua", "liquido",
  "leche", "fruta", "verdura", "carne", "pescado", "huevo",
  "arroz", "pan", "pasta", "legumbre", "cereal", "avena", "yogur", "queso",
  "aceite", "azucar", "sal", "azúcar",
  "macro", "macros",
  "metabolismo", "digestion", "digestión", "intestino", "hambre", "saciedad",
  "porcion", "porción", "indice glucemico",
  "colesterol", "sodio",
  "objetivo", "meta", "perfil",
  "favorita", "favoritas", "mis recetas",
  "como vengo", "cómo vengo", "como voy", "cómo voy",
  "mis comidas", "hoy", "que comi", "qué comí",
  "me conviene", "que puedo", "qué puedo",
]

function isNutritionRelated(text: string): boolean {
  const lower = text.toLowerCase()
  return NUTRITION_KEYWORDS.some((kw) => lower.includes(kw))
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

/**
 * ¿El usuario pregunta sobre sus comidas del día o resumen nutricional?
 * Se activa cuando hay señales de consulta personal sobre el día actual.
 */
function wantsPersonalFoodData(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes("hoy") ||
    lower.includes("mis comidas") ||
    lower.includes("que comi") ||
    lower.includes("qué comí") ||
    lower.includes("como vengo") ||
    lower.includes("cómo vengo") ||
    lower.includes("como voy") ||
    lower.includes("cómo voy") ||
    lower.includes("me conviene cenar") ||
    lower.includes("me conviene comer") ||
    lower.includes("proteina") ||
    lower.includes("proteína") ||
    lower.includes("caloria") ||
    lower.includes("caloría") ||
    lower.includes("macros")
  )
}

/**
 * ¿El usuario pregunta sobre su progreso de la semana?
 * V2: detecta preguntas sobre tendencias, consistencia o resumen semanal.
 */
function wantsWeeklyProgress(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes("semana") ||
    lower.includes("esta semana") ||
    lower.includes("ultimos dias") ||
    lower.includes("últimos días") ||
    lower.includes("últimos 7") ||
    lower.includes("como voy en la semana") ||
    lower.includes("cómo voy en la semana") ||
    lower.includes("progreso") ||
    lower.includes("tendencia") ||
    lower.includes("consistencia") ||
    lower.includes("promedio")
  )
}

/**
 * ¿El usuario pregunta sobre recetas o qué puede cocinar?
 */
function wantsRecipes(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes("favorita") ||
    lower.includes("favoritas") ||
    lower.includes("mis recetas") ||
    lower.includes("receta") ||
    lower.includes("que puedo cocinar") ||
    lower.includes("qué puedo cocinar") ||
    lower.includes("que cocino") ||
    lower.includes("qué cocino") ||
    lower.includes("que preparo") ||
    lower.includes("qué preparo")
  )
}

/**
 * Construye el array de Content para Gemini en formato multi-turn.
 * El último mensaje del usuario recibe el bloque de contexto de la app
 * para que Gemini tenga datos reales al responder.
 */
function buildGeminiContents(
  messages: AssistantMessage[],
  contextBlocks: string[]
): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  return messages.map((msg, idx) => {
    const isLast = idx === messages.length - 1
    const geminiRole = msg.role === "assistant" ? "model" : "user"

    if (isLast && geminiRole === "user" && contextBlocks.length > 0) {
      const contextSection = [
        "[Datos actuales del usuario en la app]",
        contextBlocks.join("\n\n"),
        "[Consulta del usuario]",
        msg.content,
      ].join("\n")

      return { role: "user" as const, parts: [{ text: contextSection }] }
    }

    return { role: geminiRole as "user" | "model", parts: [{ text: msg.content }] }
  })
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta GEMINI_API_KEY en el servidor" },
        { status: 500 }
      )
    }

    const token = request.cookies.get("auth-token")?.value ?? null
    const profileId = request.headers.get("x-profile-id")

    if (!token) {
      return NextResponse.json(
        { error: "No autenticado. Iniciá sesión nuevamente." },
        { status: 401 }
      )
    }

    if (!profileId) {
      return NextResponse.json({ error: "Falta X-Profile-Id" }, { status: 400 })
    }

    const body = (await request.json()) as AssistantRequest
    const messages = normalizeMessages(body)

    if (messages.length === 0) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
    }

    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? ""

    // Rechazar preguntas fuera del dominio de nutrición
    if (!isNutritionRelated(lastUserMessage)) {
      const response: AssistantResponse = {
        reply:
          "Solo puedo ayudarte con temas de alimentación y nutrición: proteínas, calorías, recetas, macros, hidratación, hábitos alimentarios. ¿Querés preguntarme algo sobre eso?",
        usedTools: [],
        isNutritionRelated: false,
      }
      return NextResponse.json(response)
    }

    const usedTools: string[] = []
    const contextBlocks: string[] = []

    // Perfil activo: siempre se incluye para todas las consultas de nutrición.
    // Es contexto esencial que personaliza cada respuesta (nombre, objetivo).
    try {
      const activeProfile = await getActiveProfileTool({ token, profileId })
      usedTools.push("getActiveProfile")

      const today = new Date().toLocaleDateString("es-AR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      contextBlocks.push(
        [
          `Perfil activo: ${activeProfile.name}`,
          `Objetivo: ${activeProfile.goal ?? "sin objetivo definido"}`,
          `Fecha de hoy: ${today}`,
        ].join("\n")
      )
    } catch (error) {
      console.error("getActiveProfileTool error:", error)
      // No es fatal: Gemini responderá sin datos de perfil
    }

    // Comidas del día + resumen nutricional: se incluyen cuando el usuario
    // pregunta por su seguimiento personal o macros acumulados.
    if (wantsPersonalFoodData(lastUserMessage)) {
      try {
        const [todayMeals, nutritionSummary] = await Promise.all([
          getTodayMealsTool({ token, profileId }),
          getNutritionSummaryTool({ token, profileId }),
        ])

        usedTools.push("getTodayMeals", "getNutritionSummary")

        if (todayMeals.meals.length === 0) {
          contextBlocks.push(`Comidas registradas hoy (${todayMeals.date}): ninguna todavía.`)
        } else {
          const mealsDetail = todayMeals.meals
            .map(
              (m) =>
                `  • ${m.title} (${m.type}): ${m.calories} kcal | ${m.protein}g prot | ${m.carbs}g carbs | ${m.fat}g grasas`
            )
            .join("\n")

          contextBlocks.push(
            [
              `Comidas registradas hoy (${todayMeals.date}):`,
              mealsDetail,
              `Totales del día: ${nutritionSummary.totalCalories} kcal | ${nutritionSummary.totalProtein}g proteína | ${nutritionSummary.totalCarbs}g carbohidratos | ${nutritionSummary.totalFat}g grasas`,
            ].join("\n")
          )
        }
      } catch (error) {
        console.error("todayMeals/nutritionSummary error:", error)
        contextBlocks.push("No se pudieron obtener las comidas del día en este momento.")
      }
    }

    // Resumen semanal (V2): se activa cuando el usuario pregunta por su progreso
    // de los últimos días, tendencias o consistencia durante la semana.
    if (wantsWeeklyProgress(lastUserMessage)) {
      try {
        const weekly = await getWeeklySummaryTool({ token, profileId })
        usedTools.push("getWeeklySummary")

        const dayLines = weekly.days
          .map((d) =>
            d.hasData
              ? `  • ${d.dayName} ${d.date}: ${d.totalCalories} kcal | ${d.totalProtein}g prot | ${d.totalCarbs}g carbs | ${d.totalFat}g grasas (${d.mealsCount} comida${d.mealsCount !== 1 ? "s" : ""})`
              : `  • ${d.dayName} ${d.date}: sin registro`
          )
          .join("\n")

        contextBlocks.push(
          [
            `Resumen de los últimos 7 días (${weekly.weekStart} al ${weekly.weekEnd}):`,
            dayLines,
            `Días con registro: ${weekly.daysWithData} de 7`,
            `Promedios (días con datos): ${weekly.avgCalories} kcal | ${weekly.avgProtein}g proteína | ${weekly.avgCarbs}g carbohidratos | ${weekly.avgFat}g grasas`,
          ].join("\n")
        )
      } catch (error) {
        console.error("getWeeklySummaryTool error:", error)
        contextBlocks.push("No se pudo obtener el resumen semanal en este momento.")
      }
    }

    // Recetas favoritas: solo cuando el usuario pregunta explícitamente por recetas.
    if (wantsRecipes(lastUserMessage)) {
      try {
        const favoriteRecipes = await getFavoriteRecipesTool({ token, profileId })
        usedTools.push("getFavoriteRecipes")

        if (favoriteRecipes.recipes.length === 0) {
          contextBlocks.push("Recetas favoritas: no hay recetas guardadas como favoritas aún.")
        } else {
          const recipesDetail = favoriteRecipes.recipes
            .map(
              (r) =>
                `  • ${r.title}${r.description ? `: ${r.description}` : ""}${r.timeMinutes ? ` | ${r.timeMinutes} min` : ""}${r.calories ? ` | ${r.calories} kcal` : ""}`
            )
            .join("\n")

          contextBlocks.push(`Recetas favoritas del usuario:\n${recipesDetail}`)
        }
      } catch (error) {
        console.error("getFavoriteRecipesTool error:", error)
        contextBlocks.push("No se pudieron obtener las recetas favoritas en este momento.")
      }
    }

    // Construir la conversación multi-turn para Gemini.
    // El último mensaje del usuario lleva el contexto de la app adjunto.
    const contents = buildGeminiContents(messages, contextBlocks)

    try {
      const ai = new GoogleGenAI({ apiKey })

      const result = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: NUTRITION_ASSISTANT_SYSTEM_PROMPT,
        },
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

      const errMsg =
        geminiError instanceof Error ? geminiError.message : String(geminiError)
      const isRateLimit =
        errMsg.includes("429") ||
        errMsg.toUpperCase().includes("RESOURCE_EXHAUSTED") ||
        errMsg.toLowerCase().includes("quota")

      if (isRateLimit) {
        return NextResponse.json(
          { error: "Alcanzaste el límite de solicitudes de IA. Esperá unos segundos e intentá de nuevo." },
          { status: 429 }
        )
      }

      return NextResponse.json({
        reply: "Hubo un problema al conectar con la IA. Intentá de nuevo en unos segundos.",
        usedTools,
        isNutritionRelated: true,
      })
    }
  } catch (error) {
    console.error("POST /api/chat fatal error:", error)
    return NextResponse.json(
      {
        reply: "Ocurrió un error interno. Intentá de nuevo.",
        usedTools: [],
        isNutritionRelated: true,
      },
      { status: 200 }
    )
  }
}
