// js/admin.js — logique du tableau de bord administrateur

const API_BASE = "/api";
const UPLOADS_BASE = "/uploads";

// Le token n'est gardé qu'en mémoire le temps de la session de navigation
// (il faudra se reconnecter après un rechargement complet de la page).
let adminToken = null;

const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginFeedback = document.getElementById("loginFeedback");

/* --- Afficher / masquer le mot de passe ---------------------------------- */
const togglePassword = document.getElementById("togglePassword");
const motDePasseInput = document.getElementById("motDePasse");
togglePassword.addEventListener("click", () => {
  const masque = motDePasseInput.type === "password";
  motDePasseInput.type = masque ? "text" : "password";
  togglePassword.setAttribute("aria-label", masque ? "Masquer le mot de passe" : "Afficher le mot de passe");
});

function connexionReussie(token) {
  adminToken = token;
  // L'écran (et le champ) de mot de passe disparaît dès la connexion réussie
  loginScreen.hidden = true;
  dashboard.hidden = false;
  loginForm.reset();
  motDePasseInput.type = "password";
  chargerTout();
}

/* --- Connexion ---------------------------------------------------------- */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginFeedback.textContent = "";
  const mot_de_passe = document.getElementById("motDePasse").value;

  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mot_de_passe }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erreur || "Connexion impossible.");

    connexionReussie(data.token);
  } catch (err) {
    loginFeedback.textContent = err.message;
    loginFeedback.className = "form-feedback erreur";
  }
});

/* --- Connexion avec Google ------------------------------------------------ */
function attendreGoogle(tentatives = 20) {
  return new Promise((resolve) => {
    const verifier = () => {
      if (typeof google !== "undefined" && google.accounts) return resolve(true);
      if (tentatives <= 0) return resolve(false);
      tentatives--;
      setTimeout(verifier, 250);
    };
    verifier();
  });
}

async function initGoogleSignIn() {
  try {
    const res = await fetch(`${API_BASE}/admin/config`);
    const config = await res.json();
    if (!config.googleActif) return;

    const googlePret = await attendreGoogle();
    if (!googlePret) return console.warn("Script Google Identity non chargé.");

    document.getElementById("googleSignInWrap").hidden = false;

    google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: handleGoogleCredential,
    });
    google.accounts.id.renderButton(document.getElementById("googleSignInButton"), {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
    });
  } catch (err) {
    console.error("Connexion Google indisponible :", err);
  }
}

async function handleGoogleCredential(response) {
  loginFeedback.textContent = "";
  try {
    const res = await fetch(`${API_BASE}/admin/login-google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erreur || "Connexion Google impossible.");

    connexionReussie(data.token);
  } catch (err) {
    loginFeedback.textContent = err.message;
    loginFeedback.className = "form-feedback erreur";
  }
}
initGoogleSignIn();

/* --- Mot de passe oublié / récupération ------------------------------------ */
const recuperationForm = document.getElementById("recuperationForm");
const recuperationFeedback = document.getElementById("recuperationFeedback");

document.getElementById("motDePasseOublieBtn").addEventListener("click", () => {
  loginForm.hidden = true;
  recuperationForm.hidden = false;
  loginFeedback.textContent = "";
});

document.getElementById("annulerRecuperationBtn").addEventListener("click", () => {
  recuperationForm.hidden = true;
  loginForm.hidden = false;
  recuperationFeedback.textContent = "";
});

recuperationForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  recuperationFeedback.textContent = "";

  const cle_recuperation = document.getElementById("cleRecuperation").value;
  const nouveau_mot_de_passe = document.getElementById("nouveauMotDePasse").value;

  try {
    const res = await fetch(`${API_BASE}/admin/mot-de-passe-oublie`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cle_recuperation, nouveau_mot_de_passe }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erreur || "Réinitialisation impossible.");

    recuperationFeedback.textContent = `Mot de passe changé ! Nouvelle clé de récupération (note-la, elle ne sera plus réaffichée) : ${data.nouvelle_cle_recuperation}`;
    recuperationFeedback.className = "form-feedback succes";
    alert(`Ta nouvelle clé de récupération est :\n\n${data.nouvelle_cle_recuperation}\n\nNote-la immédiatement dans un endroit sûr — elle ne sera plus jamais affichée.`);
    recuperationForm.reset();
  } catch (err) {
    recuperationFeedback.textContent = err.message;
    recuperationFeedback.className = "form-feedback erreur";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  adminToken = null;
  dashboard.hidden = true;
  loginScreen.hidden = false;
  loginForm.hidden = false;
  recuperationForm.hidden = true;
  loginForm.reset();
});

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${adminToken}`, ...extra };
}

/* --- Onglets -------------------------------------------------------------- */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = true));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).hidden = false;
  });
});

function chargerTout() {
  chargerReservations();
  chargerClients();
  chargerGalerieAdmin();
  chargerConseilsAdmin();
  chargerVideosAdmin();
  chargerAvisAdmin();
}

/* ==========================================================================
   RÉSERVATIONS
   ========================================================================== */
async function chargerReservations() {
  const tbody = document.querySelector("#reservationsTable tbody");
  const vide = document.getElementById("reservationsEmpty");
  tbody.innerHTML = "";

  const res = await fetch(`${API_BASE}/reservations`, { headers: authHeaders() });
  const reservations = await res.json();

  vide.hidden = reservations.length > 0;

  reservations.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${r.client_nom}</strong><br><small>${r.client_email}</small></td>
      <td>${r.type_evenement}</td>
      <td>${new Date(r.date_evenement).toLocaleDateString("fr-FR")}</td>
      <td>${r.nombre_invites ?? "—"}</td>
      <td><span class="status-badge status-${r.statut}">${libelleStatut(r.statut)}</span></td>
      <td class="row-actions">
        <select data-id="${r.id}" class="statut-select">
          <option value="en_attente" ${r.statut === "en_attente" ? "selected" : ""}>En attente</option>
          <option value="confirmee" ${r.statut === "confirmee" ? "selected" : ""}>Confirmée</option>
          <option value="annulee" ${r.statut === "annulee" ? "selected" : ""}>Annulée</option>
        </select>
        <button class="link-btn" data-delete-reservation="${r.id}">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".statut-select").forEach((select) => {
    select.addEventListener("change", async () => {
      await fetch(`${API_BASE}/reservations/${select.dataset.id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ statut: select.value }),
      });
      chargerReservations();
    });
  });

  tbody.querySelectorAll("[data-delete-reservation]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer définitivement cette réservation ?")) return;
      await fetch(`${API_BASE}/reservations/${btn.dataset.deleteReservation}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      chargerReservations();
    });
  });
}

function libelleStatut(statut) {
  return { en_attente: "En attente", confirmee: "Confirmée", annulee: "Annulée" }[statut] || statut;
}

/* ==========================================================================
   CLIENTS
   ========================================================================== */
async function chargerClients() {
  const tbody = document.querySelector("#clientsTable tbody");
  const vide = document.getElementById("clientsEmpty");
  tbody.innerHTML = "";

  const res = await fetch(`${API_BASE}/clients`, { headers: authHeaders() });
  const clients = await res.json();

  vide.hidden = clients.length > 0;

  clients.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.nom}</td>
      <td>${c.email}</td>
      <td>${c.telephone || "—"}</td>
      <td>${c.nombre_reservations}</td>
      <td><button class="link-btn" data-delete-client="${c.id}">Supprimer</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-delete-client]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer ce client et toutes ses réservations liées ?")) return;
      await fetch(`${API_BASE}/clients/${btn.dataset.deleteClient}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      chargerClients();
      chargerReservations();
    });
  });
}

/* ==========================================================================
   GALERIE PHOTO — ajout / suppression d'images
   ========================================================================== */
const imageForm = document.getElementById("imageForm");
const imageFeedback = document.getElementById("imageFeedback");

imageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  imageFeedback.textContent = "";
  const btn = document.getElementById("imageSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Envoi en cours…";

  try {
    const formData = new FormData(imageForm);
    const res = await fetch(`${API_BASE}/images`, {
      method: "POST",
      headers: authHeaders(), // pas de Content-Type: le navigateur le gère pour FormData
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erreur || "Échec de l'ajout de l'image.");

    imageFeedback.textContent = "Image ajoutée avec succès.";
    imageFeedback.className = "form-feedback succes";
    imageForm.reset();
    chargerGalerieAdmin();
  } catch (err) {
    imageFeedback.textContent = err.message;
    imageFeedback.className = "form-feedback erreur";
  } finally {
    btn.disabled = false;
    btn.textContent = "Ajouter à la galerie";
  }
});

async function chargerGalerieAdmin() {
  const grid = document.getElementById("adminGalleryGrid");
  const vide = document.getElementById("adminGalleryEmpty");
  grid.innerHTML = "";

  const res = await fetch(`${API_BASE}/images`, { headers: authHeaders() });
  const images = await res.json();

  vide.hidden = images.length > 0;

  images.forEach((img) => {
    const div = document.createElement("div");
    div.className = "admin-gallery-item";
    div.innerHTML = `
      <img src="${UPLOADS_BASE}/${img.nom_fichier}" alt="${img.titre || ""}">
      <div class="item-body">
        <h4>${img.titre || "Sans titre"}</h4>
        <button class="link-btn" data-delete-image="${img.id}">Retirer cette photo</button>
      </div>
    `;
    grid.appendChild(div);
  });

  grid.querySelectorAll("[data-delete-image]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Retirer définitivement cette photo de la galerie ?")) return;
      await fetch(`${API_BASE}/images/${btn.dataset.deleteImage}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      chargerGalerieAdmin();
    });
  });
}

/* ==========================================================================
   CONSEILS — création / édition / suppression
   ========================================================================== */
const conseilForm = document.getElementById("conseilForm");
const conseilFeedback = document.getElementById("conseilFeedback");
const conseilCancelBtn = document.getElementById("conseilCancelBtn");

conseilForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  conseilFeedback.textContent = "";

  const id = document.getElementById("conseilId").value;
  const payload = {
    titre: document.getElementById("conseilTitre").value,
    categorie: document.getElementById("conseilCategorie").value,
    image_url: document.getElementById("conseilImage").value,
    contenu: document.getElementById("conseilContenu").value,
  };

  try {
    const url = id ? `${API_BASE}/conseils/${id}` : `${API_BASE}/conseils`;
    const method = id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erreur || "Erreur lors de l'enregistrement.");

    conseilFeedback.textContent = id ? "Conseil mis à jour." : "Conseil publié.";
    conseilFeedback.className = "form-feedback succes";
    resetConseilForm();
    chargerConseilsAdmin();
  } catch (err) {
    conseilFeedback.textContent = err.message;
    conseilFeedback.className = "form-feedback erreur";
  }
});

conseilCancelBtn.addEventListener("click", resetConseilForm);

function resetConseilForm() {
  conseilForm.reset();
  document.getElementById("conseilId").value = "";
  document.getElementById("conseilSubmitBtn").textContent = "Publier le conseil";
  conseilCancelBtn.hidden = true;
}

async function chargerConseilsAdmin() {
  const list = document.getElementById("adminConseilsList");
  list.innerHTML = "";

  const res = await fetch(`${API_BASE}/conseils`);
  const conseils = await res.json();

  conseils.forEach((c) => {
    const div = document.createElement("div");
    div.className = "admin-conseil-item";
    div.innerHTML = `
      <div>
        <h4>${c.titre}</h4>
        <p>${c.categorie ? c.categorie + " — " : ""}${c.contenu.slice(0, 120)}${c.contenu.length > 120 ? "…" : ""}</p>
      </div>
      <div class="row-actions">
        <button class="link-btn" data-edit-conseil="${c.id}">Modifier</button>
        <button class="link-btn" data-delete-conseil="${c.id}">Supprimer</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll("[data-edit-conseil]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = conseils.find((x) => x.id == btn.dataset.editConseil);
      document.getElementById("conseilId").value = c.id;
      document.getElementById("conseilTitre").value = c.titre;
      document.getElementById("conseilCategorie").value = c.categorie || "";
      document.getElementById("conseilImage").value = c.image_url || "";
      document.getElementById("conseilContenu").value = c.contenu;
      document.getElementById("conseilSubmitBtn").textContent = "Enregistrer les modifications";
      conseilCancelBtn.hidden = false;
      document.querySelector('[data-tab="conseils"]').click();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  list.querySelectorAll("[data-delete-conseil]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer définitivement ce conseil ?")) return;
      await fetch(`${API_BASE}/conseils/${btn.dataset.deleteConseil}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      chargerConseilsAdmin();
    });
  });
}

/* ==========================================================================
   VIDÉOS — ajout / suppression (page Réalisations)
   ========================================================================== */
const videoForm = document.getElementById("videoForm");
const videoFeedback = document.getElementById("videoFeedback");

videoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  videoFeedback.textContent = "";
  const btn = document.getElementById("videoSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Ajout en cours…";

  const payload = {
    titre: document.getElementById("videoTitre").value,
    url_youtube: document.getElementById("videoUrl").value,
    description: document.getElementById("videoDescription").value,
  };

  try {
    const res = await fetch(`${API_BASE}/videos`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erreur || "Échec de l'ajout de la vidéo.");

    videoFeedback.textContent = "Vidéo ajoutée.";
    videoFeedback.className = "form-feedback succes";
    videoForm.reset();
    chargerVideosAdmin();
  } catch (err) {
    videoFeedback.textContent = err.message;
    videoFeedback.className = "form-feedback erreur";
  } finally {
    btn.disabled = false;
    btn.textContent = "Ajouter la vidéo";
  }
});

async function chargerVideosAdmin() {
  const list = document.getElementById("adminVideoList");
  const vide = document.getElementById("adminVideoEmpty");
  if (!list) return;
  list.innerHTML = "";

  const res = await fetch(`${API_BASE}/videos`);
  const videos = await res.json();

  vide.hidden = videos.length > 0;

  videos.forEach((v) => {
    const div = document.createElement("div");
    div.className = "admin-video-item";
    div.innerHTML = `
      <div>
        <strong>${v.titre}</strong>
        <span>${v.url_youtube}</span>
      </div>
      <button class="link-btn" data-delete-video="${v.id}">Supprimer</button>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll("[data-delete-video]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer définitivement cette vidéo ?")) return;
      await fetch(`${API_BASE}/videos/${btn.dataset.deleteVideo}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      chargerVideosAdmin();
    });
  });
}

/* ==========================================================================
   AVIS CLIENTS — modération + ajout direct par l'admin
   ========================================================================== */
const avisAdminForm = document.getElementById("avisAdminForm");
const avisAdminFeedback = document.getElementById("avisAdminFeedback");
const avisAdminEtoiles = document.getElementById("avisAdminEtoiles");
const avisAdminNote = document.getElementById("avisAdminNote");

avisAdminEtoiles.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const valeur = parseInt(btn.dataset.valeur, 10);
    avisAdminNote.value = valeur;
    avisAdminEtoiles.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("actif", parseInt(b.dataset.valeur, 10) <= valeur);
    });
  });
});

avisAdminForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  avisAdminFeedback.textContent = "";

  const note = avisAdminNote.value;
  if (!note || note === "0") {
    avisAdminFeedback.textContent = "Choisis une note (1 à 5 étoiles).";
    avisAdminFeedback.className = "form-feedback erreur";
    return;
  }

  const payload = {
    nom: document.getElementById("avisAdminNom").value,
    note,
    commentaire: document.getElementById("avisAdminCommentaire").value,
  };

  const btn = document.getElementById("avisAdminSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Publication…";

  try {
    const res = await fetch(`${API_BASE}/avis/admin`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erreur || "Échec de la publication.");

    avisAdminFeedback.textContent = "Avis publié.";
    avisAdminFeedback.className = "form-feedback succes";
    avisAdminForm.reset();
    avisAdminNote.value = "0";
    avisAdminEtoiles.querySelectorAll("button").forEach((b) => b.classList.remove("actif"));
    chargerAvisAdmin();
  } catch (err) {
    avisAdminFeedback.textContent = err.message;
    avisAdminFeedback.className = "form-feedback erreur";
  } finally {
    btn.disabled = false;
    btn.textContent = "Publier cet avis";
  }
});

function etoilesTexte(note) {
  return "★".repeat(note) + "☆".repeat(5 - note);
}

async function chargerAvisAdmin() {
  const list = document.getElementById("adminAvisList");
  const vide = document.getElementById("adminAvisEmpty");
  if (!list) return;
  list.innerHTML = "";

  const res = await fetch(`${API_BASE}/avis/tous`, { headers: authHeaders() });
  const avis = await res.json();

  vide.hidden = avis.length > 0;

  avis.forEach((a) => {
    const div = document.createElement("div");
    div.className = "admin-avis-item";
    div.innerHTML = `
      <div>
        <div class="avis-meta">
          <strong>${a.nom}</strong>
          <span style="color:var(--or-avis);">${etoilesTexte(a.note)}</span>
          <span class="avis-source-tag">${a.source === "admin" ? "Ajouté par l'admin" : "Client"}</span>
          <span class="status-badge status-${a.statut === "publie" ? "publie" : "en_attente"}">${a.statut === "publie" ? "Publié" : "En attente"}</span>
        </div>
        <p>${a.commentaire}</p>
      </div>
      <div class="row-actions">
        ${a.statut === "publie"
          ? `<button class="link-btn" data-depublier="${a.id}">Dépublier</button>`
          : `<button class="link-btn" data-publier="${a.id}">Publier</button>`}
        <button class="link-btn" data-delete-avis="${a.id}">Supprimer</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll("[data-publier]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch(`${API_BASE}/avis/${btn.dataset.publier}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ statut: "publie" }),
      });
      chargerAvisAdmin();
    });
  });

  list.querySelectorAll("[data-depublier]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch(`${API_BASE}/avis/${btn.dataset.depublier}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ statut: "en_attente" }),
      });
      chargerAvisAdmin();
    });
  });

  list.querySelectorAll("[data-delete-avis]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer définitivement cet avis ?")) return;
      await fetch(`${API_BASE}/avis/${btn.dataset.deleteAvis}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      chargerAvisAdmin();
    });
  });
}

/* ==========================================================================
   SÉCURITÉ — changer le mot de passe admin
   ========================================================================== */
const changerMdpForm = document.getElementById("changerMdpForm");
const changerMdpFeedback = document.getElementById("changerMdpFeedback");

changerMdpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  changerMdpFeedback.textContent = "";
  const btn = document.getElementById("changerMdpBtn");
  btn.disabled = true;
  btn.textContent = "Mise à jour…";

  const payload = {
    mot_de_passe_actuel: document.getElementById("mdpActuel").value,
    nouveau_mot_de_passe: document.getElementById("mdpNouveau").value,
  };

  try {
    const res = await fetch(`${API_BASE}/admin/changer-mot-de-passe`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erreur || "Échec du changement de mot de passe.");

    changerMdpFeedback.textContent = "Mot de passe mis à jour avec succès.";
    changerMdpFeedback.className = "form-feedback succes";
    changerMdpForm.reset();
  } catch (err) {
    changerMdpFeedback.textContent = err.message;
    changerMdpFeedback.className = "form-feedback erreur";
  } finally {
    btn.disabled = false;
    btn.textContent = "Changer le mot de passe";
  }
});
