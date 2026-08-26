// init-admin.js — au tout premier démarrage, transforme le mot de passe en clair
// (ADMIN_PASSWORD dans .env) en mot de passe haché stocké en base, et génère une
// clé de récupération unique (affichée UNE SEULE FOIS) pour les oublis de mot de passe.
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const db = require("./db");

function genererCleRecuperation() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus (0/O, 1/I…)
  let cle = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) cle += "-";
    cle += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return cle;
}

async function initialiserAdmin() {
  const existant = await db.prepare("SELECT * FROM admin_config WHERE id = 1").get();
  if (existant) return; // déjà initialisé (en base), on ne touche à rien

  const motDePasseInitial = process.env.ADMIN_PASSWORD || "change_moi_123";
  const cleRecuperation = genererCleRecuperation();

  const motDePasseHash = bcrypt.hashSync(motDePasseInitial, 10);
  const cleRecuperationHash = bcrypt.hashSync(cleRecuperation, 10);

  await db
    .prepare("INSERT INTO admin_config (id, mot_de_passe_hash, cle_recuperation_hash) VALUES (1, ?, ?)")
    .run(motDePasseHash, cleRecuperationHash);

  // On tente d'écrire la clé en clair dans un fichier local, pratique en développement.
  // ⚠️ Sur un hébergeur comme Render, le disque n'est pas persistant : ce fichier
  // disparaîtra au prochain redémarrage/redéploiement. La seule trace fiable est
  // alors le message affiché ci-dessous dans les LOGS de déploiement — à copier
  // immédiatement après le tout premier démarrage.
  try {
    const cheminFichier = path.join(__dirname, "CLE_DE_RECUPERATION.txt");
    fs.writeFileSync(
      cheminFichier,
      `Clé de récupération du compte administrateur — Fleur & Serment\n` +
        `Générée le : ${new Date().toLocaleString("fr-FR")}\n\n` +
        `${cleRecuperation}\n\n` +
        `⚠️ Conserve cette clé dans un endroit sûr (gestionnaire de mots de passe).\n` +
        `Elle permet de réinitialiser le mot de passe admin en cas d'oubli, via\n` +
        `l'écran de connexion → "Mot de passe oublié ?".\n`
    );
  } catch (err) {
    console.warn("Impossible d'écrire CLE_DE_RECUPERATION.txt (disque non accessible en écriture) :", err.message);
  }

  console.log("\n========================================================");
  console.log("🔑 Compte administrateur initialisé.");
  console.log(`   CLÉ DE RÉCUPÉRATION : ${cleRecuperation}`);
  console.log("   ⚠️ COPIE-LA MAINTENANT — elle ne sera plus jamais réaffichée.");
  console.log("   (sur Render : copie-la depuis ces logs de déploiement)");
  console.log("========================================================\n");
}

module.exports = { initialiserAdmin };
