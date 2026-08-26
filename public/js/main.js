// js/main.js — logique commune des pages publiques du site
// (le menu mobile, le lien actif et les réseaux sociaux sont gérés dans layout.js)

const API_BASE = "/api";
const UPLOADS_BASE = "/uploads";

/* --- Carrousel du Hero (défilement d'images dynamique) ------------------- */
async function initHeroCarousel() {
  const heroSlides = document.getElementById("heroSlides");
  if (!heroSlides) return;
  const heroDots = document.getElementById("heroDots");

  let urls = [];
  try {
    const res = await fetch(`${API_BASE}/images`);
    const images = await res.json();
    urls = images.slice(0, 6).map((img) => `${UPLOADS_BASE}/${img.nom_fichier}`);
  } catch (err) {
    console.error("Impossible de charger les images du carrousel :", err);
  }

  // Images de secours tant qu'aucune photo n'a été ajoutée depuis l'admin
  if (!urls.length) {
    urls = [
      "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1800&auto=format&fit=crop",
    ];
  }

  urls.forEach((url, i) => {
    const slide = document.createElement("div");
    slide.className = "hero-slide" + (i === 0 ? " active" : "");
    slide.style.backgroundImage = `url("${url}")`;
    heroSlides.appendChild(slide);

    if (heroDots) {
      const dot = document.createElement("button");
      if (i === 0) dot.classList.add("active");
      dot.setAttribute("aria-label", `Aller à l'image ${i + 1}`);
      dot.addEventListener("click", () => afficherSlide(i));
      heroDots.appendChild(dot);
    }
  });

  const slides = heroSlides.querySelectorAll(".hero-slide");
  const dots = heroDots ? heroDots.querySelectorAll("button") : [];
  let index = 0;

  function afficherSlide(i) {
    slides[index].classList.remove("active");
    dots[index]?.classList.remove("active");
    index = i;
    slides[index].classList.add("active");
    dots[index]?.classList.add("active");
  }

  if (slides.length > 1) {
    setInterval(() => afficherSlide((index + 1) % slides.length), 5000);
  }
}

/* --- Galerie photo (lecture publique) -------------------------------- */
async function chargerGalerie() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;
  const vide = document.getElementById("galleryEmpty");
  const limite = grid.dataset.limit ? parseInt(grid.dataset.limit, 10) : null;

  try {
    const res = await fetch(`${API_BASE}/images`);
    let images = await res.json();
    if (limite) images = images.slice(0, limite);

    if (!images.length) {
      if (vide) vide.style.display = "block";
      return;
    }
    if (vide) vide.remove();

    images.forEach((img) => {
      const item = document.createElement("figure");
      item.className = "gallery-item";
      item.innerHTML = `
        <img src="${UPLOADS_BASE}/${img.nom_fichier}" alt="${img.titre || "Photo de mariage"}" loading="lazy">
        ${img.titre ? `<figcaption class="gallery-caption">${img.titre}</figcaption>` : ""}
      `;
      grid.appendChild(item);
    });
  } catch (err) {
    console.error("Impossible de charger la galerie :", err);
    if (vide) vide.textContent = "La galerie n'a pas pu être chargée.";
  }
}

/* --- Vidéos illustratrices (page Réalisations) -------------------------- */
function urlEmbedYoutube(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

async function chargerVideos() {
  const grid = document.getElementById("videoGrid");
  if (!grid) return;
  const vide = document.getElementById("videosEmpty");

  try {
    const res = await fetch(`${API_BASE}/videos`);
    const videos = await res.json();

    if (!videos.length) {
      if (vide) vide.style.display = "block";
      return;
    }
    if (vide) vide.remove();

    videos.forEach((v) => {
      const embed = urlEmbedYoutube(v.url_youtube);
      const card = document.createElement("article");
      card.className = "video-card";
      card.innerHTML = `
        <div class="video-embed">
          ${embed ? `<iframe src="${embed}" title="${v.titre}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : ""}
        </div>
        <div class="video-body">
          <h3>${v.titre}</h3>
          ${v.description ? `<p>${v.description}</p>` : ""}
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("Impossible de charger les vidéos :", err);
  }
}

/* --- Conseils (lecture publique) -------------------------------------- */
async function chargerConseils() {
  const grid = document.getElementById("conseilsGrid");
  if (!grid) return;
  const vide = document.getElementById("conseilsEmpty");
  const limite = grid.dataset.limit ? parseInt(grid.dataset.limit, 10) : null;

  try {
    const res = await fetch(`${API_BASE}/conseils`);
    let conseils = await res.json();
    if (limite) conseils = conseils.slice(0, limite);

    if (!conseils.length) {
      if (vide) vide.style.display = "block";
      return;
    }
    if (vide) vide.remove();

    conseils.forEach((c) => {
      const card = document.createElement("article");
      card.className = "conseil-card";
      card.innerHTML = `
        ${c.image_url ? `<img src="${c.image_url}" alt="${c.titre}" loading="lazy">` : ""}
        <div class="conseil-body">
          ${c.categorie ? `<span class="conseil-cat">${c.categorie}</span>` : ""}
          <h3>${c.titre}</h3>
          <p>${c.contenu}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("Impossible de charger les conseils :", err);
    if (vide) vide.textContent = "Les conseils n'ont pas pu être chargés.";
  }
}

/* --- Étoiles (affichage) ------------------------------------------------ */
function genererEtoiles(note) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<svg class="${i <= note ? "" : "etoile-vide"}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.6 4.3L18.4 21 12 16.8 5.6 21l2-7.7L2 9h7z"/></svg>`;
  }
  return `<span class="etoiles">${html}</span>`;
}

/* --- Témoignages dynamiques (accueil) ------------------------------------ */
async function initTemoignages() {
  const card = document.getElementById("temoignageCard");
  if (!card) return;

  let avis = [];
  try {
    const res = await fetch(`${API_BASE}/avis`);
    avis = await res.json();
  } catch (err) {
    console.error("Impossible de charger les avis :", err);
  }
  if (!avis.length) return; // le texte de secours du HTML reste affiché

  const texteEl = document.getElementById("temoignageTexte");
  const nomEl = document.getElementById("temoignageNom");
  const etoilesEl = document.getElementById("temoignageEtoiles");
  const initialeEl = document.getElementById("temoignageInitiale");
  let index = 0;

  function afficher(i) {
    const a = avis[i];
    texteEl.textContent = `« ${a.commentaire} »`;
    nomEl.textContent = a.nom;
    initialeEl.textContent = a.nom.charAt(0).toUpperCase();
    etoilesEl.innerHTML = genererEtoiles(a.note);
  }
  afficher(0);

  document.getElementById("temoignagePrev")?.addEventListener("click", () => {
    index = (index - 1 + avis.length) % avis.length;
    afficher(index);
  });
  document.getElementById("temoignageNext")?.addEventListener("click", () => {
    index = (index + 1) % avis.length;
    afficher(index);
  });
}

/* --- Formulaire d'avis client (page Contact) ------------------------------ */
function initAvisForm() {
  const form = document.getElementById("avisForm");
  if (!form) return;

  const etoilesWrap = document.getElementById("avisEtoiles");
  const noteInput = document.getElementById("avisNote");
  const feedback = document.getElementById("avisFeedback");
  const submitBtn = document.getElementById("avisSubmitBtn");

  etoilesWrap.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const valeur = parseInt(btn.dataset.valeur, 10);
      noteInput.value = valeur;
      etoilesWrap.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("actif", parseInt(b.dataset.valeur, 10) <= valeur);
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.textContent = "";
    feedback.className = "form-feedback";

    const nom = document.getElementById("avisNom").value;
    const note = noteInput.value;
    const commentaire = document.getElementById("avisCommentaire").value;

    if (!note || note === "0") {
      feedback.textContent = "Merci de choisir une note (1 à 5 étoiles).";
      feedback.className = "form-feedback erreur";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";

    try {
      const res = await fetch(`${API_BASE}/avis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, note, commentaire }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur lors de l'envoi.");

      feedback.textContent = data.message;
      feedback.classList.add("succes");
      form.reset();
      noteInput.value = "0";
      etoilesWrap.querySelectorAll("button").forEach((b) => b.classList.remove("actif"));
    } catch (err) {
      feedback.textContent = err.message;
      feedback.classList.add("erreur");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Envoyer mon avis";
    }
  });
}

/* --- Formulaire de réservation ----------------------------------------- */
function initReservationForm() {
  const form = document.getElementById("reservationForm");
  if (!form) return;

  const feedback = document.getElementById("formFeedback");
  const submitBtn = document.getElementById("submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.textContent = "";
    feedback.className = "form-feedback";

    const data = Object.fromEntries(new FormData(form).entries());

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";

    try {
      const res = await fetch(`${API_BASE}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resultat = await res.json();

      if (!res.ok) throw new Error(resultat.erreur || "Erreur lors de l'envoi.");

      feedback.textContent = "Merci ! Votre demande a bien été envoyée, nous revenons vers vous sous 48h.";
      feedback.classList.add("succes");
      form.reset();
    } catch (err) {
      feedback.textContent = err.message;
      feedback.classList.add("erreur");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Envoyer ma demande";
    }
  });
}

initHeroCarousel();
chargerGalerie();
chargerConseils();
chargerVideos();
initTemoignages();
initAvisForm();
initReservationForm();
