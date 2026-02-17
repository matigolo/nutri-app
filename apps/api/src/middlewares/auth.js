const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const header = req.headers.authorization; // "Bearer xxx"
  if (!header) return res.status(401).json({ message: "Missing Authorization header" });

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ message: "Invalid Authorization format" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // guardamos el payload para usarlo en rutas
    req.userId = typeof payload.userId === "string" ? BigInt(payload.userId) : BigInt(payload.userId);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = auth;
