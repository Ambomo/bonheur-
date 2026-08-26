// routes/images.js — galerie photo : ajout / suppression d'images (admin)
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nomUnique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nomUnique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 Mo max
  fileFilter: (req, file, cb) => {
    const typesAutorises = /jpeg|jpg|png|webp|gif/;
    const extOk = typesAutorises.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = typesAutorises.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error("Seules les images JPEG, PNG, WEBP ou GIF sont acceptées."));
  },
});

// GET /api/images — public, pour afficher la galerie sur le site
router.get("/", async (req, res) => {
  const images = await db.prepare("SELECT * FROM images ORDER BY date_creation DESC").all();
  res.json(images);
});

// POST /api/images — admin uniquement, upload d'une nouvelle image
router.post("/", requireAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: "Aucune image reçue." });

  const { titre, description } = req.body;
  const info = await db
    .prepare("INSERT INTO images (nom_fichier, titre, description) VALUES (?, ?, ?) RETURNING id")
    .run(req.file.filename, titre || null, description || null);

  res.status(201).json({
    id: info.lastInsertRowid,
    nom_fichier: req.file.filename,
    message: "Image ajoutée à la galerie.",
  });
});

// DELETE /api/images/:id — admin uniquement, retire l'image du disque et de la base
router.delete("/:id", requireAdmin, async (req, res) => {
  const image = await db.prepare("SELECT * FROM images WHERE id = ?").get(req.params.id);
  if (!image) return res.status(404).json({ erreur: "Image introuvable." });

  const filePath = path.join(uploadDir, image.nom_fichier);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") console.error("Erreur suppression fichier :", err);
  });

  await db.prepare("DELETE FROM images WHERE id = ?").run(req.params.id);
  res.json({ message: "Image supprimée." });
});

module.exports = router;
