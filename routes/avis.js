// routes/avis.js — avis / témoignages clients, avec validation par l'admin
const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/avis — public, uniquement les avis publiés (pour affichage sur le site)
router.get("/", async (req, res) => {
  const avis = await db
    .prepare("SELECT * FROM avis WHERE statut = 'publie' ORDER BY date_creation DESC")
    .all();
  res.json(avis);
});

// GET /api/avis/tous — admin uniquement, tous les avis (y compris en attente) pour modération
router.get("/tous", requireAdmin, async (req, res) => {
  const avis = await db.prepare("SELECT * FROM avis ORDER BY date_creation DESC").all();
  res.json(avis);
});

// POST /api/avis — public, un client laisse un avis (passe en attente de validation)
router.post("/", async (req, res) => {
  const { nom, note, commentaire } = req.body;
  const noteNum = Number(note);

  if (!nom || !commentaire || !noteNum || noteNum < 1 || noteNum > 5) {
    return res.status(400).json({
      erreur: "Merci de renseigner ton nom, un commentaire et une note entre 1 et 5.",
    });
  }

  const info = await db
    .prepare(
      "INSERT INTO avis (nom, note, commentaire, source, statut) VALUES (?, ?, ?, 'client', 'en_attente') RETURNING id"
    )
    .run(nom, noteNum, commentaire);

  res.status(201).json({
    id: info.lastInsertRowid,
    message: "Merci pour ton avis ! Il sera publié après validation.",
  });
});

// POST /api/avis/admin — admin uniquement, avis ajouté et publié immédiatement
router.post("/admin", requireAdmin, async (req, res) => {
  const { nom, note, commentaire } = req.body;
  const noteNum = Number(note);

  if (!nom || !commentaire || !noteNum || noteNum < 1 || noteNum > 5) {
    return res.status(400).json({ erreur: "Nom, commentaire et note (1 à 5) obligatoires." });
  }

  const info = await db
    .prepare(
      "INSERT INTO avis (nom, note, commentaire, source, statut) VALUES (?, ?, ?, 'admin', 'publie') RETURNING id"
    )
    .run(nom, noteNum, commentaire);

  res.status(201).json({ id: info.lastInsertRowid, message: "Avis publié." });
});

// PATCH /api/avis/:id — admin uniquement, valider (publier) ou dépublier un avis
router.patch("/:id", requireAdmin, async (req, res) => {
  const { statut } = req.body;
  if (!["en_attente", "publie"].includes(statut)) {
    return res.status(400).json({ erreur: "Statut invalide." });
  }
  const info = await db.prepare("UPDATE avis SET statut = ? WHERE id = ?").run(statut, req.params.id);
  if (info.changes === 0) return res.status(404).json({ erreur: "Avis introuvable." });
  res.json({ message: "Statut de l'avis mis à jour." });
});

// DELETE /api/avis/:id — admin uniquement
router.delete("/:id", requireAdmin, async (req, res) => {
  const info = await db.prepare("DELETE FROM avis WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erreur: "Avis introuvable." });
  res.json({ message: "Avis supprimé." });
});

module.exports = router;
