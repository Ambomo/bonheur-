# Fleur & Serment — Site Wedding Planner (dossier unique)

Site complet — vitrine multi-pages, espace admin, API et base de données **PostgreSQL externe** — dans un seul dossier, prêt à déployer sur Render.

## Structure

```
wedding-planner-unifie/
├── server.js               → serveur unique (sert le site ET l'API)
├── db.js                   → connexion PostgreSQL + création des tables si besoin
├── init-admin.js           → crée le mot de passe admin haché au premier démarrage
├── routes/                 → réservations, clients, conseils, images, avis, vidéos, admin
├── middleware/auth.js      → protection des routes admin (JWT)
├── uploads/                 → photos envoyées depuis l'admin
├── public/                  → le site (frontend), voir détail plus bas
├── package.json
└── .env.example              → à copier en ".env"
```

## 1. Créer la base de données externe (Neon — gratuit en permanence)

⚠️ La base PostgreSQL gratuite intégrée à Render **expire au bout de 30 jours**. On utilise donc **Neon**, un fournisseur PostgreSQL externe avec une offre gratuite permanente, spécialement pensée pour ce cas d'usage.

1. Va sur https://neon.tech et crée un compte (tu peux utiliser GitHub)
2. Crée un nouveau projet
3. Sur la page du projet, copie la **Connection string** (commence par `postgresql://…`)

Garde cette URL de côté, tu en auras besoin à l'étape suivante et lors du déploiement.

## 2. Installer et lancer en local

Il te faut [Node.js](https://nodejs.org) version 18 ou plus.

```bash
cd wedding-planner-unifie
npm install
cp .env.example .env
```

Ouvre `.env` et renseigne :
- `DATABASE_URL` → colle la Connection string copiée depuis Neon
- `ADMIN_PASSWORD` → ton mot de passe initial pour l'espace admin
- `JWT_SECRET` → une longue chaîne aléatoire

```bash
npm start
```

Au tout premier démarrage, les tables sont créées automatiquement dans ta base Neon, et une **clé de récupération** s'affiche dans le terminal — note-la immédiatement (voir plus bas).

- Site public : **http://localhost:4000**
- Espace admin : **http://localhost:4000/admin.html**

## 3. Déployer sur Render

1. Pousse ton code sur GitHub (voir section Git plus bas si besoin)
2. Va sur https://render.com, connecte-toi avec GitHub
3. **New +** → **Web Service** → sélectionne ton dépôt
4. Configure :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
5. Dans l'onglet **Environment**, ajoute exactement les mêmes variables que dans ton `.env` local :
   - `DATABASE_URL` (ta Connection string Neon)
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
   - `PORT` → `10000` (Render l'impose)
   - `GOOGLE_CLIENT_ID` / `ADMIN_EMAIL` si tu utilises la connexion Google
6. **Create Web Service**

⚠️ **Important — clé de récupération sur Render** : le disque de Render n'est pas persistant (il se réinitialise à chaque redéploiement). Le fichier `CLE_DE_RECUPERATION.txt` ne survivra donc pas. Juste après le tout premier déploiement, va dans l'onglet **Logs** de Render et copie la clé affichée — c'est ta seule chance de la récupérer facilement. Comme ta base de données est maintenant externe (Neon), le mot de passe admin lui-même est bien conservé en permanence, seule cette clé de secours est concernée.

⚠️ **Photos uploadées** : pour la même raison (disque non persistant sur le plan gratuit de Render), les photos ajoutées via l'admin peuvent disparaître après un redéploiement. Pour une utilisation sérieuse, prévois un stockage externe (Cloudinary, AWS S3) — dis-le-moi si tu veux que je l'intègre.

## Les pages du site

- **Accueil** (`index.html`) — hero avec défilement d'images automatique, aperçu services/processus/galerie/avis/conseils
- **Services** (`services.html`) — détail des prestations
- **Réalisations** (`realisations.html`) — galerie photo complète + vidéos YouTube
- **Blog** (`conseils.html`) — tous les articles de conseils
- **Contact** (`contact.html`) — réservation, WhatsApp, formulaire d'avis

## Personnaliser tes réseaux sociaux et WhatsApp

Un seul fichier à modifier : **`public/js/config.js`** — Facebook, Instagram, YouTube, numéro WhatsApp.

## Espace administrateur

Connecte-toi avec ton mot de passe (bouton œil pour l'afficher/masquer). Options disponibles :

- **Connexion Google** (optionnel) — voir `.env.example` pour la configuration (`GOOGLE_CLIENT_ID`, `ADMIN_EMAIL`)
- **Mot de passe oublié ?** — utilise la clé de récupération générée au premier démarrage
- **Onglet Sécurité** — change ton mot de passe à tout moment
- **Réservations / Clients / Galerie photo / Vidéos / Avis clients / Conseils** — gestion complète du contenu

### À propos des avis clients
Un visiteur laisse un avis depuis la page Contact → il apparaît **« en attente »** dans l'onglet *Avis clients* → tu le publies ou le refuses. Tu peux aussi en publier un toi-même directement.

## Envoyer le code sur GitHub

```bash
git init
git add .
git commit -m "Premier envoi du site"
git branch -M main
git remote add origin https://github.com/TON-NOM-UTILISATEUR/TON-DEPOT.git
git push -u origin main
```

Le `.gitignore` exclut automatiquement `node_modules`, `.env` et la clé de récupération — ils ne doivent jamais être partagés publiquement.

## Sécurité

- Ne partage jamais ton `.env` ni ta `DATABASE_URL` (elle contient un mot de passe).
- Change `ADMIN_PASSWORD` et `JWT_SECRET` avant toute mise en ligne réelle.
- Le token admin expire après 12h.
