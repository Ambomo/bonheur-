// js/config.js — Modifie ici tes liens réseaux sociaux et ton numéro WhatsApp.
// Ce fichier est chargé sur toutes les pages : un seul endroit à mettre à jour.
const SITE_CONFIG = {
  facebook: "https://facebook.com/ZolaEvent",
  instagram: "https://instagram.com/exemple-fleuretserment",
  youtube: "https://youtube.com/emilezolasax",
  // Numéro WhatsApp au format international, SANS le "+" ni espaces (ex: 237612345678)
  whatsappNumero: "237675767625",
  whatsappMessage: "Bonjour, je souhaite en savoir plus sur vos services de wedding planner.",
};

function appliquerLiensReseauxSociaux() {
  const lienWhatsapp = `https://wa.me/${SITE_CONFIG.whatsappNumero}?text=${encodeURIComponent(SITE_CONFIG.whatsappMessage)}`;

  document.querySelectorAll("[data-social]").forEach((el) => {
    const cle = el.dataset.social;
    if (cle === "whatsapp") {
      el.href = lienWhatsapp;
    } else if (SITE_CONFIG[cle]) {
      el.href = SITE_CONFIG[cle];
    }
  });
}

document.addEventListener("DOMContentLoaded", appliquerLiensReseauxSociaux);
