// middleware/auth.js — protège les routes réservées à l'administrateur du site
const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ erreur: "Connexion administrateur requise." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin") throw new Error("rôle invalide");
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ erreur: "Session invalide ou expirée, reconnecte-toi." });
  }
}

module.exports = { requireAdmin };
