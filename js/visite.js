/**
 * BENTOUL CREATION — visite.js
 * Envoi des statistiques de visite vers Google Sheets (action: "getStats" en lecture,
 * type "analytics" en écriture).
 *
 * Données suivies : identifiant visiteur, pays, page / onglet consulté,
 * appareil, système et navigateur.
 */
(function () {
  "use strict";

  const STORAGE_KEY_VISITOR = "bentoul_visitor_id";
  const STORAGE_KEY_COUNTRY = "bentoul_visitor_country";

  const PAGE_LABELS = {
    home: "Accueil",
    series: "Catalogue Cours",
    "all-episodes": "Toutes les leçons",
    episodes: "Leçons d'un cours",
    episode: "Détail d'une leçon",
    blog: "Blog",
    "blog-article": "Article de blog",
    auth: "Page Connexion/Inscription",
    profile: "Mon Profil",
    admin: "Administration"
  };

  // 1. Identifiant unique et persistant du visiteur
  function getVisitorId() {
    let id = localStorage.getItem(STORAGE_KEY_VISITOR);
    if (!id) {
      id = "VIS_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY_VISITOR, id);
    }
    return id;
  }

  // 2. Détection du pays (une seule requête par session, même si plusieurs pages sont vues)
  let countryPromise = null;

  function detectCountry() {
    if (countryPromise) return countryPromise;

    countryPromise = (async () => {
      const cached = sessionStorage.getItem(STORAGE_KEY_COUNTRY);
      if (cached) return cached;

      try {
        const response = await fetch("https://ipapi.co/json/", { cache: "force-cache" });
        if (response.ok) {
          const data = await response.json();
          const country = data.country_name || data.country || "Inconnu";
          sessionStorage.setItem(STORAGE_KEY_COUNTRY, country);
          return country;
        }
      } catch (error) {
        // Service principal indisponible (bloqueur, réseau, etc.) : essayer le secours.
      }

      try {
        const fallback = await fetch("https://ipwhois.app/json/");
        if (fallback.ok) {
          const data = await fallback.json();
          const country = data.country || "Inconnu";
          sessionStorage.setItem(STORAGE_KEY_COUNTRY, country);
          return country;
        }
      } catch (error) {
        // Aucun service disponible : la visite reste comptée avec le pays « Inconnu ».
      }

      return "Inconnu";
    })();

    return countryPromise;
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

  // 4. Détection du système d'exploitation
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

  // 5. Détection du navigateur
  function detectBrowser() {
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return "Microsoft Edge";
    if (/OPR\/|Opera\//i.test(ua)) return "Opera";
    if (/Chrome\//i.test(ua)) return "Google Chrome";
    if (/Firefox\//i.test(ua)) return "Mozilla Firefox";
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Apple Safari";
    return "Autre navigateur";
  }

  // 6. Envoi de l'événement vers l'API Apps Script
  let lastTrackedKey = "";

  async function trackVisit(options = {}) {
    const eventType = options.eventType || "Vue";
    const targetTitle = options.targetTitle || document.title || "Page d'accueil";
    const targetId = options.targetId || "home";

    // Évite d'enregistrer deux fois le même événement d'affilée.
    const trackKey = `${eventType}_${targetId}_${targetTitle}`;
    if (trackKey === lastTrackedKey) return;
    lastTrackedKey = trackKey;

    try {
      const pays = await detectCountry();

      const payload = {
        type: "analytics", // reconnu par le doPost() de l'Apps Script
        visitorId: getVisitorId(),
        pays,
        eventType,
        targetTitle,
        targetId,
        device: detectDevice(),
        os: detectOS(),
        browser: detectBrowser()
      };

      if (typeof window.apiRequest === "function") {
        await window.apiRequest(payload, "POST");
      }
    } catch (error) {
      console.warn("Échec d'envoi statistique :", error.message);
    }
  }

  // 7. Enregistrement des navigations de l'application.
  //    L'application principale envoie l'événement "bentoul:navigate" ;
  //    un filet de sécurité surveille aussi window.navigateTo si l'événement n'existe pas.
  function trackPage(page) {
    if (!page) return;

    trackVisit({
      eventType: "Vue Page/Tab",
      targetTitle: PAGE_LABELS[page] || "Page : " + page,
      targetId: page
    });
  }

  function installNavigationFallback() {
    if (window.__bentoulTracksNavigationEvents) return;
    if (typeof window.navigateTo !== "function" || window.navigateTo.__bentoulTracked) return;

    const originalNavigateTo = window.navigateTo;

    window.navigateTo = function (page) {
      const result = originalNavigateTo.apply(this, arguments);
      trackPage(page);
      return result;
    };

    window.navigateTo.__bentoulTracked = true;
  }

  // 8. Observation de l'épisode réellement lu
  let lastEpisodeTitle = "";

  function observeEpisodeDetail() {
    const target = document.getElementById("episode-detail");
    if (!target) return;

    const observer = new MutationObserver(() => {
      const heading = target.querySelector("h2");
      const episodeName = heading ? heading.textContent.trim() : "";

      if (!episodeName || episodeName === lastEpisodeTitle) return;

      lastEpisodeTitle = episodeName;
      trackVisit({
        eventType: "Lecture Episode",
        targetTitle: episodeName,
        targetId: "episode_view"
      });
    });

    observer.observe(target, { childList: true, subtree: true });
  }

  function start() {
    installNavigationFallback();
    observeEpisodeDetail();
  }

  function scheduleInitialVisit() {
    setTimeout(() => {
      trackVisit({
        eventType: "Visite Site",
        targetTitle: "Ouverture du site",
        targetId: "root"
      });
    }, 1200);
  }

  // Écoute des navigations de l'application (page, onglet, série, épisode, admin).
  window.addEventListener("bentoul:navigate", function (event) {
    trackPage(event && event.detail ? event.detail.page : "");
  });

  window.BentoulTracker = { trackVisit, trackPage };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", function () {
      start();
      scheduleInitialVisit();
    });
  } else {
    start();
    scheduleInitialVisit();
  }
})();
