const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const profileContext = require("./middlewares/profileContext");
const auth = require("./middlewares/auth");
const prisma = require("./prisma");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Necesario para que express-rate-limit funcione correctamente detrás del
// proxy de Railway (y cualquier otro reverse proxy en producción).
app.set("trust proxy", 1);

/**
 * Validación de variables de entorno críticas al arrancar.
 */
const WEAK_SECRETS = ["super_secret_dev_key", "secret", "jwt_secret", "changeme", ""];
const jwtSecret = process.env.JWT_SECRET || "";

if (!jwtSecret || WEAK_SECRETS.includes(jwtSecret.toLowerCase())) {
  console.warn(
    "ADVERTENCIA DE SEGURIDAD: JWT_SECRET usa el valor por defecto inseguro. " +
    "Cambiarlo antes de desplegar en producción. " +
    "Podés generar uno con: openssl rand -base64 32"
  );
}

/**
 * Servicio de email (Resend).
 * Si RESEND_API_KEY no está configurado, el registro auto-verifica al usuario
 * y se loguea un aviso. Activar configurando RESEND_API_KEY en las variables de entorno.
 */
let resendClient = null;
if (process.env.RESEND_API_KEY) {
  try {
    const { Resend } = require("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
  } catch {
    console.warn("resend no está instalado. Verificación de email desactivada.");
  }
} else {
  console.warn(
    "RESEND_API_KEY no configurado. Los usuarios se registran sin verificación de email. " +
    "Configurá RESEND_API_KEY para activar la verificación."
  );
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

/**
 * Configuración de CORS.
 */
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Profile-Id"],
  credentials: false,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

/**
 * Rate limiting para endpoints de autenticación.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intentá nuevamente en 15 minutos." },
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * Registra un nuevo usuario con email y contraseña.
 * Si RESEND_API_KEY está configurado, envía un email de verificación y el usuario
 * debe confirmar antes de poder iniciar sesión.
 * Si no está configurado, el usuario queda verificado automáticamente.
 *
 * @body {string} email
 * @body {string} password - Mínimo 8 caracteres
 * @body {string} [firstProfileName]
 * @body {string} [firstProfileGoal]
 * @returns {201} Usuario creado
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

    // Si hay servicio de email configurado, el usuario empieza sin verificar
    const emailServiceEnabled = resendClient !== null;
    let verificationToken = null;
    let verificationTokenExpiry = null;

    if (emailServiceEnabled) {
      verificationToken = crypto.randomBytes(32).toString("hex");
      verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerified: !emailServiceEnabled,
        verificationToken,
        verificationTokenExpiry,
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

    // Enviar email de verificación si el servicio está activo
    if (emailServiceEnabled && verificationToken) {
      const verifyUrl = `${FRONTEND_URL}/auth/verify?token=${verificationToken}`;
      try {
        await resendClient.emails.send({
          from: RESEND_FROM,
          to: email,
          subject: "Verificá tu cuenta en NutriApp",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Bienvenido a NutriApp</h2>
              <p>Hacé click en el siguiente botón para verificar tu cuenta:</p>
              <a href="${verifyUrl}"
                 style="display: inline-block; background: #000; color: #fff; padding: 12px 24px;
                        border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
                Verificar cuenta
              </a>
              <p style="color: #666; font-size: 14px;">
                El link expira en 24 horas. Si no creaste esta cuenta, ignorá este email.
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Error enviando email de verificación:", emailErr);
        // No es fatal: la cuenta se creó, pero el email no llegó
      }
    }

    return res.status(201).json({
      id: user.id.toString(),
      email: user.email,
      emailVerified: user.emailVerified,
      requiresVerification: emailServiceEnabled,
      profiles:
        user.profiles?.map((p) => ({
          id: p.id.toString(),
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
 * Verifica el token de email enviado al usuario al registrarse.
 * Redirige al frontend con el resultado.
 *
 * @query {string} token - Token de verificación de 64 caracteres hex
 */
app.get("/auth/verify", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.redirect(`${FRONTEND_URL}/login?error=token_invalido`);
    }

    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.redirect(`${FRONTEND_URL}/login?error=token_invalido`);
    }

    if (user.emailVerified) {
      return res.redirect(`${FRONTEND_URL}/login?verified=ya_verificado`);
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      return res.redirect(`${FRONTEND_URL}/login?error=token_expirado`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return res.redirect(`${FRONTEND_URL}/login?verified=true`);
  } catch (e) {
    console.error("ERROR GET /auth/verify:", e);
    return res.redirect(`${FRONTEND_URL}/login?error=error_interno`);
  }
});

/**
 * Reenvía el email de verificación a un usuario no verificado.
 *
 * @body {string} email
 */
app.post("/auth/resend-verification", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email es requerido" });

    const user = await prisma.user.findUnique({ where: { email } });

    // Siempre responder OK para no revelar si el email existe
    if (!user || user.emailVerified || !resendClient) {
      return res.json({ ok: true });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationTokenExpiry },
    });

    const verifyUrl = `${FRONTEND_URL}/auth/verify?token=${verificationToken}`;
    await resendClient.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: "Verificá tu cuenta en NutriApp",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Verificá tu cuenta</h2>
          <p>Hacé click en el siguiente botón para verificar tu cuenta:</p>
          <a href="${verifyUrl}"
             style="display: inline-block; background: #000; color: #fff; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
            Verificar cuenta
          </a>
          <p style="color: #666; font-size: 14px;">El link expira en 24 horas.</p>
        </div>
      `,
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("ERROR POST /auth/resend-verification:", e);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Autentica un usuario y devuelve un token JWT válido por 7 días.
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

    // Verificar que el email esté confirmado (solo cuando el servicio de email está activo)
    if (!user.emailVerified) {
      return res.status(403).json({
        error: "email_not_verified",
        message: "Verificá tu email antes de iniciar sesión. Revisá tu bandeja de entrada.",
      });
    }

    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
      },
      profiles: user.profiles.map((p) => ({
        id: p.id.toString(),
        name: p.name,
        goal: p.goal,
        age: p.age,
        height: p.height,
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Devuelve los datos del usuario autenticado.
 */
app.get("/me", auth, async (req, res) => {
  return res.json({ user: req.user });
});

/**
 * Crea un nuevo perfil para el usuario autenticado.
 *
 * @body {string} name
 * @body {string} [goal]
 * @body {number} [age] - Edad en años (1-120)
 * @body {number} [height] - Altura en cm (50-300)
 * @returns {201} Perfil creado
 */
app.post("/profiles", auth, async (req, res) => {
  try {
    const { name, goal, age, height } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name es requerido" });
    }

    const cleanName = name.trim();
    const cleanGoal = goal && String(goal).trim() ? String(goal).trim() : null;
    const cleanAge = age !== undefined && age !== null ? parseInt(age) : null;
    const cleanHeight = height !== undefined && height !== null ? parseInt(height) : null;

    if (cleanAge !== null && (isNaN(cleanAge) || cleanAge < 1 || cleanAge > 120)) {
      return res.status(400).json({ error: "age debe ser un número entre 1 y 120" });
    }
    if (cleanHeight !== null && (isNaN(cleanHeight) || cleanHeight < 50 || cleanHeight > 300)) {
      return res.status(400).json({ error: "height debe ser un número entre 50 y 300 cm" });
    }

    const existingProfile = await prisma.profile.findFirst({
      where: { name: cleanName, userId: req.userId },
    });
    if (existingProfile) {
      return res.status(400).json({ error: `el perfil ${cleanName} ya existe` });
    }

    const profile = await prisma.profile.create({
      data: {
        name: cleanName,
        goal: cleanGoal,
        age: cleanAge,
        height: cleanHeight,
        userId: req.userId,
      },
    });

    return res.status(201).json({
      id: profile.id.toString(),
      userId: profile.userId.toString(),
      name: profile.name,
      goal: profile.goal,
      age: profile.age,
      height: profile.height,
      createdAt: profile.createdAt,
    });
  } catch (err) {
    console.error("ERROR /profiles:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Devuelve todos los perfiles del usuario autenticado.
 */
app.get("/profiles", auth, async (req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      orderBy: { id: "asc" },
      select: {
        id: true,
        userId: true,
        name: true,
        goal: true,
        age: true,
        height: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return res.json({
      profiles: profiles.map((p) => ({
        id: p.id.toString(),
        userId: p.userId.toString(),
        name: p.name,
        goal: p.goal,
        age: p.age,
        height: p.height,
        avatarUrl: p.avatarUrl,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error("ERROR GET /profiles:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Elimina un perfil del usuario autenticado.
 * No permite eliminar el último perfil de la cuenta.
 */
app.delete("/profiles/:id", auth, async (req, res) => {
  try {
    const profileIdStr = req.params.id;
    if (!profileIdStr) {
      return res.status(400).json({ error: "id es requerido" });
    }

    let profileId;
    try {
      profileId = BigInt(profileIdStr);
    } catch {
      return res.status(400).json({ error: "id inválido" });
    }

    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId: req.userId },
      select: { id: true, userId: true, name: true },
    });

    if (!profile) {
      return res.status(404).json({ error: "perfil no encontrado" });
    }

    const count = await prisma.profile.count({
      where: { userId: req.userId },
    });

    if (count <= 1) {
      return res.status(400).json({ error: "no podés eliminar el último perfil" });
    }

    await prisma.profile.delete({ where: { id: profileId } });

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
 * Actualiza campos del perfil de forma parcial.
 * Acepta cualquier combinación de goal, age y height.
 *
 * @param {string} id - ID del perfil
 * @body {string|null} [goal]
 * @body {number|null} [age]
 * @body {number|null} [height]
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

    const { goal, age, height } = req.body;
    const data = {};

    if ("goal" in req.body) {
      data.goal = goal !== undefined && goal !== null && String(goal).trim()
        ? String(goal).trim()
        : null;
    }

    if ("age" in req.body) {
      const parsed = age !== undefined && age !== null ? parseInt(age) : null;
      if (parsed !== null && (isNaN(parsed) || parsed < 1 || parsed > 120)) {
        return res.status(400).json({ error: "age debe ser un número entre 1 y 120" });
      }
      data.age = parsed;
    }

    if ("height" in req.body) {
      const parsed = height !== undefined && height !== null ? parseInt(height) : null;
      if (parsed !== null && (isNaN(parsed) || parsed < 50 || parsed > 300)) {
        return res.status(400).json({ error: "height debe ser un número entre 50 y 300 cm" });
      }
      data.height = parsed;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No hay campos válidos para actualizar" });
    }

    const updated = await prisma.profile.update({
      where: { id: profileId },
      data,
    });

    return res.json({
      id: updated.id.toString(),
      name: updated.name,
      goal: updated.goal,
      age: updated.age,
      height: updated.height,
    });
  } catch (err) {
    console.error("ERROR PATCH /profiles/:id:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Devuelve el perfil activo validado por el middleware profileContext.
 */
app.get("/profile/active", auth, profileContext, (req, res) => {
  return res.json({
    profileId: req.profileId.toString(),
    profile: req.profile,
  });
});

// ============================================================
// WEIGHT ROUTES
// ============================================================

/**
 * Devuelve todos los registros de peso del perfil activo.
 * Ordenados por fecha descendente.
 *
 * @returns {200} { weights: [{ id, date, weight, createdAt }] }
 */
app.get("/weights", auth, profileContext, async (req, res) => {
  try {
    const records = await prisma.weightRecord.findMany({
      where: { profileId: req.profileId },
      orderBy: { date: "desc" },
      select: { id: true, date: true, weight: true, createdAt: true },
    });

    return res.json({
      weights: records.map((r) => ({
        id: r.id.toString(),
        date: r.date,
        weight: Number(r.weight),
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("ERROR GET /weights:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

/**
 * Registra o actualiza el peso del perfil activo para una fecha.
 * Si ya existe un registro para esa fecha, lo sobreescribe (upsert).
 *
 * @body {string} date   - Fecha en formato YYYY-MM-DD
 * @body {number} weight - Peso en kg (20-500)
 * @returns {200} { weight: { id, date, weight } }
 */
app.post("/weights", auth, profileContext, async (req, res) => {
  try {
    const { date, weight } = req.body;

    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date debe estar en formato YYYY-MM-DD" });
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 500) {
      return res.status(400).json({ error: "weight debe ser un número entre 20 y 500" });
    }

    const record = await prisma.weightRecord.upsert({
      where: {
        profileId_date: {
          profileId: req.profileId,
          date,
        },
      },
      update: { weight: weightNum },
      create: {
        profileId: req.profileId,
        date,
        weight: weightNum,
      },
    });

    return res.json({
      weight: {
        id: record.id.toString(),
        date: record.date,
        weight: Number(record.weight),
        createdAt: record.createdAt,
      },
    });
  } catch (err) {
    console.error("ERROR POST /weights:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

// ============================================================
// MEAL ROUTES
// ============================================================

/**
 * Crea una nueva comida con sus ítems nutricionales para el perfil activo.
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
        quantity: i.quantity,
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
 * Devuelve todas las comidas del perfil activo.
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
 * Elimina una comida del perfil activo.
 */
app.delete("/meals/:id", auth, profileContext, async (req, res) => {
  try {
    let mealId;
    try {
      mealId = BigInt(req.params.id);
    } catch {
      return res.status(400).json({ error: "id inválido" });
    }

    const meal = await prisma.meal.findFirst({
      where: { id: mealId, profileId: req.profileId },
    });

    if (!meal) {
      return res.status(404).json({ error: "comida no encontrada" });
    }

    await prisma.meal.delete({ where: { id: mealId } });

    return res.json({ ok: true, deletedMealId: mealId.toString() });
  } catch (err) {
    console.error("ERROR DELETE /meals/:id:", err);
    return res.status(500).json({ error: "error interno del servidor" });
  }
});

// ============================================================
// FOOD SEARCH ROUTES
// ============================================================

/**
 * Busca alimentos en la API USDA FDC.
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
      body: JSON.stringify({ query: q, pageSize: 10 }),
    });

    const data = await r.json();

    if (!r.ok) {
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

// ============================================================
// RECIPE ROUTES
// ============================================================

/**
 * Crea una nueva receta asociada al perfil activo.
 */
app.post("/recipes", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId;
    const { title, description, ingredients, steps, timeMinutes, calories, imageUrl } = req.body;

    if (!title || !Array.isArray(ingredients) || !Array.isArray(steps)) {
      return res.status(400).json({ error: "title, ingredients y steps son obligatorios" });
    }

    if (imageUrl) {
      const isDataUrl = imageUrl.startsWith("data:image/");
      const isHttpUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
      if (!isDataUrl && !isHttpUrl) {
        return res.status(400).json({ error: "imageUrl debe ser una URL http/https o una imagen en base64" });
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
    });

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
    });
  } catch (error) {
    console.error("POST /recipes error", error);
    res.status(500).json({ error: "Error creando receta" });
  }
});

/**
 * Devuelve todas las recetas de la plataforma.
 */
app.get("/recipes", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId;
    const search = String(req.query.search || "").trim();

    const recipes = await prisma.recipe.findMany({
      where: search ? { title: { contains: search } } : {},
      orderBy: { createdAt: "desc" },
      include: {
        favorites: { where: { profileId }, select: { recipeId: true } },
        profile: { select: { id: true, name: true } },
      },
    });

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
      author: { id: recipe.profile.id.toString(), name: recipe.profile.name },
      isFavorite: recipe.favorites.length > 0,
    }));

    res.json({ recipes: formatted });
  } catch (error) {
    console.error("GET /recipes error", error);
    res.status(500).json({ error: "Error obteniendo recetas" });
  }
});

/**
 * Devuelve las recetas favoritas del perfil activo.
 */
app.get("/recipes/favorites", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId;

    const favorites = await prisma.favorite.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      include: {
        recipe: {
          include: { profile: { select: { id: true, name: true } } },
        },
      },
    });

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
      author: { id: fav.recipe.profile.id.toString(), name: fav.recipe.profile.name },
      isFavorite: true,
    }));

    res.json({ recipes: formatted });
  } catch (error) {
    console.error("GET /recipes/favorites error:", error);
    res.status(500).json({ error: "Error obteniendo favoritas" });
  }
});

/**
 * Devuelve el detalle de una receta específica.
 */
app.get("/recipes/:id", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId;
    const recipeId = BigInt(req.params.id);

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        favorites: { where: { profileId }, select: { recipeId: true } },
        profile: { select: { id: true, name: true } },
      },
    });

    if (!recipe) {
      return res.status(404).json({ error: "Receta no encontrada" });
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
        author: { id: recipe.profile.id.toString(), name: recipe.profile.name },
        isFavorite: recipe.favorites.length > 0,
      },
    });
  } catch (error) {
    console.error("GET /recipes/:id error", error);
    res.status(500).json({ error: "Error obteniendo receta" });
  }
});

/**
 * Marca una receta como favorita (upsert).
 */
app.post("/recipes/:id/favorite", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId;
    const recipeId = BigInt(req.params.id);

    await prisma.favorite.upsert({
      where: { profileId_recipeId: { profileId, recipeId } },
      update: {},
      create: { profileId, recipeId },
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("POST /recipes/:id/favorite error", error);
    res.status(500).json({ error: "Error guardando favorita" });
  }
});

/**
 * Elimina una receta de los favoritos.
 */
app.delete("/recipes/:id/favorite", auth, profileContext, async (req, res) => {
  try {
    const profileId = req.profileId;
    const recipeId = BigInt(req.params.id);

    await prisma.favorite.deleteMany({ where: { profileId, recipeId } });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE /recipes/:id/favorite error", error);
    res.status(500).json({ error: "Error eliminando favorita" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
