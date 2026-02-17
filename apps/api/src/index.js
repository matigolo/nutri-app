const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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
      { userId: user.id.toString?.() ?? user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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


/*app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});*/
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
