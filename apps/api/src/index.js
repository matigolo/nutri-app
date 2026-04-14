const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const profileContext = require("./middlewares/profileContext");
const auth = require("./middlewares/auth");
const prisma = require("./prisma");
const express = require("express")
const cors = require("cors")
require("dotenv").config()

const app = express()

// Necesario para que express-rate-limit funcione correctamente detrás del
// proxy de Railway (y cualquier otro reverse proxy en producción).
app.set("trust proxy", 1)

/**
 * Validación de variables de entorno críticas al arrancar.
 * En producción, un JWT_SECRET débil o ausente es un riesgo crítico porque
 * cualquiera podría forjar tokens válidos para cualquier userId.
 * Genera error fatal en producción y advertencia en desarrollo.
 */
const WEAK_SECRETS = ["super_secret_dev_key", "secret", "jwt_secret", "changeme", ""]
const jwtSecret = process.env.JWT_SECRET || ""

if (!jwtSecret || WEAK_SECRETS.includes(jwtSecret.toLowerCase())) {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "FATAL: JWT_SECRET no está configurado o usa un valor inseguro. " +
      "Generá un secreto aleatorio con: openssl rand -base64 32"
    )
    process.exit(1)
  } else {
    console.warn(
      "ADVERTENCIA DE SEGURIDAD: JWT_SECRET usa el valor por defecto inseguro. " +
      "Cambiarlo antes de desplegar en producción. " +
      "Podés generar uno con: openssl rand -base64 32"
    )
  }
}

/**
 * Configuración de CORS.
 * En producción, establecer ALLOWED_ORIGIN en las variables de entorno.
 * Por defecto apunta a localhost:3000 para desarrollo local.
 */
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Profile-Id"],
  credentials: false,
}

app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))

/**
 * Límite de tamaño del body JSON: 100kb.
 * Protege contra ataques de DoS por payloads demasiado grandes.
 */
app.use(express.json({ limit: "10mb" }))

/**
 * Rate limiting para endpoints de autenticación.
 * Limita a 10 intentos por IP cada 15 minutos para prevenir fuerza bruta.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intentá nuevamente en 15 minutos." },
})


app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
/**
 * Registra un nuevo usuario con email y contraseña.
 * Opcionalmente crea el primer perfil con nombre y objetivo.
 * Aplica rate limiting de 10 intentos/15min por IP.
 *
 * @body {string} email
 * @body {string} password - Mínimo 8 caracteres
 * @body {string} [firstProfileName]
 * @body {string} [firstProfileGoal]
 * @returns {201} Usuario creado con sus perfiles
 */
app.post("/auth/register", authLimiter, async (req, res) => {
  try {
    const { email, password, firstProfileName, firstProfileGoal } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email y password son requeridos" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "la contraseña debe tener al menos 8 caracteres" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "email ya registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profiles: firstProfileName
          ? {
              create: [
                {
                  name: firstProfileName.trim(),
                  goal:
                    firstProfileGoal && String(firstProfileGoal).trim()
                      ? String(firstProfileGoal).trim()
                      : null,
                },
              ],
            }
          : undefined,
      },
      include: { profiles: true },
    });

    return res.status(201).json({
      id: user.id.toString?.() ?? user.id,
      email: user.email,
      profiles:
        user.profiles?.map((p) => ({
          id: p.id.toString?.() ?? p.id,
          name: p.name,
          goal: p.goal,
        })) ?? [],
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Autentica un usuario y devuelve un token JWT válido por 7 días.
 * Aplica rate limiting de 10 intentos/15min por IP.
 *
 * @body {string} email
 * @body {string} password
 * @returns {200} Token JWT y lista de perfiles del usuario
 */
app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email y password son requeridos" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profiles: true },
    });

    if (!user) return res.status(401).json({ error: "credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "credenciales inválidas" });

    const token = jwt.sign(
    { userId: user.id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" });


    return res.json({
      token,
      user: {
        id: user.id.toString?.() ?? user.id,
        email: user.email,
      },
      profiles: user.profiles.map((p) => ({
        id: p.id.toString?.() ?? p.id,
        name: p.name,
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});
/**
 * Devuelve los datos del usuario autenticado.
 * El payload del token está disponible en req.user gracias al middleware auth.
 *
 * @returns {200} Payload del JWT del usuario (userId, iat, exp)
 */
app.get("/me", auth, async (req, res) => {
  return res.json({ user: req.user });
});

/**
 * Crea un nuevo perfil para el usuario autenticado.
 * Verifica que no exista ya un perfil con el mismo nombre bajo la misma cuenta.
 *
 * @body {string} name - Nombre del perfil (requerido, único por usuario)
 * @body {string} [goal] - Objetivo nutricional del perfil
 * @returns {201} Perfil creado
 */
app.post("/profiles", auth, async (req, res) => {
  try {
    const { name, goal } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name es requerido" });
    }
    const cleanName = name.trim();
    const cleanGoal = goal && String(goal).trim() ? String(goal).trim() : null
    const existingprofile = await prisma.profile.findFirst({ // me fijo que exista un perfil en la misma cuenta (con userID) y que se llame igual
        where: {
            name: cleanName,
            userId: req.userId,
        },
    });
    if (existingprofile){
        return res.status(400).json({ error: `el perfil ${cleanName} ya existe` });
    }
    const profile = await prisma.profile.create({
      data: {
        name: cleanName,
        goal: cleanGoal,
        userId: req.userId,
      },
    });

    return res.status(201).json({
      id: profile.id.toString(),
      userId: profile.userId.toString(),
      name: profile.name,
      goal: profile.goal,
      createdAt: profile.createdAt,
  });
  } catch (err) {
    console.error("ERROR /profiles:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});
/**
 * Devuelve todos los perfiles del usuario autenticado, ordenados por id ascendente.
 *
 * @returns {200} Lista de perfiles (id, name, goal, avatarUrl, createdAt)
 */
app.get("/profiles", auth, async (req, res) =>  {
  try{
    const profiles = await prisma.profile.findMany({
        where: {
            userId: req.userId,
        },
        orderBy: { id: "asc" },
        select: {
            id: true,
            userId: true,
            name: true,
            goal: true,
            avatarUrl:true,
            createdAt: true,
        },
    });
    return res.json({
        profiles: profiles.map((p) => ({
        id: p.id.toString(),
        userId: p.userId.toString(),
        name: p.name,
        goal: p.goal,
        avatarUrl: p.avatarUrl,
        createdAt: p.createdAt,})),
    })}
    catch (err) {
    console.error("ERROR GET /profiles:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
    
} )
/**
 * Elimina un perfil del usuario autenticado.
 * No permite eliminar el último perfil de la cuenta.
 * El cascade del schema elimina meals, items y favoritos asociados.
 *
 * @param {string} id - ID del perfil a eliminar
 * @returns {200} { ok: true, deletedProfileId }
 */
app.delete("/profiles/:id", auth, async (req, res) => {
  try {
    const profileIdStr = req.params.id;
    if (!profileIdStr) {
      return res.status(400).json({ error: "id es requerido" });
    }

    // Prisma con MySQL BigInt: usá BigInt() en Node
    let profileId;
    try {
      profileId = BigInt(profileIdStr);
    } catch {
      return res.status(400).json({ error: "id inválido" });
    }

    // 1) traer el perfil y validar ownership
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId: req.userId },
      select: { id: true, userId: true, name: true },
    });

    if (!profile) {
      return res.status(404).json({ error: "perfil no encontrado" });
    }

    // 2) contar perfiles del user (para evitar borrar el último)
    const count = await prisma.profile.count({
      where: { userId: req.userId },
    });

    if (count <= 1) {
      return res.status(400).json({ error: "no podés eliminar el último perfil" });
    }

    // 3) borrar (cascade borra meals/items/favorites por tus relaciones)
    await prisma.profile.delete({
      where: { id: profileId },
    });

    return res.json({
      ok: true,
      deletedProfileId: profile.id.toString(),
    });
  } catch (err) {
    console.error("ERROR DELETE /profiles/:id:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Actualiza el campo goal de un perfil.
 *
 * @param {string} id - ID del perfil
 * @body {string|null} goal - Nuevo objetivo del perfil
 * @returns {200} Perfil actualizado
 */
app.patch("/profiles/:id", auth, async (req, res) => {
  try {
    const profileIdStr = req.params.id;
    let profileId;
    try {
      profileId = BigInt(profileIdStr);
    } catch {
      return res.status(400).json({ error: "id inválido" });
    }

    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId: req.userId },
    });

    if (!profile) {
      return res.status(404).json({ error: "perfil no encontrado" });
    }

    const { goal } = req.body;

    const updated = await prisma.profile.update({
      where: { id: profileId },
      data: { goal: goal ?? null },
    });

    return res.json({
      id: updated.id.toString(),
      name: updated.name,
      goal: updated.goal,
    });
  } catch (err) {
    console.error("ERROR PATCH /profiles/:id:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Devuelve el perfil activo validado por el middleware profileContext.
 * Requiere el header X-Profile-Id además del token JWT.
 *
 * @returns {200} { profileId, profile: { id, name } }
 */
app.get("/profile/active", auth, profileContext, (req, res) => {
  return res.json({
    profileId: req.profileId.toString(),
    profile: req.profile,
  });
});
/**
 * Crea una nueva comida con sus ítems nutricionales para el perfil activo.
 *
 * @body {string} mealType - Tipo de comida: breakfast | lunch | snack | dinner
 * @body {string} [mealDate] - Fecha ISO de la comida (por defecto: ahora)
 * @body {string} [notes] - Notas opcionales
 * @body {Array}  [items] - Items nutricionales de la comida
 * @body {string}  items[].name
 * @body {number}  [items[].quantity]
 * @body {string}  [items[].unit]
 * @body {number}  [items[].calories]
 * @body {number}  [items[].protein]
 * @body {number}  [items[].carbs]
 * @body {number}  [items[].fat]
 * @returns {201} Comida creada con sus ítems
 */
app.post("/meals", auth, profileContext, async (req, res) => {
  try {
    const { mealType, mealDate, notes, items } = req.body;

    const VALID_MEAL_TYPES = ["desayuno", "almuerzo", "merienda", "cena"];
    if (!mealType || !VALID_MEAL_TYPES.includes(mealType.trim().toLowerCase())) {
      return res.status(400).json({ error: "mealType debe ser: desayuno, almuerzo, merienda o cena" });
    }

    const date = mealDate ? new Date(mealDate) : new Date();
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: "mealDate inválido" });
    }

    const safeItems = Array.isArray(items) ? items : [];

    const meal = await prisma.meal.create({
      data: {
        profileId: req.profileId,
        mealType: mealType.trim(),
        mealDate: date,
        notes: notes?.trim() || null,

        ...(safeItems.length > 0
          ? {
              items: {
                create: safeItems.map((it) => ({
                  name: String(it.name || "").trim(),
                  // Decimals: si te llega string o number, Prisma suele bancar; si falla, mandalo string.
                  quantity: it.quantity ?? null,
                  unit: it.unit ?? null,
                  calories: it.calories ?? null,
                  protein: it.protein ?? null,
                  carbs: it.carbs ?? null,
                  fat: it.fat ?? null,
                })),
              },
            }
          : {}),
      },
      include: { items: true },
    });

    return res.status(201).json({
      id: meal.id.toString(),
      profileId: meal.profileId.toString(),
      mealType: meal.mealType,
      mealDate: meal.mealDate,
      notes: meal.notes,
      createdAt: meal.createdAt,
      items: meal.items.map((i) => ({
        id: i.id.toString(),
        mealId: i.mealId.toString(),
        name: i.name,
        quantity: i.quantity, // Decimal -> puede salir como string/Decimal depending
        unit: i.unit,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        createdAt: i.createdAt,
      })),
    });
  } catch (err) {
    console.error("ERROR POST /meals:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Devuelve todas las comidas del perfil activo, ordenadas por fecha descendente.
 * Incluye los ítems nutricionales de cada comida.
 *
 * @returns {200} { meals: [...] }
 */
app.get("/meals", auth, profileContext, async (req, res) => {
  try {
    const meals = await prisma.meal.findMany({
      where: { profileId: req.profileId },
      orderBy: { mealDate: "desc" },
      include: { items: true },
    });

    return res.json({
      meals: meals.map((m) => ({
        id: m.id.toString(),
        profileId: m.profileId.toString(),
        mealType: m.mealType,
        mealDate: m.mealDate,
        notes: m.notes,
        createdAt: m.createdAt,
        items: m.items.map((i) => ({
          id: i.id.toString(),
          mealId: i.mealId.toString(),
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
          createdAt: i.createdAt,
        })),
      })),
    });
  } catch (err) {
    console.error("ERROR GET /meals:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});
/**
 * Busca alimentos en la API USDA FDC y devuelve hasta 10 resultados
 * con sus macronutrientes principales (calorías, proteína, carbohidratos, grasa).
 *
 * @query {string} q - Texto de búsqueda (requerido)
 * @returns {200} { foods: [...] }
 */
app.get("/foods/search", auth, profileContext, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "q es requerido" });

    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Falta USDA_API_KEY en .env" });

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        pageSize: 10,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      // ✅ esto te muestra el error real de USDA (ej: api_key inválida)
      return res.status(r.status).json({ error: "USDA error", details: data });
    }

    const foods = (data.foods || []).map((f) => {
      const nutrients = new Map(
        (f.foodNutrients || []).map((n) => [n.nutrientName, n.value])
      );

      return {
        fdcId: f.fdcId,
        description: f.description,
        brandName: f.brandName ?? null,
        calories: nutrients.get("Energy") ?? null,
        protein: nutrients.get("Protein") ?? null,
        carbs: nutrients.get("Carbohydrate, by difference") ?? null,
        fat: nutrients.get("Total lipid (fat)") ?? null,
      };
    });

    return res.json({ foods });
  } catch (err) {
    console.error("ERROR /foods/search:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});


/**
 * Devuelve el detalle completo de un alimento de USDA FDC por su ID.
 *
 * @param {number} fdcId - ID del alimento en USDA FDC
 * @returns {200} { food: {...} } con todos los nutrientes disponibles
 */
app.get("/foods/:fdcId", auth, profileContext, async (req, res) => {
  try {
    const fdcId = Number(req.params.fdcId);
    if (!fdcId) return res.status(400).json({ error: "fdcId inválido" });

    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Falta USDA_API_KEY en .env" });

    const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`;

    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: "USDA error", details: data });
    }

    return res.json({ food: data });
  } catch (err) {
    console.error("ERROR /foods/:fdcId:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});
/**
 * Crea una nueva receta asociada al perfil activo.
 *
 * @body {string}   title - Título de la receta (requerido)
 * @body {string}   [description]
 * @body {Array}    ingredients - Lista de ingredientes (requerido)
 * @body {Array}    steps - Pasos de preparación (requerido)
 * @body {number}   [timeMinutes] - Tiempo de preparación en minutos
 * @body {number}   [calories] - Calorías estimadas
 * @body {string}   [imageUrl] - URL de imagen (debe ser http/https válida)
 * @returns {201} Receta creada
 */
app.post("/recipes", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId

    const {
      title,
      description,
      ingredients,
      steps,
      timeMinutes,
      calories,
      imageUrl,
    } = req.body

    if (!title || !Array.isArray(ingredients) || !Array.isArray(steps)) {
      return res.status(400).json({
        error: "title, ingredients y steps son obligatorios",
      })
    }

    if (imageUrl) {
      const isDataUrl = imageUrl.startsWith("data:image/")
      const isHttpUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
      if (!isDataUrl && !isHttpUrl) {
        return res.status(400).json({ error: "imageUrl debe ser una URL http/https o una imagen en base64" })
      }
    }

    const recipe = await prisma.recipe.create({
      data: {
        profileId,
        title,
        description: description || null,
        ingredients,
        steps,
        timeMinutes: timeMinutes ?? null,
        calories: calories ?? null,
        imageUrl: imageUrl || null,
      },
    })

    res.status(201).json({
      recipe: {
        id: recipe.id.toString(),
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        timeMinutes: recipe.timeMinutes,
        calories: recipe.calories,
        imageUrl: recipe.imageUrl,
        createdAt: recipe.createdAt,
        profileId: recipe.profileId.toString(),
      },
    })
  } catch (error) {
    console.error("POST /recipes error", error)
    res.status(500).json({ error: "Error creando receta" })
  }
})

/**
 * Devuelve todas las recetas de la plataforma (visibles globalmente).
 * Marca con isFavorite las que el perfil activo guardó como favorita.
 * Soporta búsqueda por título vía query param search.
 *
 * @query {string} [search] - Filtro por título (búsqueda parcial)
 * @returns {200} { recipes: [...] }
 */
app.get("/recipes", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId
    const search = String(req.query.search || "").trim()

    const recipes = await prisma.recipe.findMany({
      where: search
        ? {
            title: {
              contains: search,
            },
          }
        : {},
      orderBy: {
        createdAt: "desc",
      },
      include: {
        favorites: {
          where: { profileId },
          select: { recipeId: true },
        },
        profile: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const formatted = recipes.map((recipe) => ({
      id: recipe.id.toString(),
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      timeMinutes: recipe.timeMinutes,
      calories: recipe.calories,
      imageUrl: recipe.imageUrl,
      createdAt: recipe.createdAt,
      author: {
        id: recipe.profile.id.toString(),
        name: recipe.profile.name,
      },
      isFavorite: recipe.favorites.length > 0,
    }))

    res.json({ recipes: formatted })
  } catch (error) {
    console.error("GET /recipes error", error)
    res.status(500).json({ error: "Error obteniendo recetas" })
  }
})

/**
 * Devuelve las recetas marcadas como favoritas por el perfil activo,
 * ordenadas por fecha de marcado descendente.
 *
 * @returns {200} { recipes: [...] } con isFavorite: true en todos
 */
app.get("/recipes/favorites", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId

    const favorites = await prisma.favorite.findMany({
      where: { profileId },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        recipe: {
          include: {
            profile: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    const formatted = favorites.map((fav) => ({
      id: fav.recipe.id.toString(),
      title: fav.recipe.title,
      description: fav.recipe.description,
      ingredients: fav.recipe.ingredients,
      steps: fav.recipe.steps,
      timeMinutes: fav.recipe.timeMinutes,
      calories: fav.recipe.calories,
      imageUrl: fav.recipe.imageUrl,
      createdAt: fav.recipe.createdAt,
      author: {
        id: fav.recipe.profile.id.toString(),
        name: fav.recipe.profile.name,
      },
      isFavorite: true,
    }))

    res.json({ recipes: formatted })
  } catch (error) {
    console.error("GET /recipes/favorites error:", error)
    res.status(500).json({ error: "Error obteniendo favoritas" })
  }
})

/**
 * Devuelve el detalle de una receta específica por ID.
 * Incluye si el perfil activo la tiene marcada como favorita.
 *
 * @param {string} id - ID de la receta
 * @returns {200} { recipe: {...} }
 */
app.get("/recipes/:id", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId
    const recipeId = BigInt(req.params.id)

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        favorites: {
          where: { profileId },
          select: { recipeId: true },
        },
        profile: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!recipe) {
      return res.status(404).json({ error: "Receta no encontrada" })
    }

    res.json({
      recipe: {
        id: recipe.id.toString(),
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        timeMinutes: recipe.timeMinutes,
        calories: recipe.calories,
        imageUrl: recipe.imageUrl,
        createdAt: recipe.createdAt,
        author: {
          id: recipe.profile.id.toString(),
          name: recipe.profile.name,
        },
        isFavorite: recipe.favorites.length > 0,
      },
    })
  } catch (error) {
    console.error("GET /recipes/:id error", error)
    res.status(500).json({ error: "Error obteniendo receta" })
  }
})

/**
 * Marca una receta como favorita para el perfil activo (upsert).
 * Si ya existe el favorito, no genera error.
 *
 * @param {string} id - ID de la receta
 * @returns {201} { success: true }
 */
app.post("/recipes/:id/favorite", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId
    const recipeId = BigInt(req.params.id)

    await prisma.favorite.upsert({
      where: {
        profileId_recipeId: {
          profileId,
          recipeId,
        },
      },
      update: {},
      create: {
        profileId,
        recipeId,
      },
    })

    res.status(201).json({ success: true })
  } catch (error) {
    console.error("POST /recipes/:id/favorite error", error)
    res.status(500).json({ error: "Error guardando favorita" })
  }
})

/**
 * Elimina una receta de los favoritos del perfil activo.
 *
 * @param {string} id - ID de la receta
 * @returns {200} { success: true }
 */
app.delete("/recipes/:id/favorite", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId
    const recipeId = BigInt(req.params.id)

    await prisma.favorite.deleteMany({
      where: {
        profileId,
        recipeId,
      },
    })

    res.json({ success: true })
  } catch (error) {
    console.error("DELETE /recipes/:id/favorite error", error)
    res.status(500).json({ error: "Error eliminando favorita" })
  }
})





const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
