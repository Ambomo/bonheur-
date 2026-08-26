// js/layout.js — injecte le header et le footer partagés sur chaque page,
// puis active le menu mobile, le lien de navigation actif et les liens sociaux.

async function chargerPartiel(url, montage) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    montage.innerHTML = html;
  } catch (err) {
    console.error(`Impossible de charger ${url} :`, err);
  }
}

async function initLayout() {
  const headerMount = document.getElementById("site-header-mount");
  const footerMount = document.getElementById("site-footer-mount");

  if (headerMount) await chargerPartiel("partials/header.html", headerMount);
  if (footerMount) await chargerPartiel("partials/footer.html", footerMount);

  // Année courante dans le footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Lien de navigation actif selon la page courante (data-page sur <body>)
  const pageActuelle = document.body.dataset.page;
  if (pageActuelle) {
    document.querySelectorAll(`.site-nav a[data-page="${pageActuelle}"]`).forEach((a) => {
      a.classList.add("active");
    });
  }

  // Menu mobile
  const navToggle = document.getElementById("navToggle");
  const siteNav = document.getElementById("siteNav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    siteNav.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        siteNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // Applique les liens réseaux sociaux / WhatsApp (config.js doit être chargé avant)
  if (typeof appliquerLiensReseauxSociaux === "function") {
    appliquerLiensReseauxSociaux();
  }
}

document.addEventListener("DOMContentLoaded", initLayout);
