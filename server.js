// server.js — point d'entrée de l'API du site wedding planner
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./db");
const reservationsRouter = require("./routes/reservations");
const clientsRouter = require("./routes/clients");
const conseilsRouter = require("./routes/conseils");
const imagesRouter = require("./routes/images");
const adminRouter = require("./routes/admin");
const avisRouter = require("./routes/avis");
const videosRouter = require("./routes/videos");
const { initialiserAdmin } = require("./init-admin");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Sert le site (frontend) : index.html, admin.html, css/, js/
app.use(express.static(path.join(__dirname, "public")));

// Sert les images uploadées de façon statique (ex: /uploads/mon-image.jpg)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes de l'API
app.use("/api/reservations", reservationsRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/conseils", conseilsRouter);
app.use("/api/images", imagesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/avis", avisRouter);
app.use("/api/videos", videosRouter);

app.get("/api/health", (req, res) => {
  res.json({ statut: "ok", message: "API wedding planner opérationnelle." });
});

// Gestion des erreurs multer / erreurs générales
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erreur: err.message || "Erreur serveur." });
});

async function demarrer() {
  try {
    // Crée les tables si besoin, puis le mot de passe admin haché (premier démarrage)
    await db.initSchema();
    await initialiserAdmin();

    app.listen(PORT, () => {
      console.log(`✅ Site + API wedding planner lancés sur http://localhost:${PORT}`);
      console.log(`   Espace admin : http://localhost:${PORT}/admin.html`);
    });
  } catch (err) {
    console.error("❌ Échec du démarrage du serveur (vérifie DATABASE_URL dans .env) :", err);
    process.exit(1);
  }
}

demarrer();
