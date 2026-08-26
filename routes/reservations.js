// routes/reservations.js — gestion des demandes de réservation des clients
const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// POST /api/reservations — un visiteur envoie une demande de réservation
// Crée automatiquement le client s'il n'existe pas encore (basé sur l'email)
router.post("/", async (req, res) => {
  const {
    nom,
    email,
    telephone,
    type_evenement,
    date_evenement,
    lieu,
    nombre_invites,
    budget_estime,
    message,
  } = req.body;

  if (!nom || !email || !type_evenement || !date_evenement) {
    return res.status(400).json({
      erreur: "Les champs nom, email, type d'événement et date sont obligatoires.",
    });
  }

  try {
    let client = await db.prepare("SELECT * FROM clients WHERE email = ?").get(email);

    if (!client) {
      const info = await db
        .prepare("INSERT INTO clients (nom, email, telephone) VALUES (?, ?, ?) RETURNING id")
        .run(nom, email, telephone || null);
      client = { id: info.lastInsertRowid };
    }

    const result = await db
      .prepare(
        `INSERT INTO reservations
          (client_id, type_evenement, date_evenement, lieu, nombre_invites, budget_estime, message)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .run(
        client.id,
        type_evenement,
        date_evenement,
        lieu || null,
        nombre_invites || null,
        budget_estime || null,
        message || null
      );

    res.status(201).json({
      message: "Demande de réservation envoyée avec succès.",
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: "Erreur lors de l'enregistrement de la réservation." });
  }
});

// GET /api/reservations — liste complète (réservé à l'admin)
router.get("/", requireAdmin, async (req, res) => {
  const reservations = await db
    .prepare(
      `SELECT r.*, c.nom AS client_nom, c.email AS client_email, c.telephone AS client_telephone
       FROM reservations r
       JOIN clients c ON c.id = r.client_id
       ORDER BY r.date_creation DESC`
    )
    .all();
  res.json(reservations);
});

// PATCH /api/reservations/:id — changer le statut (en_attente, confirmee, annulee)
router.patch("/:id", requireAdmin, async (req, res) => {
  const { statut } = req.body;
  const statutsValides = ["en_attente", "confirmee", "annulee"];

  if (!statutsValides.includes(statut)) {
    return res.status(400).json({ erreur: "Statut invalide." });
  }

  const info = await db
    .prepare("UPDATE reservations SET statut = ? WHERE id = ?")
    .run(statut, req.params.id);

  if (info.changes === 0) {
    return res.status(404).json({ erreur: "Réservation introuvable." });
  }

  res.json({ message: "Statut mis à jour." });
});

// DELETE /api/reservations/:id
router.delete("/:id", requireAdmin, async (req, res) => {
  const info = await db.prepare("DELETE FROM reservations WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ erreur: "Réservation introuvable." });
  }
  res.json({ message: "Réservation supprimée." });
});

module.exports = router;
