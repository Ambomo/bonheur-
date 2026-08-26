// routes/clients.js — gestion de la fiche des clients enregistrés
const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/clients — liste des clients (admin uniquement)
router.get("/", requireAdmin, async (req, res) => {
  const clients = await db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM reservations r WHERE r.client_id = c.id) AS nombre_reservations
       FROM clients c
       ORDER BY c.date_creation DESC`
    )
    .all();
  res.json(clients);
});

// GET /api/clients/:id — fiche détaillée + historique de réservations
router.get("/:id", requireAdmin, async (req, res) => {
  const client = await db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!client) return res.status(404).json({ erreur: "Client introuvable." });

  const reservations = await db
    .prepare("SELECT * FROM reservations WHERE client_id = ? ORDER BY date_creation DESC")
    .all(req.params.id);

  res.json({ ...client, reservations });
});

// PUT /api/clients/:id — mise à jour d'une fiche client
router.put("/:id", requireAdmin, async (req, res) => {
  const { nom, email, telephone } = req.body;
  const info = await db
    .prepare("UPDATE clients SET nom = ?, email = ?, telephone = ? WHERE id = ?")
    .run(nom, email, telephone, req.params.id);

  if (info.changes === 0) return res.status(404).json({ erreur: "Client introuvable." });
  res.json({ message: "Fiche client mise à jour." });
});

// DELETE /api/clients/:id
router.delete("/:id", requireAdmin, async (req, res) => {
  const info = await db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erreur: "Client introuvable." });
  res.json({ message: "Client supprimé." });
});

module.exports = router;
