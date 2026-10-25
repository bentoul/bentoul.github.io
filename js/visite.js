/**
 * BENTOUL CREATION — visite.js
 * Gestion et envoi des statistiques de visite vers Google Sheets (doPost -> action: "analytics")
 */
(function () {
  "use strict";

  const STORAGE_KEY_VISITOR = "bentoul_visitor_id";
  const STORAGE_KEY_COUNTRY = "bentoul_visitor_country";

  // 1. Identifiant unique et persistant du visiteur
  function getVisitorId() {
    let id = localStorage.getItem(STORAGE_KEY_VISITOR);
    if (!id) {
      id = "VIS_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY_VISITOR, id);
    }
    return id;
  }

  // 2. Détection du Pays (mise en cache locale pour éviter les requêtes répétitives)
  async function detectCountry() {
    let cachedCountry = sessionStorage.getItem(STORAGE_KEY_COUNTRY);
    if (cachedCountry) return cachedCountry;

    try {
      // Service rapide, gratuit et sans clé d'API
      const response = await fetch("https://ipapi.co/json/", { cache: "force-cache" });
      if (response.ok) {
        const data = await response.json();
        const country = data.country_name || data.country || "Inconnu";
        sessionStorage.setItem(STORAGE_KEY_COUNTRY, country);
        return country;
      }
    } catch (e) {
      // Service de secours
      try {
        const fallback = await fetch("https://ipwhois.app/json/");
        if (fallback.ok) {
          const fbData = await fallback.json();
          const country = fbData.country || "Inconnu";
          sessionStorage.setItem(STORAGE_KEY_COUNTRY, country);
          return country;
        }
      } catch (err) {
        // En cas d'échec ou d'adblocker
      }
    }
    return "Inconnu";
  }

  // 3. Détection de l'appareil (Mobile / Tablette / Desktop)
  function detectDevice() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "Tablette";
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return "Mobile";
    }
    return "Ordinateur (PC)";
  }

  // 4. Détection du Système d'exploitation (OS)
  function detectOS() {
    const ua = navigator.userAgent;
    if (/Windows NT 10.0/i.test(ua)) return "Windows 10/11";
    if (/Windows NT 6.3/i.test(ua)) return "Windows 8.1";
    if (/Windows NT 6.1/i.test(ua)) return "Windows 7";
    if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Autre OS";
  }

  // 5. Détection du Navigateur
  function detectBrowser() {
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return "Microsoft Edge";
    if (/OPR\/|Opera\//i.test(ua)) return "Opera";
    if (/Chrome\//i.test(ua)) return "Google Chrome";
    if (/Firefox\//i.test(ua)) return "Mozilla Firefox";
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Apple Safari";
    return "Autre navigateur";
  }

  // 6. Envoi de l'événement vers ton Apps Script existant
  let lastTrackedKey = "";

  async function trackVisit(options = {}) {
    const eventType = options.eventType || "Vue";
    const targetTitle = options.targetTitle || document.title || "Page d'accueil";
    const targetId = options.targetId || "home";

    // Évite l'enregistrement multiple de la même page dans un intervalle court
    const trackKey = `${eventType}_${targetId}_${targetTitle}`;
    if (trackKey === lastTrackedKey) return;
    lastTrackedKey = trackKey;

    const visitorId = getVisitorId();
    const pays = await detectCountry();
    const device = detectDevice();
    const os = detectOS();
    const browser = detectBrowser();

    const payload = {
      type: "analytics", // reconnu par ton doPost()
      visitorId: visitorId,
      pays: pays,
      eventType: eventType,
      targetTitle: targetTitle,
      targetId: targetId,
      device: device,
      os: os,
      browser: browser
    };

    try {
      if (typeof window.apiRequest === "function") {
        await window.apiRequest(payload, "POST");
      }
    } catch (err) {
      console.warn("Échec d'envoi statistique:", err.message);
    }
  }

  // 7. Surveillance automatique de l'interface (Navigation & Tabs)
  function initStatsObserver() {
    // Intercepter navigateTo sans écraser son comportement
    const originalNavigateTo = window.navigateTo;
    if (typeof originalNavigateTo === "function") {
      window.navigateTo = function (page) {
        originalNavigateTo.apply(this, arguments);

        // Tracker la page ou l'onglet affiché
        let title = "Page : " + page;
        if (page === "home") title = "Accueil";
        else if (page === "series") title = "Catalogue Séries";
        else if (page === "auth") title = "Page Connexion/Inscription";
        else if (page === "profile") title = "Mon Profil";

        trackVisit({
          eventType: "Vue Page/Tab",
          targetTitle: title,
          targetId: page
        });
      };
    }

    // Tracker l'ouverture initiale de la page après chargement
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        trackVisit({
          eventType: "Visite Site",
          targetTitle: "Ouverture du site",
          targetId: "root"
        });
      }, 1200);
    });

    // Observer si un épisode s'ouvre pour enregistrer le titre exact de l'épisode
    const detailObserver = new MutationObserver(() => {
      const detailContainer = document.querySelector("#episode-detail h2");
      if (detailContainer && detailContainer.textContent.trim()) {
        const episodeName = detailContainer.textContent.trim();
        trackVisit({
          eventType: "Lecture Episode",
          targetTitle: episodeName,
          targetId: "episode_view"
        });
      }
    });

    const episodeTarget = document.getElementById("episode-detail");
    if (episodeTarget) {
      detailObserver.observe(episodeTarget, { childList: true, subtree: true });
    }
  }

  // Initialisation immédiate
  window.BentoulTracker = { trackVisit };
  initStatsObserver();
})();