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


/*app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});*/
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
