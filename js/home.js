
(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  let seriesList = [];
  let episodeList = [];
  let commentList = [];
  let currentSeries = null;
  let currentEpisode = null;
  let currentUser = null;

  try {
    currentUser = JSON.parse(sessionStorage.getItem("bentoulUser") || "null");
  } catch {
    currentUser = null;
  }

  // --------------------------------------------------
  // OUTILS : SÉCURITÉ ET LECTURE DES DONNÉES
  // --------------------------------------------------

  function value(object, ...keys) {
    for (const key of keys) {
      if (object && object[key] !== undefined && object[key] !== null) {
        return object[key];
      }
    }
    return "";
  }

  function escapeHTML(input) {
    return String(input ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  // Retire les balises HTML reçues de la base.
  // Le contenu est ensuite affiché comme du texte, jamais exécuté.
  function cleanText(input) {
    let text = String(input ?? "");

    text = text
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " ");

    const decoder = document.createElement("textarea");
    decoder.innerHTML = text;

    return decoder.value
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function listFrom(result, keys) {
    if (Array.isArray(result)) return result;

    for (const key of keys) {
      if (Array.isArray(result?.[key])) return result[key];
    }

    return [];
  }

  function seriesIdOf(series) {
    return String(value(
      series, "id", "ID", "serieId", "SerieID", "IDSerie", "idSerie"
    ));
  }

  function episodeIdOf(episode) {
    return String(value(
      episode, "episodeId", "EpisodeID", "IDEpisode",
      "idEpisode", "id", "ID"
    ));
  }

  function parentSeriesIdOf(episode) {
    return String(value(
      episode, "serieId", "SerieID", "idSerie",
      "serie_id", "IDSerie", "seriesId"
    ));
  }

  function commentEpisodeIdOf(comment) {
    return String(value(
      comment, "episodeId", "EpisodeID", "idEpisode",
      "episode_id", "IDEpisode"
    ));
  }

  function seriesTitle(series) {
    return cleanText(value(
      series, "titre", "Titre", "title", "nom", "Nom"
    )) || "Série sans titre";
  }

  function episodeTitle(episode) {
    return cleanText(value(
      episode, "titre", "Titre", "title", "nom", "Nom"
    )) || "Épisode sans titre";
  }

  function description(item) {
    return cleanText(value(
      item, "description", "Description", "resume",
      "Résumé", "contenu", "Contenu", "texte", "Texte"
    ));
  }

  function imageURL(item) {
    const url = String(value(
      item, "image", "Image", "imageUrl", "ImageURL", "urlImage"
    )).trim();

    // Autorise uniquement les URL HTTP(S) pour les images.
    try {
      const parsed = new URL(url, location.href);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function count(item, ...keys) {
    const number = Number(value(item, ...keys));
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function currentUserId() {
    return String(value(currentUser, "id", "ID", "userId", "UserID"));
  }

  function currentUsername() {
    return String(value(currentUser, "username", "Username"));
  }

  // --------------------------------------------------
  // COMMUNICATION AVEC APPS SCRIPT
  // --------------------------------------------------

  async function api(payload, method = "POST") {
    if (typeof window.apiRequest !== "function") {
      throw new Error("La fonction API est absente. Vérifie js/config.js.");
    }

    const result = await window.apiRequest(payload, method);

    if (result && result.status === "error") {
      throw new Error(result.message || "Erreur du serveur.");
    }

    return result;
  }

  async function getData(action) {
    const result = await api({ action }, "GET");

    if (result && result.status === "error") {
      throw new Error(result.message || "Erreur de chargement.");
    }

    return result?.data ?? result;
  }

  // --------------------------------------------------
  // AFFICHAGE DES COMPTEURS
  // --------------------------------------------------

  function interactionBar(item, contentType) {
    const likes = count(item, "likes", "Likes", "Jaime", "j_aime");
    const dislikes = count(item, "dislikes", "Dislikes", "JeNaimePas");
    const shares = count(item, "shares", "Shares", "Partages", "partages");

    return `
      <div class="interaction-bar">
        <button type="button" class="reaction-btn"
          data-react="like" data-type="${contentType}">
          👍 J'aime <span>${likes}</span>
        </button>

        <button type="button" class="reaction-btn"
          data-react="dislike" data-type="${contentType}">
          👎 Je n'aime pas <span>${dislikes}</span>
        </button>

        <button type="button" class="reaction-btn"
          data-react="share" data-type="${contentType}">
          ↗ Partager <span>${shares}</span>
        </button>
      </div>
    `;
  }

  // --------------------------------------------------
  // SÉRIES
  // --------------------------------------------------

  async function loadSeries() {
    const container = $("#series-container");
    if (!container) return;

    container.innerHTML = '<p class="loading">Chargement des séries...</p>';

    try {
      const result = await getData("getSeries");

      seriesList = listFrom(result, [
        "series", "Series", "data", "result"
      ]);

      if (!seriesList.length) {
        container.innerHTML = "<p>Aucune série disponible actuellement.</p>";
        return;
      }

      container.innerHTML = seriesList.map((series) => {
        const id = seriesIdOf(series);
        const title = seriesTitle(series);
        const text = description(series);
        const image = imageURL(series);

        return `
          <article class="content-card">
            ${image
              ? `<img class="card-image"
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(title)}"
                    loading="lazy">`
              : ""}

            <div class="card-body">
              <h3>${escapeHTML(title)}</h3>
              <p>${escapeHTML(text)}</p>

              ${interactionBar(series, "series")}

              <button type="button" class="btn-primary open-series"
                data-id="${escapeHTML(id)}">
                Voir les épisodes
              </button>
            </div>
          </article>
        `;
      }).join("");

      container.querySelectorAll(".open-series").forEach((button) => {
        button.addEventListener("click", () => openSeries(button.dataset.id));
      });

      attachReactions(container);
    } catch (error) {
      container.textContent = "";
      const message = document.createElement("p");
      message.className = "error";
      message.textContent = error.message;
      container.appendChild(message);
    }
  }

  // --------------------------------------------------
  // ÉPISODES D'UNE SÉRIE
  // --------------------------------------------------

  async function openSeries(id) {
    currentSeries = seriesList.find(
      (series) => seriesIdOf(series) === String(id)
    );

    if (!currentSeries) {
      window.showMessage("Série introuvable.", true);
      return;
    }

    $("#selected-series").innerHTML = `
      <div class="panel">
        <h2>${escapeHTML(seriesTitle(currentSeries))}</h2>
        <p>${escapeHTML(description(currentSeries))}</p>
        ${interactionBar(currentSeries, "series")}
      </div>
    `;

    window.navigateTo("episodes");

    const container = $("#episodes-container");
    container.innerHTML = '<p class="loading">Chargement des épisodes...</p>';

    try {
      const result = await getData("getEpisodes");

      episodeList = listFrom(result, [
        "episodes", "Episodes", "data", "result"
      ]);

      const filtered = episodeList.filter(
        (episode) => parentSeriesIdOf(episode) === String(id)
      );

      if (!filtered.length) {
        container.innerHTML = "<p>Aucun épisode disponible pour cette série.</p>";
        attachReactions($("#selected-series"));
        return;
      }

      container.innerHTML = filtered.map((episode) => {
        const episodeId = episodeIdOf(episode);
        const title = episodeTitle(episode);
        const text = description(episode);
        const number = cleanText(value(
          episode, "numero", "Numero", "numEpisode", "episodeNumber"
        ));

        return `
          <article class="content-card">
            <div class="card-body">
              <span class="episode-label">
                ${number ? "Épisode " + escapeHTML(number) : "Épisode"}
              </span>

              <h3>${escapeHTML(title)}</h3>
              <p>${escapeHTML(text)}</p>

              ${interactionBar(episode, "episode")}

              <button type="button" class="btn-primary open-episode"
                data-id="${escapeHTML(episodeId)}">
                Ouvrir l'épisode
              </button>
            </div>
          </article>
        `;
      }).join("");

      container.querySelectorAll(".open-episode").forEach((button) => {
        button.addEventListener("click", () => openEpisode(button.dataset.id));
      });

      attachReactions(container);
      attachReactions($("#selected-series"));
    } catch (error) {
      container.textContent = "";
      const message = document.createElement("p");
      message.className = "error";
      message.textContent = error.message;
      container.appendChild(message);
    }
  }

  // --------------------------------------------------
  // DÉTAIL D'UN ÉPISODE
  // --------------------------------------------------

  async function openEpisode(id) {
    currentEpisode = episodeList.find(
      (episode) => episodeIdOf(episode) === String(id)
    );

    if (!currentEpisode) {
      window.showMessage("Épisode introuvable.", true);
      return;
    }

    const title = episodeTitle(currentEpisode);
    const text = description(currentEpisode);
    const image = imageURL(currentEpisode);

    const rawVideo = String(value(
      currentEpisode, "video", "Video", "videoUrl", "VideoURL", "lien", "Lien"
    )).trim();

    let safeVideo = "";

    try {
      const parsed = new URL(rawVideo, location.href);
      if (["http:", "https:"].includes(parsed.protocol)) {
        safeVideo = parsed.href;
      }
    } catch {
      safeVideo = "";
    }

    $("#episode-detail").innerHTML = `
      <h2>${escapeHTML(title)}</h2>

      ${image
        ? `<img class="episode-image"
              src="${escapeHTML(image)}"
              alt="${escapeHTML(title)}">`
        : ""}

      <div class="episode-content">
        ${escapeHTML(text).replace(/\n/g, "<br>")}
      </div>

      ${safeVideo
        ? `<p><a href="${escapeHTML(safeVideo)}"
              target="_blank" rel="noopener noreferrer">
              ▶ Ouvrir la vidéo ou le contenu
            </a></p>`
        : ""}

      ${interactionBar(currentEpisode, "episode")}
    `;

    window.navigateTo("episode");
    attachReactions($("#episode-detail"));

    await loadComments();
  }

  // --------------------------------------------------
  // COMMENTAIRES PAR ÉPISODE
  // --------------------------------------------------

  async function loadComments() {
    const container = $("#comments-container");
    if (!container || !currentEpisode) return;

    container.innerHTML = '<p class="loading">Chargement des commentaires...</p>';

    try {
      const result = await getData("getComments");

      commentList = listFrom(result, [
        "comments", "commentaires", "Commentaires", "data", "result"
      ]);

      const episodeId = episodeIdOf(currentEpisode);

      const filtered = commentList.filter(
        (comment) => commentEpisodeIdOf(comment) === episodeId
      );

      if (!filtered.length) {
        container.innerHTML = "<p>Aucun commentaire pour le moment.</p>";
        return;
      }

      container.innerHTML = filtered.map((comment) => {
        const username = cleanText(value(
          comment, "username", "Username", "nom", "Nom"
        )) || "Utilisateur";

        const text = cleanText(value(
          comment, "texte", "Texte", "commentaire",
          "Commentaire", "text", "contenu", "Contenu"
        ));

        const date = cleanText(value(
          comment, "date", "Date", "dateCreation", "DateCreation"
        ));

        return `
          <article class="comment-card">
            <strong>${escapeHTML(username)}</strong>
            <p>${escapeHTML(text).replace(/\n/g, "<br>")}</p>
            ${date ? `<small>${escapeHTML(date)}</small>` : ""}
          </article>
        `;
      }).join("");
    } catch (error) {
      container.textContent = "";
      const message = document.createElement("p");
      message.className = "error";
      message.textContent = error.message;
      container.appendChild(message);
    }
  }

  // --------------------------------------------------
  // LIKES, DISLIKES ET PARTAGES
  // --------------------------------------------------

  function attachReactions(container) {
    if (!container) return;

    container.querySelectorAll("[data-react]").forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";

      button.addEventListener("click", async () => {
        const action = button.dataset.react;
        const type = button.dataset.type;

        const item = type === "series"
          ? currentSeriesForButton(button)
          : currentEpisodeForButton(button);

        if (!item) {
          window.showMessage("Impossible d'identifier ce contenu.", true);
          return;
        }

        const contentId = type === "series"
          ? seriesIdOf(item)
          : episodeIdOf(item);

        if (!contentId) {
          window.showMessage("L'identifiant du contenu est manquant.", true);
          return;
        }

        if (action !== "share" && !currentUser) {
          window.showMessage("Connecte-toi pour réagir.", true);
          window.navigateTo("auth");
          return;
        }

        if (action === "share") {
          await shareContent(item, type, contentId, button);
          return;
        }

        button.disabled = true;

        try {
          await api({
            type: "interaction",
            contentType: type,
            contentId,
            action,
            userId: currentUserId(),
            username: currentUsername()
          });

          const counter = button.querySelector("span");
          if (counter) {
            counter.textContent = String(Number(counter.textContent || 0) + 1);
          }

          button.classList.add("selected");
          window.showMessage("Réaction enregistrée.");
        } catch (error) {
          window.showMessage(error.message, true);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function currentSeriesForButton(button) {
    const card = button.closest(".content-card");
    if (card) {
      const openButton = card.querySelector(".open-series");
      if (openButton) {
        return seriesList.find(
          (item) => seriesIdOf(item) === openButton.dataset.id
        ) || null;
      }
    }

    return currentSeries;
  }

  function currentEpisodeForButton(button) {
    const card = button.closest(".content-card");
    if (card) {
      const openButton = card.querySelector(".open-episode");
      if (openButton) {
        return episodeList.find(
          (item) => episodeIdOf(item) === openButton.dataset.id
        ) || null;
      }
    }

    return currentEpisode;
  }

  async function shareContent(item, type, contentId, button) {
    const title = type === "series" ? seriesTitle(item) : episodeTitle(item);

    // URL partageable de la page actuelle.
    const shareUrl = location.href.split("#")[0] +
      (type === "series" ? "#serie-" : "#episode-") +
      encodeURIComponent(contentId);

    let shared = false;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: "Découvre ce contenu sur BENTOUL CREATION.",
          url: shareUrl
        });
        shared = true;
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        shared = true;
        window.showMessage("Lien copié. Tu peux maintenant le partager.");
      } else {
        window.showMessage("Lien à partager : " + shareUrl);
        return;
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        window.showMessage("Le partage a échoué.", true);
      }
      return;
    }

    if (!shared) return;

    try {
      await api({
        type: "interaction",
        contentType: type,
        contentId,
        action: "share",
        userId: currentUserId(),
        username: currentUsername()
      });

      const counter = button.querySelector("span");
      if (counter) {
        counter.textContent = String(Number(counter.textContent || 0) + 1);
      }
    } catch (error) {
      window.showMessage(
        "Le lien a été partagé, mais le compteur n'a pas été enregistré : " +
        error.message,
        true
      );
    }
  }

  // --------------------------------------------------
  // CONNEXION
  // --------------------------------------------------

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = $("#login-username").value.trim();
    const pin = $("#login-pin").value;

    if (!/^\d{6}$/.test(pin)) {
      window.showMessage("Le PIN doit contenir exactement 6 chiffres.", true);
      return;
    }

    try {
      const result = await api({
        type: "userLogin",
        username,
        pin
      });

      if (result.status !== "success" || !result.user) {
        throw new Error(result.message || "Connexion refusée.");
      }

      currentUser = result.user;
      sessionStorage.setItem("bentoulUser", JSON.stringify(currentUser));

      if (window.updateAuthUI) window.updateAuthUI(currentUser);

      $("#login-form").reset();

      window.showMessage("Connexion réussie.");
      window.navigateTo("profile");

      if (window.renderProfile) window.renderProfile();
    } catch (error) {
      window.showMessage(error.message, true);
    }
  });

  // --------------------------------------------------
  // INSCRIPTION
  // --------------------------------------------------

  $("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const pin = $("#reg-pin").value;

    if (!/^\d{6}$/.test(pin)) {
      window.showMessage("Le PIN doit contenir exactement 6 chiffres.", true);
      return;
    }

    try {
      const result = await api({
        type: "userRegister",
        nom: $("#reg-name").value.trim(),
        username: $("#reg-username").value.trim(),
        pin,
        email: $("#reg-email").value.trim(),
        numero: $("#reg-phone").value.trim(),
        codeParrain: $("#reg-referral").value.trim()
      });

      if (result.status !== "success") {
        throw new Error(result.message || "Inscription impossible.");
      }

      $("#register-form").reset();

      window.showMessage(
        "Compte créé ! Connecte-toi pour accéder à ton profil et à tes crédits."
      );

      document.querySelector('[data-auth-tab="login"]').click();
      $("#login-username").value = $("#reg-username").value.trim();
      $("#login-pin").focus();
    } catch (error) {
      window.showMessage(error.message, true);
    }
  });

  // --------------------------------------------------
  // AJOUT DE COMMENTAIRES
  // --------------------------------------------------

  $("#comment-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      window.showMessage("Connecte-toi pour commenter.", true);
      window.navigateTo("auth");
      return;
    }

    if (!currentEpisode) {
      window.showMessage("Aucun épisode sélectionné.", true);
      return;
    }

    const text = $("#comment-text").value.trim();
    if (!text) return;

    const button = $("#comment-form button[type='submit']");
    button.disabled = true;

    try {
      const result = await api({
        type: "comment",
        episodeId: episodeIdOf(currentEpisode),
        contentId: episodeIdOf(currentEpisode),
        contentType: "episode",
        userId: currentUserId(),
        username: currentUsername(),
        texte: text,
        text
      });

      if (result.status !== "success") {
        throw new Error(result.message || "Commentaire non enregistré.");
      }

      $("#comment-text").value = "";
      window.showMessage("Commentaire publié.");

      await loadComments();
    } catch (error) {
      window.showMessage(error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  // --------------------------------------------------
  // PROFIL ET DÉCONNEXION
  // --------------------------------------------------

  window.renderProfile = function () {
    const container = $("#profile-content");
    if (!container) return;

    if (!currentUser) {
      container.innerHTML = `
        <p>Tu n'es pas connecté.</p>
        <button class="btn-primary" data-page="auth">
          Connexion / Inscription
        </button>
      `;
      return;
    }

    const name = cleanText(value(currentUser, "nom", "Nom")) || "Utilisateur";
    const username = cleanText(value(currentUser, "username", "Username"));
    const credits = value(currentUser, "credits", "Credits") || 0;
    const referral = cleanText(value(
      currentUser, "codeReference", "CodeReference"
    )) || "Non disponible";

    container.innerHTML = `
      <div class="profile-avatar">👤</div>
      <h3>${escapeHTML(name)}</h3>
      <p>@${escapeHTML(username)}</p>
      <p>Crédits : <strong>${escapeHTML(credits)}</strong></p>
      <p>Code de parrainage : <strong>${escapeHTML(referral)}</strong></p>
      <button id="profile-logout" class="btn-secondary" type="button">
        Se déconnecter
      </button>
    `;

    $("#profile-logout").addEventListener("click", () => {
      currentUser = null;
      sessionStorage.removeItem("bentoulUser");

      if (window.updateAuthUI) window.updateAuthUI(null);

      window.renderProfile();
      window.navigateTo("home");
      window.showMessage("Tu es déconnecté.");
    });
  };

  // --------------------------------------------------
  // BOUTONS RETOUR ET ACTUALISATION
  // --------------------------------------------------

  $("#refresh-series").addEventListener("click", loadSeries);

  $("#back-to-series").addEventListener("click", () => {
    window.navigateTo("series");
  });

  $("#back-to-episodes").addEventListener("click", () => {
    if (currentSeries) {
      openSeries(seriesIdOf(currentSeries));
    } else {
      window.navigateTo("series");
    }
  });

  // Les boutons d'interaction affichés dans la zone détaillée
  // utilisent la même logique que les compteurs de l'épisode.
  $("#episode-like").addEventListener("click", () => {
    $("#episode-detail [data-react='like']")?.click();
  });

  $("#episode-dislike").addEventListener("click", () => {
    $("#episode-detail [data-react='dislike']")?.click();
  });

  $("#episode-share").addEventListener("click", () => {
    $("#episode-detail [data-react='share']")?.click();
  });

  // Expose la fonction utilisée par app.js.
  window.loadSeries = loadSeries;

  // Applique l'état de connexion à l'ouverture.
  if (window.updateAuthUI) window.updateAuthUI(currentUser);

  loadSeries();
})();
