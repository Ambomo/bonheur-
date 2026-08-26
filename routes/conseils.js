// routes/conseils.js — articles de conseils affichés publiquement, gérés par l'admin
const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/conseils — public, tout le monde peut lire les conseils
router.get("/", async (req, res) => {
  const conseils = await db.prepare("SELECT * FROM conseils ORDER BY date_creation DESC").all();
  res.json(conseils);
});

// POST /api/conseils — admin uniquement
router.post("/", requireAdmin, async (req, res) => {
  const { titre, categorie, contenu, image_url } = req.body;
  if (!titre || !contenu) {
    return res.status(400).json({ erreur: "Le titre et le contenu sont obligatoires." });
  }
  const info = await db
    .prepare("INSERT INTO conseils (titre, categorie, contenu, image_url) VALUES (?, ?, ?, ?) RETURNING id")
    .run(titre, categorie || null, contenu, image_url || null);
  res.status(201).json({ id: info.lastInsertRowid, message: "Conseil publié." });
});

// PUT /api/conseils/:id — admin uniquement
router.put("/:id", requireAdmin, async (req, res) => {
  const { titre, categorie, contenu, image_url } = req.body;
  const info = await db
    .prepare("UPDATE conseils SET titre=?, categorie=?, contenu=?, image_url=? WHERE id=?")
    .run(titre, categorie || null, contenu, image_url || null, req.params.id);
  if (info.changes === 0) return res.status(404).json({ erreur: "Conseil introuvable." });
  res.json({ message: "Conseil mis à jour." });
});

// DELETE /api/conseils/:id — admin uniquement
router.delete("/:id", requireAdmin, async (req, res) => {
  const info = await db.prepare("DELETE FROM conseils WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erreur: "Conseil introuvable." });
  res.json({ message: "Conseil supprimé." });
});

module.exports = router;
