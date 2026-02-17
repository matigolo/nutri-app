const prisma = require("../prisma");

async function profileContext(req, res, next) {
  const profileIdRaw = req.headers["x-profile-id"];
  if (!profileIdRaw) {
    return res.status(400).json({ error: "Falta X-Profile-Id (perfil activo)" });
  }

  let profileId;
  try {
    profileId = BigInt(profileIdRaw);
  } catch {
    return res.status(400).json({ error: "X-Profile-Id inválido" });
  }

  const profile = await prisma.profile.findFirst({
    where: {
      id: profileId,
      userId: req.userId,
    },
    select: { id: true, name: true },
  });

  if (!profile) {
    return res.status(403).json({ error: "Perfil no pertenece a esta cuenta" });
  }

  // ✅ Guardamos BigInt internamente, pero para respuestas convertimos
  req.profileId = profileId;
  req.profile = {
    id: profile.id.toString(),
    name: profile.name,
  };

  next();
}

module.exports = profileContext;
