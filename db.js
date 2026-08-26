// db.js — connexion à une base de données PostgreSQL externe (ex: Neon, Render Postgres)
// et création des tables si besoin.
//
// Expose une API proche de node:sqlite/better-sqlite3 (db.prepare(sql).get/all/run)
// pour limiter les changements dans les fichiers de routes : les requêtes SQL
// utilisent toujours "?" comme paramètre, converti automatiquement en "$1, $2…"
// (syntaxe PostgreSQL). Toutes les méthodes sont désormais asynchrones (await requis).
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL manquant dans .env — voir .env.example pour la configuration.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Les bases externes (Neon, Render Postgres…) exigent une connexion chiffrée.
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Erreur inattendue du pool PostgreSQL :", err);
});

function convertirPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function prepare(sql) {
  const sqlConverti = convertirPlaceholders(sql);
  return {
    async get(...params) {
      const res = await pool.query(sqlConverti, params);
      return res.rows[0];
    },
    async all(...params) {
      const res = await pool.query(sqlConverti, params);
      return res.rows;
    },
    async run(...params) {
      const res = await pool.query(sqlConverti, params);
      return {
        changes: res.rowCount,
        lastInsertRowid: res.rows[0] ? res.rows[0].id : undefined,
      };
    },
  };
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telephone TEXT,
      date_creation TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      type_evenement TEXT NOT NULL,
      date_evenement TEXT NOT NULL,
      lieu TEXT,
      nombre_invites INTEGER,
      budget_estime REAL,
      message TEXT,
      statut TEXT NOT NULL DEFAULT 'en_attente',
      date_creation TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conseils (
      id SERIAL PRIMARY KEY,
      titre TEXT NOT NULL,
      categorie TEXT,
      contenu TEXT NOT NULL,
      image_url TEXT,
      date_creation TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      nom_fichier TEXT NOT NULL,
      titre TEXT,
      description TEXT,
      date_creation TIMESTAMP DEFAULT NOW()
    );
  `);

  // statut : 'en_attente' (soumis par un client, en attente de validation admin)
  //          'publie' (visible publiquement sur le site)
  // source : 'client' (formulaire public) ou 'admin' (saisi par l'administrateur)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS avis (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      note INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
      commentaire TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'client',
      statut TEXT NOT NULL DEFAULT 'en_attente',
      date_creation TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      titre TEXT NOT NULL,
      url_youtube TEXT NOT NULL,
      description TEXT,
      date_creation TIMESTAMP DEFAULT NOW()
    );
  `);

  // Configuration de l'administrateur : mot de passe (haché) + clé de récupération (hachée)
  // Alimentée automatiquement au premier démarrage à partir de .env (voir init-admin.js)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      mot_de_passe_hash TEXT NOT NULL,
      cle_recuperation_hash TEXT NOT NULL,
      date_maj TIMESTAMP DEFAULT NOW()
    );
  `);
}

module.exports = { prepare, initSchema, pool };
