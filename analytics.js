(() => {
  const CONSENT_KEY = "bentoul-analytics-consent";
  const VISITOR_KEY = "bentoul-anonymous-visitor";
  const apiUrl = window.BENTOUL_ANALYTICS_API_URL;

  if (navigator.doNotTrack === "1" || !apiUrl) return;

  function getVisitorId() {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0"));
      visitorId = `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
      localStorage.setItem(VISITOR_KEY, visitorId);
    }
    return visitorId;
  }

  function getReferrerHost() {
    if (!document.referrer) return "";
    try {
      const referrer = new URL(document.referrer);
      return referrer.host === location.host ? "" : referrer.host;
    } catch (error) {
      console.error("Impossible de lire le site référent.", error);
      return "";
    }
  }

  function trackVisit() {
    let visitorId;
    try {
      visitorId = getVisitorId();
    } catch (error) {
      console.error("Impossible de créer l’identifiant anonyme de visite.", error);
      return;
    }

    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "trackSiteVisit",
        visitorId: visitorId,
        page: location.pathname,
        referrer: getReferrerHost()
      }),
      keepalive: true
    }).then(response => {
      if (!response.ok) throw new Error(`Le serveur a répondu avec le statut ${response.status}.`);
      return response.json();
    }).then(result => {
      if (!result.success) throw new Error(result.message || "La visite n’a pas été enregistrée.");
    }).catch(error => console.error("Échec de l’enregistrement de la visite.", error));
  }

  function showConsentBanner() {
    document.getElementById("bentoul-analytics-consent")?.remove();
    const banner = document.createElement("aside");
    banner.id = "bentoul-analytics-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Choix des statistiques de visite");
    banner.style.cssText = "position:fixed;z-index:9999;right:16px;bottom:16px;left:16px;max-width:720px;margin:0 auto;padding:18px 20px;border:1px solid #d1d5db;border-radius:14px;background:#fff;color:#171717;box-shadow:0 12px 35px #0003;font:15px/1.5 Arial,sans-serif";

    const message = document.createElement("p");
    message.textContent = "Autorisez-vous les statistiques anonymes de visite ? Nous enregistrons les pages consultées et le domaine référent, sans adresse IP ni nom.";
    message.style.margin = "0 0 12px";
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px";

    [["Accepter", "accepted"], ["Refuser", "rejected"]].forEach(([label, value]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.cssText = value === "accepted"
        ? "min-height:40px;padding:8px 16px;border:1px solid #6d28d9;border-radius:8px;background:#6d28d9;color:#fff;font-weight:700;cursor:pointer"
        : "min-height:40px;padding:8px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font-weight:700;cursor:pointer";
      button.addEventListener("click", () => {
        try {
          const previousVisitorId = value === "rejected" ? localStorage.getItem(VISITOR_KEY) : null;
          localStorage.setItem(CONSENT_KEY, value);
          if (value === "rejected") localStorage.removeItem(VISITOR_KEY);
          banner.remove();
          if (value === "accepted") trackVisit();
          if (previousVisitorId) {
            fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({ action: "deleteMySiteVisits", visitorId: previousVisitorId })
            }).then(response => {
              if (!response.ok) throw new Error(`Le serveur a répondu avec le statut ${response.status}.`);
              return response.json();
            }).then(result => {
              if (!result.success) throw new Error(result.message || "La suppression des visites a échoué.");
            }).catch(error => console.error("Échec de la suppression des visites associées à cet appareil.", error));
          }
        } catch (error) {
          console.error("Impossible d’enregistrer votre choix de statistiques.", error);
          banner.remove();
        }
      });
      actions.append(button);
    });

    banner.append(message, actions);
    document.body.append(banner);
  }

  const preferencesButton = document.createElement("button");
  preferencesButton.type = "button";
  preferencesButton.textContent = "Préférences statistiques";
  preferencesButton.setAttribute("aria-label", "Modifier le choix des statistiques de visite");
  preferencesButton.style.cssText = "position:fixed;z-index:9998;right:12px;bottom:12px;padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font:12px Arial,sans-serif;cursor:pointer";
  preferencesButton.addEventListener("click", showConsentBanner);
  document.body.append(preferencesButton);

  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "accepted") trackVisit();
    else if (consent !== "rejected") showConsentBanner();
  } catch (error) {
    console.error("Impossible de lire le choix de statistiques.", error);
  }
})();
