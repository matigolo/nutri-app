const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const profileContext = require("./middlewares/profileContext");
const auth = require("./middlewares/auth");
const prisma = require("./prisma");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
//llamada para registrar un nuevo usuario, recibe email, password y opcionalmente el nombre del primer perfil
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, firstProfileName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email y password son requeridos" });
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
          ? { create: [{ name: firstProfileName }] }
          : undefined,
      },
      include: { profiles: true },
    });

    return res.status(201).json({
      id: user.id.toString?.() ?? user.id,
      email: user.email,
      profiles: user.profiles?.map((p) => ({ id: p.id.toString?.() ?? p.id, name: p.name })) ?? [],
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "error interno" });
  }
});
//llamada para loguear un usuario existente, devuelve un token JWT si las credenciales son correctas
app.post("/auth/login", async (req, res) => {
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
    return res.status(500).json({ error: "error interno" });
  }
});
//ejemplo de ruta protegida que devuelve los datos del usuario logueado, se accede a través de req.user gracias al middleware auth
app.get("/me", auth, async (req, res) => {
  // req.user viene del token (por ejemplo: { userId: 1, email: "...", iat, exp })
  return res.json({ user: req.user });
});


app.post("/profiles", auth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name es requerido" });
    }
    const cleanName = name.trim();
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
        name: name.trim(),
        userId: req.userId,
      },
    });

    return res.status(201).json({
      id: profile.id.toString(),
      userId: profile.userId.toString(),
      name: profile.name,
      createdAt: profile.createdAt,
    });
  } catch (err) {
    console.error("ERROR /profiles:", err);
    return res.status(500).json({ error: err.message });
  }
});

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
            avatarUrl:true,
            createdAt: true,
        },
    });
    return res.json({
        profiles: profiles.map((p) => ({
        id: p.id.toString(),
        userId: p.userId.toString(),
        name: p.name,
        avatarUrl: p.avatarUrl,
        createdAt: p.createdAt,})),
    })}
    catch (err) {
    console.error("ERROR GET /profiles:", err);
    return res.status(500).json({ error: err.message });
  }
    
} )
app.get("/profile/active", auth, profileContext, (req, res) => {
  return res.json({
    profileId: req.profileId.toString(),
    profile: req.profile,
  });
});

app.post("/meals", auth, profileContext, async (req, res) => {
  try {
    const { mealType, mealDate, notes, items } = req.body;

    if (!mealType || !mealType.trim()) {
      return res.status(400).json({ error: "mealType es requerido" });
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
    return res.status(500).json({ error: err.message });
  }
});


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
    return res.status(500).json({ error: err.message });
  }
});
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
    return res.status(500).json({ error: err.message });
  }
});


app.get("/foods/:fdcId", auth, profileContext, async (req, res) => {
  try {
    const fdcId = Number(req.params.fdcId);
    if (!fdcId) return res.status(400).json({ error: "fdcId inválido" });

    const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`;

    const r = await fetch(url);
    const data = await r.json();

    return res.json({ food: data });
  } catch (err) {
    console.error("ERROR /foods/:fdcId:", err);
    return res.status(500).json({ error: err.message });
  }
});


/*app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});*/
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
