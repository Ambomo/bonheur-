// routes/admin.js — connexion de l'administrateur (mot de passe, Google), récupération
// de mot de passe via clé de récupération, et changement de mot de passe.
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

function creerToken() {
  return jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "12h" });
}

function genererCleRecuperation() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let cle = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) cle += "-";
    cle += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return cle;
}

// GET /api/admin/config — public, indique au frontend si la connexion Google est configurée
// (n'expose que le client ID, qui est public par nature — jamais de secret ici)
router.get("/config", (req, res) => {
  res.json({
    googleActif: Boolean(process.env.GOOGLE_CLIENT_ID),
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

// POST /api/admin/login — connexion classique par mot de passe
router.post("/login", async (req, res) => {
  const { mot_de_passe } = req.body;
  const config = await db.prepare("SELECT * FROM admin_config WHERE id = 1").get();

  if (!mot_de_passe || !config || !bcrypt.compareSync(mot_de_passe, config.mot_de_passe_hash)) {
    return res.status(401).json({ erreur: "Mot de passe incorrect." });
  }

  res.json({ token: creerToken(), message: "Connexion réussie." });
});

// POST /api/admin/login-google — connexion via Google Sign-In
// Le frontend envoie le "credential" (jeton d'identité) fourni par Google Identity Services.
router.post("/login-google", async (req, res) => {
  if (!googleClient) {
    return res.status(400).json({
      erreur: "La connexion Google n'est pas configurée sur ce serveur (GOOGLE_CLIENT_ID manquant dans .env).",
    });
  }

  const { credential } = req.body;
  if (!credential) return res.status(400).json({ erreur: "Jeton Google manquant." });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const emailAutorise = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();

    if (!payload.email_verified || payload.email.toLowerCase() !== emailAutorise) {
      return res.status(403).json({
        erreur: "Ce compte Google n'est pas autorisé à administrer ce site.",
      });
    }

    res.json({ token: creerToken(), message: "Connexion Google réussie." });
  } catch (err) {
    console.error("Erreur de vérification Google :", err);
    res.status(401).json({ erreur: "Jeton Google invalide." });
  }
});

// POST /api/admin/mot-de-passe-oublie — réinitialise le mot de passe via la clé de récupération
// Renvoie une NOUVELLE clé de récupération (l'ancienne est invalidée après usage).
router.post("/mot-de-passe-oublie", async (req, res) => {
  const { cle_recuperation, nouveau_mot_de_passe } = req.body;
  const config = await db.prepare("SELECT * FROM admin_config WHERE id = 1").get();

  if (!cle_recuperation || !nouveau_mot_de_passe) {
    return res.status(400).json({ erreur: "Clé de récupération et nouveau mot de passe requis." });
  }
  if (nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ erreur: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
  }
  if (!config || !bcrypt.compareSync(cle_recuperation.trim(), config.cle_recuperation_hash)) {
    return res.status(401).json({ erreur: "Clé de récupération invalide." });
  }

  const nouveauHash = bcrypt.hashSync(nouveau_mot_de_passe, 10);
  const nouvelleCle = genererCleRecuperation();
  const nouvelleCleHash = bcrypt.hashSync(nouvelleCle, 10);

  await db
    .prepare(
      "UPDATE admin_config SET mot_de_passe_hash = ?, cle_recuperation_hash = ?, date_maj = NOW() WHERE id = 1"
    )
    .run(nouveauHash, nouvelleCleHash);

  res.json({
    message: "Mot de passe réinitialisé avec succès.",
    nouvelle_cle_recuperation: nouvelleCle,
  });
});

// POST /api/admin/changer-mot-de-passe — admin connecté, change son mot de passe volontairement
router.post("/changer-mot-de-passe", requireAdmin, async (req, res) => {
  const { mot_de_passe_actuel, nouveau_mot_de_passe } = req.body;
  const config = await db.prepare("SELECT * FROM admin_config WHERE id = 1").get();

  if (!config || !bcrypt.compareSync(mot_de_passe_actuel || "", config.mot_de_passe_hash)) {
    return res.status(401).json({ erreur: "Mot de passe actuel incorrect." });
  }
  if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ erreur: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
  }

  const nouveauHash = bcrypt.hashSync(nouveau_mot_de_passe, 10);
  await db
    .prepare("UPDATE admin_config SET mot_de_passe_hash = ?, date_maj = NOW() WHERE id = 1")
    .run(nouveauHash);

  res.json({ message: "Mot de passe mis à jour." });
});

module.exports = router;
