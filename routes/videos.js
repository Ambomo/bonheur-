// routes/videos.js — vidéos illustratrices affichées sur la page Réalisations
const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/videos — public
router.get("/", async (req, res) => {
  const videos = await db.prepare("SELECT * FROM videos ORDER BY date_creation DESC").all();
  res.json(videos);
});

// POST /api/videos — admin uniquement
router.post("/", requireAdmin, async (req, res) => {
  const { titre, url_youtube, description } = req.body;
  if (!titre || !url_youtube) {
    return res.status(400).json({ erreur: "Le titre et le lien YouTube sont obligatoires." });
  }
  const info = await db
    .prepare("INSERT INTO videos (titre, url_youtube, description) VALUES (?, ?, ?) RETURNING id")
    .run(titre, url_youtube, description || null);
  res.status(201).json({ id: info.lastInsertRowid, message: "Vidéo ajoutée." });
});

// DELETE /api/videos/:id — admin uniquement
router.delete("/:id", requireAdmin, async (req, res) => {
  const info = await db.prepare("DELETE FROM videos WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erreur: "Vidéo introuvable." });
  res.json({ message: "Vidéo supprimée." });
});

module.exports = router;
