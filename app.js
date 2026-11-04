/* BENTAMOURA WEB — noyau partagé (layout + API Google Apps Script + compte unique)
   Toutes les pages partagent :
   - BTM.config   : les 2 URLs /exec, déclarées dans config.js (window.BTM_CONFIG)
   - BTM.auth     : UN SEUL compte utilisateur (feuille USER de bentoul.gs) réutilisé partout
   - BTM.ui       : toast, feuille modale, états de chargement
   - le layout    : header / sidebar / navigation basse injectés dans .body-layout
*/
(() => {
  "use strict";

  const KEYS = {
    session: "bentamoura.session.v1",
    visitor: "bentamoura.visitor.v1",
    views: "bentamoura.views.v1"
  };

  const APP = {
    name: "BENTAMOURA",
    subtitle: "Amour • Technologie",
    links: [
      { id: "home", label: "Accueil", icon: "home", href: "home.html" },
      { id: "amour", label: "Amour", icon: "heart", href: "benamoura.html" },
      { id: "dates", label: "Profils", icon: "dates", href: "rencontres.html" },
      { id: "tech", label: "Tech", icon: "tech", href: "bentoul.html" },
      { id: "profile", label: "Ma fiche", icon: "user", href: "profile.html" },
      { id: "account", label: "Compte", icon: "wallet", href: "user.html" }
    ]
  };

  /* ============================ STOCKAGE ============================ */
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) { /* mode privé : on ignore */ }
  };

  const config = {
    bentoul: String((window.BTM_CONFIG || {}).bentoul || "").trim(),
    benamoura: String((window.BTM_CONFIG || {}).benamoura || "").trim()
  };

  function isConfigured(which) {
    return /^https?:\/\/\S+/.test(String(which === "benamoura" ? config.benamoura : config.bentoul || ""));
  }

  function visitorId() {
    let id = read(KEYS.visitor, "");
    if (!id) {
      id = "VIS_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      write(KEYS.visitor, id);
    }
    return id;
  }

  /* ============================ COMPTE UNIQUE ============================ */
  const auth = {
    get user() {
      const session = read(KEYS.session, null);
      return session && session.user ? session.user : null;
    },
    get id() {
      const user = auth.user;
      return user ? String(user.id || "") : "";
    },
    get username() {
      const user = auth.user;
      return user ? String(user.username || "") : "";
    },
    get credits() {
      const user = auth.user;
      return user ? Number(user.credits) || 0 : 0;
    },
    save(user) {
      write(KEYS.session, { user, savedAt: Date.now() });
      renderHeaderAccount();
      document.dispatchEvent(new CustomEvent("btm:signed-in", { detail: { user } }));
      return user;
    },
    signOut() {
      try { localStorage.removeItem(KEYS.session); } catch (err) {}
      renderHeaderAccount();
      document.dispatchEvent(new CustomEvent("btm:signed-out"));
    },
    /** Recharge le compte depuis la feuille USER (credits à jour). */
    async refresh() {
      if (!auth.user || !isConfigured("bentoul")) return auth.user;
      try {
        const res = await api.post("bentoul", { type: "getUser", id: auth.id });
        if (res && res.status === "success" && res.user) return auth.save(res.user);
      } catch (err) { /* réseau : on garde la session locale */ }
      return auth.user;
    }
  };

  /* ============================ APPELS GOOGLE APPS SCRIPT ============================ */
  function endpoint(which) {
    const url = which === "benamoura" ? config.benamoura : config.bentoul;
    if (!isConfigured(which)) {
      throw new Error("L'API " + (which === "benamoura" ? "Benamoura" : "Bentoul") + " n'est pas configurée. Renseigne son URL /exec dans config.js.");
    }
    return url;
  }

  function query(params) {
    const usp = new URLSearchParams();
    Object.keys(params || {}).forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== "") usp.set(key, String(value));
    });
    const str = usp.toString();
    return str ? "?" + str : "";
  }

  async function request(url, init) {
    const response = await fetch(url, init);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error("Réponse illisible de Google Apps Script (vérifie le déploiement « Toute personne »).");
    }
  }

  const api = {
    get(which, action, params) {
      return request(endpoint(which) + query(Object.assign({ action }, params || {})), { method: "GET" });
    },
    /** Content-Type simple : évite la requête préliminaire CORS d'Apps Script. */
    post(which, payload) {
      return request(endpoint(which), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
    }
  };

  const bentoul = {
    series: (includeDrafts) => api.get("bentoul", "getSeries", includeDrafts ? { includeDrafts: "true" } : {}),
    episodes: (seriesId) => api.get("bentoul", "getEpisodes", { seriesId, userId: auth.id }),
    comments: (episodeId) => api.get("bentoul", "getComments", { episodeId }),
    comment: (episodeId, message) => api.post("bentoul", { type: "comment", episodeId, username: auth.username, message }),
    interaction: (contentType, contentId, action) => api.post("bentoul", { type: "interaction", contentType, contentId, action }),
    purchase: (episodeId, space) => api.post("bentoul", { type: "purchaseEpisode", userId: auth.id, episodeId, space: space || "tech" }),
    register: (payload) => api.post("bentoul", { type: "userRegister", ...payload }),
    login: (username, pin) => api.post("bentoul", { type: "userLogin", username, pin }),
    usernameAvailable: (username) => api.get("bentoul", "checkUsername", { username })
  };

  const benamoura = {
    // Séries d'amour : feuilles Series/Episodes/Commentaires du spreadsheet Benamoura.
    // Les épisodes payants sont débloqués avec le solde Bentoul : benamoura.gs a besoin du userId.
    series: () => api.get("benamoura", "getSeries"),
    episodes: (seriesId) => api.get("benamoura", "getEpisodes", { seriesId, userId: auth.id }),
    comments: (episodeId) => api.get("benamoura", "getComments", { episodeId }),
    comment: (episodeId, message) => api.post("benamoura", { type: "comment", episodeId, pseudo: auth.username, message }),
    // benamoura.gs attend des deltas (likeDelta / dislikeDelta / shareDelta) et targetType "serie"|"episode".
    interaction: (targetType, targetId, action) => api.post("benamoura", {
      type: "interaction", targetType, targetId, [`${action}Delta`]: 1
    }),
    // Profils de rencontre : feuille Profile, liée au compte par la colonne Pseudo.
    profiles: () => api.get("benamoura", "getProfiles"),
    myProfile: () => api.get("benamoura", "getMyProfile", { username: auth.username }),
    saveProfile: (payload) => api.post("benamoura", { type: "profile", username: auth.username, ...payload })
  };

  function deviceInfo() {
    const nav = navigator.userAgent;
    return {
      visitorId: visitorId(),
      pays: (navigator.language || "Inconnu").split("-").pop(),
      device: /Mobi|Android|iPhone/i.test(nav) ? "Mobile" : "Desktop",
      os: (nav.match(/\(([^)]+)\)/) || [])[1] || "",
      browser: /Chrome|Firefox|Safari|Edge|Opera/i.exec(nav)?.[0] || "Inconnu"
    };
  }

  function analytics(eventType, targetTitle, targetId, which) {
    const space = which === "benamoura" ? "benamoura" : "bentoul";
    if (!isConfigured(space)) return Promise.resolve(null);
    return api.post(space, Object.assign({
      type: "analytics",
      eventType,
      targetTitle: targetTitle || "",
      targetId: targetId || ""
    }, deviceInfo())).catch(() => null);
  }

  /* ---------- VUES : une seule vue par appareil et par contenu ---------- */
  function viewToken(which, contentType, contentId) {
    return [which === "benamoura" ? "benamoura" : "bentoul", contentType, contentId].join(":");
  }

  /** True si cet appareil a déjà déclenché la vue (gate local, complète la dédup serveur). */
  function hasSeenView(which, contentType, contentId) {
    return !!read(KEYS.views, {})[viewToken(which, contentType, contentId)];
  }

  /**
   * Enregistre la vue côté serveur (feuille Vues + colonne Vues) une seule fois par appareil.
   * Renvoie le total annoncé par l'API, ou null si la vue est déjà comptée / l'API est muette
   * (déploiement sans registerView_) — l'affichage garde alors la valeur lue dans getSeries/getEpisodes.
   */
  function recordView(which, contentType, contentId) {
    const space = which === "benamoura" ? "benamoura" : "bentoul";
    if (!contentId || !isConfigured(space)) return Promise.resolve(null);
    const token = viewToken(space, contentType, contentId);
    const seen = read(KEYS.views, {});
    if (seen[token]) return Promise.resolve(null);
    seen[token] = Date.now();
    write(KEYS.views, seen);
    return api.post(space, Object.assign({
      type: "registerView",
      contentType,
      contentId
    }, deviceInfo()))
      .then(res => (res && res.status === "success" ? Number(res.views) || 0 : null))
      .catch(() => null);
  }

  /* ============================ UTILITAIRES ============================ */
  const esc = (value) => String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const plain = (html, limit) => {
    const box = document.createElement("div");
    box.innerHTML = String(html || "");
    const text = (box.textContent || "").replace(/\s+/g, " ").trim();
    return limit && text.length > limit ? text.slice(0, limit).trimEnd() + "…" : text;
  };

  const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

  function safeHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    doc.querySelectorAll("script,iframe,object,embed,link,style,meta").forEach(node => node.remove());
    doc.querySelectorAll("*").forEach(node => {
      Array.from(node.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on")) node.removeAttribute(attr.name);
        if ((name === "href" || name === "src") && /^\s*javascript:/i.test(attr.value)) node.removeAttribute(attr.name);
      });
    });
    return doc.body.innerHTML;
  }

  function timeAgo(value) {
    if (!value) return "";
    let date;
    const fr = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (fr) date = new Date(+fr[3], +fr[2] - 1, +fr[1], +(fr[4] || 0), +(fr[5] || 0), +(fr[6] || 0));
    else date = new Date(value);
    if (isNaN(date)) return String(value);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 0) return date.toLocaleDateString("fr-FR");
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return Math.floor(diff / 60) + " min";
    if (diff < 86400) return Math.floor(diff / 3600) + " h";
    if (diff < 2592000) return Math.floor(diff / 86400) + " j";
    return date.toLocaleDateString("fr-FR");
  }

  function friendlyError(err) {
    const message = String(err && err.message ? err.message : err || "Erreur inconnue");
    return message.replace(/^Error:\s*/, "").replace(/Exception: /, "");
  }

  function fillForm(form, data) {
    Object.keys(data || {}).forEach(key => {
      const field = form.elements[key];
      if (!field || data[key] === undefined || data[key] === null) return;
      if (field.type === "checkbox") field.checked = /^(oui|true|1|yes)$/i.test(String(data[key]));
      else field.value = data[key];
    });
  }

  /* ============================ LIENS FIXES (?serie=…&episode=…) ============================ */
  // Ligatures sans décomposition NFD : « Cœur » doit bien devenir « coeur ».
  const SLUG_MAP = { "œ": "oe", "æ": "ae", "ß": "ss", "ø": "o", "đ": "d", "ł": "l" };

  function slugify(value) {
    const lower = String(value || "").toLowerCase().replace(/[œæßøđł]/g, (ch) => SLUG_MAP[ch]);
    const clean = lower
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 60);
    return clean || "sans-titre";
  }

  const route = {
    param(name) {
      return new URLSearchParams(location.search).get(name) || "";
    },
    /** Écrase l'URL courante sans rechargement : le lien reste valide après un rafraîchissement. */
    set(params) {
      const usp = new URLSearchParams(location.search);
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value === "" || value === null || value === undefined) usp.delete(key);
        else usp.set(key, String(value));
      });
      const str = usp.toString();
      const next = location.pathname + (str ? "?" + str : "") + location.hash;
      if (next !== location.pathname + location.search + location.hash) {
        history.pushState({}, "", next);
      }
    },
    onChange(handler) {
      window.addEventListener("popstate", handler);
    }
  };

  /** URL absolue, partageable, pointant sur le contenu demandé. */
  function contentUrl(params) {
    const usp = new URLSearchParams();
    ["serie", "episode", "profil"].forEach(key => {
      if (params && params[key]) usp.set(key, String(params[key]));
    });
    const str = usp.toString();
    const base = location.href.split("#")[0].split("?")[0];
    return base + (str ? "?" + str : "");
  }

  async function copyLink(params) {
    const url = contentUrl(params);
    try {
      await navigator.clipboard.writeText(url);
      ui.toast("Lien copié : " + url.replace(/^https?:\/\//, ""), "ok");
    } catch (err) {
      ui.toast(url, "");
    }
    return url;
  }

  /* ============================ INTERFACE ============================ */
  /** Le défilement de la page se bloque dès qu'un écran ou une feuille est ouvert. */
  function syncScrollLock() {
    document.body.style.overflow = document.querySelector(".screen, .sheet-backdrop") ? "hidden" : "";
  }

  const ui = {
    toast(message, kind) {
      let host = document.querySelector(".toast-host");
      if (!host) {
        host = document.createElement("div");
        host.className = "toast-host";
        document.body.appendChild(host);
      }
      const item = document.createElement("div");
      item.className = "toast " + (kind || "");
      item.textContent = message;
      host.appendChild(item);
      setTimeout(() => {
        item.style.transition = "opacity .25s ease, transform .25s ease";
        item.style.opacity = "0";
        item.style.transform = "translateY(8px)";
        setTimeout(() => item.remove(), 260);
      }, 3200);
    },
    error(err) {
      const message = friendlyError(err);
      ui.toast(message, "err");
      return message;
    },
    sheet(options) {
      const backdrop = document.createElement("div");
      backdrop.className = "sheet-backdrop";
      backdrop.innerHTML = `
        <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(options.title || "Détail")}">
          <div class="sheet-grab"></div>
          <div class="sheet-head">
            <div><h2>${esc(options.title || "")}</h2>${options.subtitle ? `<p>${esc(options.subtitle)}</p>` : ""}</div>
            <button class="icon-button" type="button" aria-label="Fermer">${ICON.close}</button>
          </div>
          <div data-sheet-body></div>
        </div>`;
      const body = backdrop.querySelector("[data-sheet-body]");
      if (typeof options.content === "string") body.innerHTML = options.content;
      else if (options.content) body.appendChild(options.content);

      const close = () => {
        backdrop.remove();
        document.removeEventListener("keydown", onKey);
        syncScrollLock();
      };
      const onKey = (e) => { if (e.key === "Escape") close(); };
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
      backdrop.querySelector(".icon-button").addEventListener("click", close);
      document.addEventListener("keydown", onKey);
      document.body.appendChild(backdrop);
      syncScrollLock();
      return { root: backdrop, body, close };
    },
    /** Écran pleine page avec bouton retour (détail de série, lecteur d'épisode). */
    screen(options) {
      const root = document.createElement("div");
      root.className = "screen";
      root.innerHTML = `
        <div class="screen-bar">
          <button class="icon-button" type="button" aria-label="Retour">${ICON.back}</button>
          <div class="screen-heading"><strong></strong><small></small></div>
        </div>
        <div class="screen-scroll" data-screen-body></div>`;
      const heading = root.querySelector(".screen-heading");
      const entry = {
        root,
        body: root.querySelector("[data-screen-body]"),
        layer: options.layer || "",
        key: options.key || "",
        parent: options.parent || null,
        close
      };

      function setHeading(title, subtitle) {
        heading.querySelector("strong").textContent = title || "";
        heading.querySelector("small").textContent = subtitle || "";
      }
      setHeading(options.title, options.subtitle);

      function close() {
        if (!root.isConnected) return;
        root.remove();
        syncScrollLock();
      }

      root.querySelector(".icon-button").addEventListener("click", () => {
        if (typeof options.onBack === "function") options.onBack(entry);
        else close();
      });
      document.body.appendChild(root);
      syncScrollLock();
      entry.setHeading = setHeading;
      return entry;
    },
    cards(count) {
      return Array.from({ length: count || 3 }, () => `
        <div class="card"><div class="skeleton block"></div>
        <div class="skeleton line" style="margin-top:12px;width:62%"></div>
        <div class="skeleton line" style="margin-top:8px;width:38%"></div></div>`).join("");
    },
    empty(icon, title, text, action) {
      return `<div class="empty"><i>${icon}</i><h3>${esc(title)}</h3><p>${esc(text)}</p>
        ${action ? `<div style="margin-top:16px">${action}</div>` : ""}</div>`;
    },
    busy(button, on, label) {
      if (!button) return;
      if (on) {
        button.dataset.label = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="spinner"></span>${label ? esc(label) : ""}`;
      } else {
        button.disabled = false;
        button.innerHTML = button.dataset.label || button.innerHTML;
      }
    }
  };

  /* ============================ TUILE DE GRILLE ============================ */
  /** Tuile verticale compacte : cover, titre, vues + likes + dislikes. */
  function mediaTile(item, options) {
    const o = options || {};
    const kind = o.kind || "serie";
    const accent = o.accent === "rose" ? "rose" : "tech";
    const cover = item.image
      ? `<img src="${esc(item.image)}" alt="" loading="lazy">`
      : `<span class="fallback ${accent}">${esc(initials(item.titre))}</span>`;
    const foot = `<span class="tile-foot">
        <span class="stat-pill" data-views="${esc(kind)}:${esc(item.id)}" title="Vues">${ICON.eye}<b>${Number(item.views) || 0}</b></span>
        <span class="stat-pill" title="J'aime">${ICON.like}<b>${Number(item.likes) || 0}</b></span>
        <span class="stat-pill" title="Je n'aime pas">${ICON.dislike}<b>${Number(item.dislikes) || 0}</b></span>
      </span>`;
    const tag = o.href ? "a" : "article";
    const link = o.href
      ? `href="${esc(o.href)}"`
      : `data-kind="${esc(kind)}" data-id="${esc(item.id)}" role="button" tabindex="0"`;
    return `<${tag} class="media-tile card card-tap" ${link}>
      <span class="cover">${cover}${o.badge ? `<span class="tile-badge">${o.badge}</span>` : ""}</span>
      <span class="body"><h3>${esc(item.titre)}</h3>${foot}</span>
    </${tag}>`;
  }

  /* ============================ ÉPISODES PAYANTS (CRÉDITS BENTOUL) ============================
     Une seule mécanique pour la Tech et l'Amour : les 3 premiers épisodes d'une série sont
     gratuits, ensuite bentoul.gs débite 1 crédit et journalise l'achat dans EpisodesAchetes.
     Le débit passe toujours par bentoul.gs : c'est lui qui détient le solde (feuille USER).
     `space` vaut "tech" ou "amour" et désigne la feuille Episodes où vérifier l'épisode.
  */
  function creditBadge(ep) {
    if (ep.verrouille) return `<span class="tile-badge">${ICON.lock} ${ep.coutCredits} cr.</span>`;
    return ep.achete ? `<span class="tile-badge">Débloqué</span>` : "";
  }

  /** Fabrique l'episodeGuard de mediaCatalog : carte de connexion, puis carte de déblocage. */
  function creditPaywall(options) {
    const space = options.space === "amour" ? "amour" : "tech";
    const spaceName = space === "amour" ? "L'espace Amour" : "L'espace Tech";

    return (ep, ctx) => {
      if (!ep.verrouille) return false;

      if (!auth.user) {
        ctx.scope.innerHTML = `<div class="screen-inner">
          <div class="notice info"><div>${ICON.lock}</div>
            <div><b>Compte requis</b>${spaceName} débloque ses épisodes payants avec les crédits de ton compte Bentoul.</div></div>
          <a class="btn block" style="margin-top:16px" href="user.html?next=${encodeURIComponent(contentUrl({ serie: slugify(ctx.serie.titre) }))}">Se connecter</a>
        </div>`;
        return true;
      }

      ctx.scope.innerHTML = `<div class="screen-inner">
        <div class="notice warn"><div>${ICON.lock}</div>
          <div><b>Épisode ${ep.numero} verrouillé</b>
            Il coûte ${ep.coutCredits} crédit. Ton solde : <strong>${auth.credits}</strong> crédit${auth.credits > 1 ? "s" : ""}.</div></div>
        ${ep.image ? `<div class="hero" style="margin-top:14px"><img src="${esc(ep.image)}" alt=""></div>` : ""}
        <button class="btn block" style="margin-top:16px" data-unlock type="button">Débloquer avec ${ep.coutCredits} crédit</button>
      </div>`;

      ctx.scope.querySelector("[data-unlock]").addEventListener("click", async (e) => {
        const b = e.currentTarget;
        ui.busy(b, true, "Déblocage…");
        try {
          const res = await bentoul.purchase(ep.id, space);
          if (res.status !== "success") throw new Error(res.message);
          const fresh = await auth.refresh();
          ui.toast(res.message + (fresh ? " · solde " + fresh.credits + " crédits" : ""), "ok");
          if (options.onCredits) options.onCredits();
          ep.verrouille = false;
          ep.achete = true;
          ctx.redraw();
          ctx.refreshList();
        } catch (err) {
          ui.error(err);
          ui.busy(b, false);
        }
      });
      return true;
    };
  }

  /* ============================ CATALOGUE SÉRIES / ÉPISODES ============================
     Parcours identique pour l'espace Tech et l'espace Amour :
     grille (3 colonnes mini, y compris sur mobile) → écran plein écran de la série
     → écran plein écran de l'épisode. Chaque niveau a son lien fixe (?serie=…, &episode=…)
     et une vue unique par appareil.
     options = {
       which, api, grid, accent, seriesSubtitle(s), showStatus,
       episodeBadge(ep), episodeGuard(ep, ctx), reverseEpisodes, commentAuthor(c)
     }
  */
  function mediaCatalog(options) {
    const which = options.which === "benamoura" ? "benamoura" : "bentoul";
    const calls = options.api;
    const grid = options.grid;
    const accent = options.accent === "rose" ? "rose" : "tech";
    const commentAuthor = options.commentAuthor || ((c) => c.username || c.pseudo || "");
    const layers = [];
    let series = [];
    let fromClick = false;
    let warned = "";

    const slug = (item) => slugify(item.titre);
    const byKey = (list, key) => (list || []).find(x => String(x.id) === key || slug(x) === key);
    const top = () => layers[layers.length - 1];

    /* ---------- vues ---------- */
    function countView(kind, item, scope) {
      if (hasSeenView(which, kind, item.id)) return Promise.resolve(null);
      return recordView(which, kind, item.id).then(total => {
        if (total === null) return null;
        item.views = total;
        document.querySelectorAll(`[data-views="${kind}:${item.id}"] b`).forEach(pill => {
          pill.textContent = total;
        });
        return total;
      });
    }

    /* ---------- barre likes / dislikes / partage / vues ---------- */
    function actionBar(kind, item) {
      return `<div class="act-bar">
        <span class="act-stat" data-views="${esc(kind)}:${esc(item.id)}">${ICON.eye}<b>${Number(item.views) || 0}</b><small>vues</small></span>
        <button class="act-btn" type="button" data-act="like">${ICON.like}<b>${Number(item.likes) || 0}</b></button>
        <button class="act-btn" type="button" data-act="dislike">${ICON.dislike}<b>${Number(item.dislikes) || 0}</b></button>
        <button class="act-btn" type="button" data-act="share">${ICON.share}<b>${Number(item.shares) || 0}</b></button>
      </div>`;
    }

    function bindBar(scope, kind, getter, serie) {
      scope.querySelectorAll("[data-act]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const action = btn.dataset.act;
          const item = getter();
          const key = action === "like" ? "likes" : action === "dislike" ? "dislikes" : "shares";
          if (action === "share") {
            copyLink(kind === "episode"
              ? { serie: slug(serie), episode: slug(item) }
              : { serie: slug(item) });
          }
          ui.busy(btn, true);
          try {
            await calls.interaction(kind, item.id, action);
            item[key] = (Number(item[key]) || 0) + 1;
          } catch (err) {
            ui.error(err);
          }
          ui.busy(btn, false);
          btn.querySelector("b").textContent = item[key];
        });
      });
    }

    /* ---------- épisodes d'une série ---------- */
    function episodeTiles(entry) {
      const box = entry.body.querySelector("[data-episodes]");
      const list = entry.episodes;
      box.innerHTML = list.length
        ? list.map(e => mediaTile(e, {
            kind: "episode",
            accent,
            badge: options.episodeBadge ? options.episodeBadge(e)
              : (options.showStatus && e.statut ? `<span class="tile-badge">${esc(e.statut)}</span>` : "")
          })).join("")
        : ui.empty(ICON.chat, "Aucun épisode", "Publie un épisode rattaché à cette série (feuille Episodes).");
      box.querySelectorAll("[data-kind='episode']").forEach(tile => {
        tile.addEventListener("click", () => {
          const ep = byKey(list, tile.dataset.id);
          if (ep) enterEpisode(entry.serie, ep);
        });
      });
    }

    async function loadEpisodes(entry) {
      const box = entry.body.querySelector("[data-episodes]");
      try {
        const res = await calls.episodes(entry.serie.id);
        if (res.status !== "success") throw new Error(res.message);
        let list = res.data || [];
        if (options.reverseEpisodes) list = list.slice().reverse();
        entry.episodes = list;
        entry.body.querySelector("[data-ep-count]").textContent = list.length
          ? `${list.length} épisode${list.length > 1 ? "s" : ""}`
          : "";
        episodeTiles(entry);
        syncLayers();
      } catch (err) {
        box.innerHTML = ui.empty(ICON.close, "Épisodes indisponibles", ui.error(err));
      }
    }

    /* ---------- commentaires d'un épisode ---------- */
    function commentsMarkup(serie, ep) {
      return `<div class="divide"></div>
        <div class="section-title"><h2>Commentaires</h2><small data-cmt-count>…</small></div>
        <div data-comments><div class="skeleton line" style="width:70%"></div>
          <div class="skeleton line" style="width:48%;margin-top:9px"></div></div>
        ${auth.user ? `
          <form data-comment-form style="margin-top:16px">
            <div class="field"><label>Réagir en tant que @${esc(auth.user.username)}</label>
              <textarea class="textarea" data-comment-input maxlength="3000" placeholder="Ton avis sur cet épisode…"></textarea></div>
            <button class="btn${accent === "rose" ? " rose" : ""}" type="submit">Publier</button>
          </form>` : `<div class="notice info"><div>${ICON.chat}</div>
            <div><b>Commenter</b>Connecte ton compte Bentoul pour laisser un avis sous cet épisode.</div></div>
            <a class="btn sm ghost" style="margin-top:10px" href="user.html?next=${encodeURIComponent(contentUrl({ serie: slug(serie), episode: slug(ep) }))}">Connexion</a>`}`;
    }

    async function loadComments(ep, scope) {
      try {
        const res = await calls.comments(ep.id);
        const list = res.data || [];
        scope.querySelector("[data-cmt-count]").textContent =
          list.length + " commentaire" + (list.length > 1 ? "s" : "");
        scope.querySelector("[data-comments]").innerHTML = list.length
          ? list.map(c => `<div class="comment">
              <span class="avatar${accent === "rose" ? " rose" : ""}">${esc(initials(commentAuthor(c)))}</span>
              <div class="bubble"><strong>${esc(commentAuthor(c) || "Anonyme")}</strong>
              <time>${esc(timeAgo(c.date))}</time><p>${esc(c.message)}</p></div></div>`).join("")
          : `<p class="muted small" style="padding:8px 0">Aucun commentaire pour le moment.</p>`;
      } catch (err) { /* la lecture reste possible sans commentaires */ }
    }

    function bindCommentForm(scope, ep) {
      const form = scope.querySelector("[data-comment-form]");
      if (!form) return;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = form.querySelector("[data-comment-input]").value.trim();
        if (!message) return ui.toast("Écris quelque chose d'abord.", "err");
        const btn = form.querySelector("button");
        ui.busy(btn, true, "Publication…");
        try {
          const res = await calls.comment(ep.id, message);
          if (res.status !== "success") throw new Error(res.message);
          form.reset();
          ui.toast("Commentaire publié", "ok");
          loadComments(ep, scope);
        } catch (err) { ui.error(err); }
        ui.busy(btn, false);
      });
    }

    /* ---------- écrans ---------- */
    function drawSeries(screen) {
      const s = screen.serie;
      screen.body.innerHTML = `
        <div class="screen-inner">
          ${s.image ? `<div class="hero"><img src="${esc(s.image)}" alt=""></div>`
            : `<div class="hero empty-hero ${accent}"><span>${esc(initials(s.titre))}</span></div>`}
          <div class="hero-caption">
            <h2>${esc(s.titre)}</h2>
            ${options.showStatus && s.statut ? `<span class="badge ${accent}">${esc(s.statut)}</span>` : ""}
            <small>${esc(options.seriesSubtitle ? options.seriesSubtitle(s) : "")}</small>
          </div>
          ${actionBar("serie", s)}
          ${s.contenu ? `<div class="rich-content">${safeHtml(s.contenu)}</div>` : ""}
          <div class="divide"></div>
          <div class="section-title"><h2>Épisodes</h2><small data-ep-count></small></div>
          <div class="media-grid" data-episodes>${ui.cards(3)}</div>
        </div>`;
      bindBar(screen.body, "serie", () => s);
      countView("serie", s, screen.body);
    }

    function drawEpisode(screen) {
      const ep = screen.episode;
      const serie = screen.serie;
      screen.setHeading(ep.titre, serie.titre + (ep.numero ? " · Épisode " + ep.numero : ""));
      const scope = screen.body;

      if (options.episodeGuard) {
        const handled = options.episodeGuard(ep, {
          scope,
          serie,
          screen,
          redraw: () => drawEpisode(screen),
          refreshList: () => {
            const parent = layers.find(l => l.serie && l.serie.id === serie.id);
            if (parent) loadEpisodes(parent);
          }
        });
        if (handled) return;
      }

      scope.innerHTML = `<div class="screen-inner">
        ${ep.image ? `<div class="hero"><img src="${esc(ep.image)}" alt=""></div>` : ""}
        <h2 class="episode-title">${esc(ep.titre)}</h2>
        <div class="rich-content">${safeHtml(ep.contenu)}</div>
        ${actionBar("episode", ep)}
        ${commentsMarkup(serie, ep)}</div>`;
      bindBar(scope, "episode", () => ep, serie);
      bindCommentForm(scope, ep);
      countView("episode", ep, scope);
      loadComments(ep, scope);
    }

    function pushSeriesLayer(s) {
      const screen = ui.screen({
        layer: "serie", key: s.id, title: s.titre,
        subtitle: options.seriesLabel || "Série",
        onBack: () => goBack(screen)
      });
      screen.serie = s;
      screen.episodes = [];
      screen.hasHistory = fromClick;
      layers.push(screen);
      drawSeries(screen);
      loadEpisodes(screen);
      return screen;
    }

    function pushEpisodeLayer(parent, ep) {
      const screen = ui.screen({
        layer: "episode", key: ep.id, title: ep.titre,
        subtitle: parent.serie.titre + (ep.numero ? " · Épisode " + ep.numero : ""),
        parent,
        onBack: () => goBack(screen)
      });
      screen.serie = parent.serie;
      screen.episode = ep;
      screen.hasHistory = fromClick;
      layers.push(screen);
      drawEpisode(screen);
      return screen;
    }

    function popLayer() {
      const screen = layers.pop();
      screen.close();
      return screen;
    }

    function goBack(screen) {
      if (screen.hasHistory) {
        history.back();
        return;
      }
      route.set(screen.layer === "episode"
        ? { episode: "" }
        : { serie: "", episode: "" });
      syncLayers();
    }

    /* ---------- pilotage par l'URL ---------- */
    function syncLayers() {
      const serieKey = route.param("serie");
      const episodeKey = route.param("episode");

      if (!serieKey) {
        while (layers.length) popLayer();
        return;
      }
      const s = byKey(series, serieKey);
      if (!s) {
        if (series.length && serieKey !== warned) {
          warned = serieKey;
          ui.toast("Contenu introuvable pour le lien : " + serieKey, "err");
        }
        return;
      }
      warned = "";
      if (layers.length && layers[0].serie.id !== s.id) {
        while (layers.length) popLayer();
      }
      if (!layers.length) pushSeriesLayer(s);

      if (!episodeKey) {
        while (layers.length > 1) popLayer();
        return;
      }
      const ep = byKey(layers[0].episodes, episodeKey);
      if (!ep) return;
      if (layers.length > 1 && layers[1].episode.id === ep.id) return;
      if (layers.length > 1) popLayer();
      pushEpisodeLayer(layers[0], ep);
    }

    function enterSeries(s) {
      fromClick = true;
      route.set({ serie: slug(s), episode: "" });
      syncLayers();
      fromClick = false;
    }

    function enterEpisode(serie, ep) {
      fromClick = true;
      route.set({ serie: slug(serie), episode: slug(ep) });
      syncLayers();
      fromClick = false;
    }

    /* ---------- grille des séries ---------- */
    function drawGrid() {
      if (!series.length) {
        grid.innerHTML = ui.empty(ICON.tech, options.emptyTitle || "Aucune série publiée",
          options.emptyText || "Ajoute une ligne dans la feuille Series (statut « Publié »).");
        return;
      }
      grid.innerHTML = series.map(s => mediaTile(s, {
        kind: "serie",
        accent,
        badge: options.showStatus && s.statut ? `<span class="tile-badge">${esc(s.statut)}</span>` : ""
      })).join("");
    }

    function load() {
      grid.innerHTML = ui.cards(6);
      return calls.series().then(res => {
        if (res.status !== "success") throw new Error(res.message);
        let list = res.data || [];
        if (options.filter) list = list.filter(options.filter);
        series = list;
        drawGrid();
        if (typeof options.onLoaded === "function") options.onLoaded(series);
        syncLayers();
        return series;
      }).catch(err => {
        grid.innerHTML = ui.empty(ICON.close, "Chargement impossible", ui.error(err));
        throw err;
      });
    }

    grid.addEventListener("click", (e) => {
      const tile = e.target.closest("[data-kind='serie']");
      if (!tile) return;
      const s = byKey(series, tile.dataset.id);
      if (s) enterSeries(s);
    });
    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const tile = e.target.closest("[data-kind='serie']");
      if (!tile) return;
      e.preventDefault();
      const s = byKey(series, tile.dataset.id);
      if (s) enterSeries(s);
    });
    route.onChange(() => syncLayers());

    return { load, openSeries: enterSeries, get series() { return series; } };
  }

  /* ============================ ICONES ============================ */
  const ICON = {
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 10-8.8 10S3.2 14 3.2 8.8A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.4Z"/></svg>',
    tech: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14h2"/></svg>',
    dates: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.4"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M17 5.6a3.4 3.4 0 0 1 0 6.8M18 20a6 6 0 0 0-3-5.2"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 6-6m-6 6 6 6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12S5.8 5.6 12 5.6 21.8 12 21.8 12 18.2 18.4 12 18.4 2.2 12 2.2 12Z"/><circle cx="12" cy="12" r="2.7"/></svg>',
    like: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21V10.4l3.6-6.9a2 2 0 0 1 2.8 2.3L12.4 9h4.9a2 2 0 0 1 1.9 2.6l-1.6 7A2.4 2.4 0 0 1 15.2 21H7Z"/><path d="M7 10.4H4.4a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1H7"/></svg>',
    dislike: '<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(180 12 12)"><path d="M7 21V10.4l3.6-6.9a2 2 0 0 1 2.8 2.3L12.4 9h4.9a2 2 0 0 1 1.9 2.6l-1.6 7A2.4 2.4 0 0 1 15.2 21H7Z"/><path d="M7 10.4H4.4a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1H7"/></g></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.4m0 0L8.2 7.2M12 3.4l3.8 3.8"/><path d="M5 12.6V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.4" y="10" width="15.2" height="10.6" rx="2.4"/><path d="M8 10V7.2a4 4 0 0 1 8 0V10"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15a2.6 2.6 0 0 1-2.6 2.6H9.4L4.6 21V6.4a2.6 2.6 0 0 1 2.6-2.6h10.6a2.6 2.6 0 0 1 2.6 2.6Z"/></svg>'
  };

  /* ============================ LAYOUT ============================ */
  function currentPage() {
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (file.startsWith("benamoura")) return "amour";
    if (file.startsWith("rencontres")) return "dates";
    if (file.startsWith("bentoul")) return "tech";
    if (file.startsWith("profile")) return "profile";
    if (file.startsWith("user")) return "account";
    return "home";
  }

  function navLink(item) {
    const active = currentPage() === item.id ? " active" : "";
    return `<a class="app-nav-link${active}" href="${item.href}"${active ? ' aria-current="page"' : ""}>
      <span class="nav-icon">${ICON[item.icon] || ICON.home}</span>
      <span>${item.label}</span>
    </a>`;
  }

  function headerAccountMarkup() {
    const user = auth.user;
    if (!user) return `<a class="btn sm" href="user.html">Connexion</a>`;
    return `<span class="pill" title="Crédits Bentoul"><b>${auth.credits}</b> cr.</span>
      <a class="avatar" href="user.html" aria-label="Mon compte" style="width:38px;height:38px;font-size:13px">${esc(initials(user.nom || user.username))}</a>`;
  }

  function sidebarAccountMarkup() {
    const user = auth.user;
    if (!user) {
      return `<a class="app-nav-link" href="user.html"><span class="nav-icon">${ICON.user}</span><span>Se connecter</span></a>`;
    }
    return `<div class="sidebar-account">
      <span class="avatar">${esc(initials(user.nom || user.username))}</span>
      <div><strong>${esc(user.nom || user.username)}</strong><small>@${esc(user.username)} · ${auth.credits} crédits</small></div>
    </div>`;
  }

  function renderHeaderAccount() {
    const slot = document.getElementById("header-account");
    if (slot) slot.innerHTML = headerAccountMarkup();
    const side = document.getElementById("sidebar-account");
    if (side) side.innerHTML = sidebarAccountMarkup();
  }

  function renderLayout() {
    const body = document.body;
    if (!body.classList.contains("body-layout")) return;

    const pageNodes = Array.from(body.childNodes).filter(node => node.nodeName !== "SCRIPT");
    pageNodes.forEach(node => node.parentNode && node.parentNode.removeChild(node));

    body.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <button class="icon-button menu-toggle" type="button" aria-label="Ouvrir le menu" aria-expanded="false">${ICON.menu}</button>
          <a class="brand" href="index.html" aria-label="BENTAMOURA accueil">
            <span class="brand-mark">${ICON.heart}</span>
            <span class="brand-copy"><strong>${APP.name}</strong><small>${APP.subtitle}</small></span>
          </a>
          <div class="header-actions">
            <span class="status-dot" title="Application"></span>
            <span id="header-account">${headerAccountMarkup()}</span>
          </div>
        </header>

        <div class="app-main">
          <div class="sidebar-backdrop"></div>
          <aside class="app-sidebar" aria-label="Navigation principale">
            <div class="sidebar-heading">MENU PRINCIPAL</div>
            <nav class="sidebar-nav">${APP.links.map(navLink).join("")}</nav>
            <div class="sidebar-bottom">
              <div id="sidebar-account">${sidebarAccountMarkup()}</div>
              <div class="sidebar-note"><span class="note-heart">${ICON.heart}</span><p>Un seul compte pour l'espace Amour, l'espace Tech et ton profil.</p></div>
              <small>BENTAMOURA WEB · V1.0</small>
            </div>
          </aside>
          <main class="app-content" id="body-content">
            <div class="page-container" id="page-container"></div>
          </main>
        </div>

        <footer class="app-footer">
          <nav class="bottom-nav" aria-label="Navigation mobile">${APP.links.map(navLink).join("")}</nav>
          <div class="footer-desktop">© ${new Date().getFullYear()} BENTAMOURA WEB <span>Fait avec passion</span></div>
        </footer>
      </div>`;

    const container = document.getElementById("page-container");
    pageNodes.forEach(node => container.appendChild(node));

    const shell = body.querySelector(".app-shell");
    const toggle = shell.querySelector(".menu-toggle");
    const backdrop = shell.querySelector(".sidebar-backdrop");

    const closeMenu = () => {
      shell.classList.remove("sidebar-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Ouvrir le menu");
      toggle.innerHTML = ICON.menu;
    };

    toggle.addEventListener("click", () => {
      const open = shell.classList.toggle("sidebar-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      toggle.innerHTML = open ? ICON.close : ICON.menu;
    });

    backdrop.addEventListener("click", closeMenu);
    shell.querySelectorAll(".app-nav-link").forEach(link => link.addEventListener("click", closeMenu));
    renderHeaderAccount();
  }

  /* ============================ EXPOSITION ============================ */
  window.BTM = {
    APP, ICON, KEYS, config, isConfigured, visitorId,
    auth, api, bentoul, benamoura, analytics,
    ui, esc, plain, safeHtml, timeAgo, initials, friendlyError, fillForm,
    slugify, route, contentUrl, copyLink, recordView, hasSeenView,
    mediaTile, mediaCatalog, creditBadge, creditPaywall
  };

  if (!window.BTM_CONFIG) {
    (console.warn || console.log)("config.js non chargé : les URLs /exec sont indisponibles.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  function boot() {
    renderLayout();
    if (auth.user) auth.refresh();
    document.dispatchEvent(new Event("btm:ready"));
  }
})();
