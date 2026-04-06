export const ASSISTANT_TOOLS = [
  {
    name: "getActiveProfile",
    description:
      "Obtiene el perfil activo del usuario, incluyendo nombre, objetivo y avatar.",
  },
  {
    name: "getFavoriteRecipes",
    description:
      "Obtiene las recetas favoritas del perfil activo, con título, descripción, tiempo y calorías.",
  },
] as const

export type AssistantToolName =
  | "getActiveProfile"
  | "getFavoriteRecipes"