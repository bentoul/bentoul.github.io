/**
 * BENTOUL CREATION
 * API Google Sheets + Google Drive
 * Séries, épisodes, commentaires, statistiques et utilisateurs.
 */

const SHEET_SERIES = "Series";
const SHEET_EPISODES = "Episodes";
const SHEET_COMMENTS = "Commentaires";
const SHEET_STATS = "Statistiques";
const SHEET_USER = "USER";
const SHEET_PURCHASED_EPISODES = "EpisodesAchetes";
const SHEET_BLOG = "Blog";
const EPISODES_FREE_COUNT = 3;
const EPISODE_CREDIT_COST = 1;
const DRIVE_FOLDER_NAME = "Bentoul_Uploads";

const STARTING_CREDITS = 10;

// Seuls ces comptes obtiennent le rôle admin côté serveur.
const ADMIN_USERNAMES = ["bentouladmin"];

const USER_HEADERS = [
  "ID",
  "Nom",
  "Username",
  "PINHash",
  "Email",
  "Numero",
  "Credits",
  "CodeReference",
  "Parrain",
  "DateCreation",
  "Role"
];

const BLOG_HEADERS = [
  "ID",
  "Slug",
  "Titre",
  "Description",
  "Categorie",
  "Image",
  "Contenu",
  "Auteur",
  "Date",
  "DateModification",
  "Statut",
  "Lecture"
];

const BLOG_SEED_KEY = "bentoul_blog_seed_v1";

/* =========================================
   CONVERTISSEUR D'URL GOOGLE DRIVE EN LIEN DIRECT
========================================= */

function formatDriveImageUrl_(url) {
  if (!url) return "";
  const str = String(url).trim();

  // Si c'est déjà le lien direct CDN
  if (str.indexOf("lh3.googleusercontent.com") !== -1) {
    return str;
  }

  // Extraction de l'ID du fichier Google Drive
  let match = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) match = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!match) match = str.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (match && match[1]) {
    return "https://lh3.googleusercontent.com/d/" + match[1];
  }

  return str;
}

/* =========================================
   GET API
========================================= */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  checkAndCreateSheets(ss);

  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || "");
  const includeDrafts = String(params.includeDrafts || params.all || params.editor || "") === "true";

  let response = {
    status: "error",
    message: "Action non valide"
  };

  try {
    if (action === "getSeries") {
      const sheet = ss.getSheetByName(SHEET_SERIES);
      const data = sheet.getDataRange().getValues();
      const series = [];

      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;

        // Si ce n'est pas l'éditeur, on n'affiche que les séries publiées
        if (!includeDrafts && String(data[i][8] || "Publié") !== "Publié") continue;

        series.push({
          id: String(data[i][0]),
          titre: String(data[i][1] || ""),
          contenu: String(data[i][2] || ""),
          image: formatDriveImageUrl_(data[i][3]),
          date: formatDate_(data[i][4]),
          likes: Number(data[i][5]) || 0,
          dislikes: Number(data[i][6]) || 0,
          shares: Number(data[i][7]) || 0,
          statut: String(data[i][8] || "Publié")
        });
      }

      response = { status: "success", data: series.reverse() };

    } else if (action === "getEpisodes") {
      const seriesId = String(params.seriesId || "").trim();
      const userId = String(params.userId || params.id || "").trim();
      const sheet = ss.getSheetByName(SHEET_EPISODES);
      const data = sheet.getDataRange().getValues();
      const episodes = [];
      const episodeNumbers = {};
      const purchasedIds = getPurchasedEpisodeIds_(ss, userId);

      // Numérotation calculée dans l'ordre de la feuille, séparément pour chaque série.
      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        const parentId = String(data[i][1] || "").trim();
        const status = String(data[i][9] || "Publié");
        if (!includeDrafts && status !== "Publié") continue;
        episodeNumbers[parentId] = (episodeNumbers[parentId] || 0) + 1;
        const episodeNumber = episodeNumbers[parentId];
        if (seriesId && parentId !== seriesId) continue;

        const episodeId = String(data[i][0]);
        const isFree = episodeNumber <= EPISODES_FREE_COUNT;
        const isPurchased = purchasedIds.has(episodeId);
        const isUnlocked = isFree || isPurchased;

        episodes.push({
          id: episodeId,
          seriesId: parentId,
          titre: String(data[i][2] || ""),
          contenu: isUnlocked ? String(data[i][3] || "") : "",
          image: formatDriveImageUrl_(data[i][4]),
          date: formatDate_(data[i][5]),
          likes: Number(data[i][6]) || 0,
          dislikes: Number(data[i][7]) || 0,
          shares: Number(data[i][8]) || 0,
          statut: status,
          numero: episodeNumber,
          gratuit: isFree,
          achete: isPurchased,
          verrouille: !isUnlocked,
          coutCredits: isFree || isPurchased ? 0 : EPISODE_CREDIT_COST
        });
      }

      response = { status: "success", data: episodes.reverse() };

    } else if (action === "getComments") {
      const episodeId = String(params.episodeId || "").trim();
      const sheet = ss.getSheetByName(SHEET_COMMENTS);
      const data = sheet.getDataRange().getValues();
      const comments = [];

      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        if (episodeId && String(data[i][1]).trim() !== episodeId) continue;

        comments.push({
          id: String(data[i][0]),
          episodeId: String(data[i][1]),
          username: String(data[i][2] || ""),
          message: String(data[i][3] || ""),
          date: formatDate_(data[i][4])
        });
      }

      response = {
        status: "success",
        data: comments.reverse()
      };

    } else if (action === "getStats") {
      const sheet = ss.getSheetByName(SHEET_STATS);
      const data = sheet.getDataRange().getValues();
      const stats = [];

      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;

        stats.push({
          date: formatDate_(data[i][0]),
          visitorId: String(data[i][1] || "Anonyme"),
          pays: String(data[i][2] || "Inconnu"),
          eventType: String(data[i][3] || "Vue"),
          targetTitle: String(data[i][4] || ""),
          targetId: String(data[i][5] || ""),
          device: String(data[i][6] || "Inconnu"),
          os: String(data[i][7] || ""),
          browser: String(data[i][8] || "")
        });
      }

      response = { status: "success", data: stats.reverse() };

    } else if (action === "checkUsername") {
      const username = normalizeUsername_(params.username);
      const users = ss.getSheetByName(SHEET_USER)
        .getDataRange().getValues();

      const exists = users.slice(1).some(row =>
        normalizeUsername_(row[2]) === username
      );

      response = {
        status: "success",
        available: !exists
      };

    } else if (action === "getBlogPosts") {
      const slug = String(params.slug || "").trim();
      const sheet = ss.getSheetByName(SHEET_BLOG);
      const data = sheet.getDataRange().getValues();
      const posts = [];

      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;

        const post = blogPostFromRow_(data[i]);
        if (!includeDrafts && post.statut !== "Publié") continue;
        if (slug && post.slug !== slug) continue;

        posts.push(post);
      }

      response = { status: "success", data: posts.reverse() };

    } else if (action === "getBlogPost") {
      const slug = String(params.slug || "").trim();

      if (!slug) {
        throw new Error("Le lien de l'article est obligatoire.");
      }

      const data = ss.getSheetByName(SHEET_BLOG).getDataRange().getValues();
      let post = null;

      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;

        const candidate = blogPostFromRow_(data[i]);
        if (candidate.slug !== slug) continue;
        if (!includeDrafts && candidate.statut !== "Publié") continue;

        post = candidate;
        break;
      }

      if (!post) {
        throw new Error("Article introuvable.");
      }

      response = { status: "success", data: post };
    }

  } catch (err) {
    response = {
      status: "error",
      message: String(err.message || err)
    };
  }

  return jsonResponse_(response);
}

/* =========================================
   POST API
========================================= */

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(20000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    checkAndCreateSheets(ss);

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Aucune donnée reçue.");
    }

    const postData = JSON.parse(e.postData.contents);
    const type = String(postData.type || "");
    const now = new Date();

    let response = {
      status: "error",
      message: "Action non reconnue."
    };

    /* TÉLÉVERSEMENT D'IMAGE SUR DRIVE */
    if (type === "uploadImage") {
      const base64Data = String(postData.image || postData.base64 || "");
      const prefix = String(postData.prefix || "Bentoul");

      if (!base64Data) {
        throw new Error("Aucune image fournie.");
      }

      const fileUrl = uploadBase64ToDrive(base64Data, prefix);
      if (!fileUrl) {
        throw new Error("Échec du téléversement vers Google Drive.");
      }

      response = {
        status: "success",
        imageUrl: fileUrl,
        url: fileUrl,
        message: "Image téléversée avec succès sur Google Drive."
      };

    /* INSCRIPTION UTILISATEUR */
    } else if (type === "userRegister") {
      response = registerUser_(ss, postData, now);

    /* CONNEXION UTILISATEUR */
    } else if (type === "userLogin") {
      response = loginUser_(ss, postData);

    /* INFORMATIONS D'UN UTILISATEUR */
    } else if (type === "getUser") {
      response = getUser_(ss, postData);

    /* ACHAT / DÉBLOCAGE D'UN ÉPISODE */
    } else if (type === "purchaseEpisode" || type === "buyEpisode") {
      response = purchaseEpisode_(ss, postData, now);

    /* STATISTIQUES */
    } else if (type === "analytics") {
      const sheet = ss.getSheetByName(SHEET_STATS);

      sheet.appendRow([
        now,
        String(postData.visitorId || "Anonyme"),
        String(postData.pays || "Inconnu"),
        String(postData.eventType || "Vue"),
        String(postData.targetTitle || ""),
        String(postData.targetId || ""),
        String(postData.device || "Inconnu"),
        String(postData.os || ""),
        String(postData.browser || "")
      ]);

      response = {
        status: "success",
        message: "Statistique enregistrée."
      };

    /* COMMENTAIRES */
    } else if (type === "comment") {
      const episodeId = String(postData.episodeId || "").trim();
      const username = String(postData.username || "").trim();
      const message = String(postData.message || postData.texte || postData.text || "").trim();

      if (!episodeId || !username || !message) {
        throw new Error("Épisode, username et commentaire obligatoires.");
      }

      if (message.length > 3000) {
        throw new Error("Le commentaire est trop long.");
      }

      const commentId = "COM_" + Utilities.getUuid();

      ss.getSheetByName(SHEET_COMMENTS).appendRow([
        commentId,
        episodeId,
        username,
        message,
        now
      ]);

      response = {
        status: "success",
        message: "Commentaire enregistré.",
        commentId: commentId
      };

    /* LIKES, DISLIKES ET PARTAGES */
    } else if (type === "interaction") {
      response = saveInteraction_(ss, postData);

    /* CRÉATION OU MODIFICATION D'UNE SÉRIE OU D'UN ÉPISODE */
    } else if (type === "serie" || type === "series" || type === "episode") {
      response = saveContent_(ss, postData, type, now);

    /* CRÉATION OU MODIFICATION D'UN ARTICLE DE BLOG */
    } else if (
      type === "saveBlogPost" ||
      type === "blog" ||
      type === "createBlogPost" ||
      type === "updateBlogPost"
    ) {
      response = saveBlogPost_(ss, postData, now);
    }

    return jsonResponse_(response);

  } catch (err) {
    return jsonResponse_({
      status: "error",
      message: String(err.message || err)
    });

  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {}
  }
}

/* =========================================
   INSCRIPTION
========================================= */

function registerUser_(ss, p, now) {
  const sheet = ss.getSheetByName(SHEET_USER);

  const nom = String(p.nom || "").trim();
  const username = String(p.username || "").trim();
  const email = String(p.email || "").trim().toLowerCase();
  const numero = String(p.numero || "").trim();
  const pin = String(p.pin || "").trim();
  const codeParrain = String(p.codeParrain || "").trim().toLowerCase();

  if (!nom || !username || !email || !numero || !pin) {
    throw new Error("Tous les champs sont obligatoires.");
  }

  if (nom.length > 100) {
    throw new Error("Le nom est trop long.");
  }

  if (!/^[A-Za-z0-9_.-]{3,30}$/.test(username)) {
    throw new Error(
      "Le username doit contenir 3 à 30 caractères : lettres, chiffres, point, tiret ou underscore."
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Adresse email invalide.");
  }

  if (!/^\d{6}$/.test(pin)) {
    throw new Error("Le PIN doit contenir exactement 6 chiffres.");
  }

  if (numero.length > 30) {
    throw new Error("Le numéro de téléphone est trop long.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(String);

  const col = {
    id: headers.indexOf("ID"),
    nom: headers.indexOf("Nom"),
    username: headers.indexOf("Username"),
    email: headers.indexOf("Email"),
    numero: headers.indexOf("Numero"),
    code: headers.indexOf("CodeReference")
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (
      normalizeUsername_(row[col.username]) === normalizeUsername_(username)
    ) {
      throw new Error("Ce username est déjà utilisé.");
    }

    if (
      String(row[col.email] || "").trim().toLowerCase() === email
    ) {
      throw new Error("Cette adresse email est déjà utilisée.");
    }

    if (
      String(row[col.numero] || "").trim() === numero
    ) {
      throw new Error("Ce numéro est déjà utilisé.");
    }
  }

  let parrainId = "";

  if (codeParrain) {
    const referrer = data.slice(1).find(row =>
      String(row[col.code] || "").toLowerCase() === codeParrain
    );

    if (!referrer) {
      throw new Error("Le code de référence est invalide.");
    }

    parrainId = String(referrer[col.id]);
  }

  const id = "USER_" + Utilities.getUuid();
  const codeReference = generateReferralCode_(sheet);
  const pinHash = hashUserPin_(pin, username);

  const credits = STARTING_CREDITS;
  const role = resolveUserRole_(username, "");

  const newRow = [
    id,
    nom,
    username,
    pinHash,
    email,
    numero,
    credits,
    codeReference,
    parrainId,
    now,
    role
  ];

  sheet.appendRow(newRow);

  return {
    status: "success",
    message: "Compte BENTOUL créé avec succès.",
    user: {
      id: id,
      nom: nom,
      username: username,
      email: email,
      numero: numero,
      credits: credits,
      codeReference: codeReference,
      dateCreation: formatDate_(now),
      role: role,
      isAdmin: role === "admin"
    }
  };
}

/* =========================================
   CONNEXION
========================================= */

function loginUser_(ss, p) {
  const identifier = String(p.username || "").trim();
  const pin = String(p.pin || "").trim();

  if (!identifier || !/^\d{6}$/.test(pin)) {
    throw new Error("Username et PIN à 6 chiffres obligatoires.");
  }

  const sheet = ss.getSheetByName(SHEET_USER);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(String);

  const usernameCol = headers.indexOf("Username");
  const pinCol = headers.indexOf("PINHash");

  let found = null;
  let foundRow = 0;

  for (let i = 1; i < data.length; i++) {
    if (
      normalizeUsername_(data[i][usernameCol]) ===
      normalizeUsername_(identifier)
    ) {
      found = data[i];
      foundRow = i + 1;
      break;
    }
  }

  if (!found) {
    throw new Error("Username ou PIN incorrect.");
  }

  const expectedHash = hashUserPin_(pin, found[usernameCol]);

  if (!constantTimeEquals_(String(found[pinCol] || ""), expectedHash)) {
    throw new Error("Username ou PIN incorrect.");
  }

  updateStoredRole_(sheet, foundRow, headers, found[usernameCol]);

  return {
    status: "success",
    message: "Connexion réussie.",
    user: publicUser_(found, headers)
  };
}

/* =========================================
   RETOURNER LES INFORMATIONS DU COMPTE
========================================= */

function getUser_(ss, p) {
  const id = String(p.id || "").trim();
  const username = String(p.username || "").trim();

  if (!id && !username) {
    throw new Error("Identifiant utilisateur manquant.");
  }

  const sheet = ss.getSheetByName(SHEET_USER);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(String);

  const idCol = headers.indexOf("ID");
  const usernameCol = headers.indexOf("Username");

  for (let i = 1; i < data.length; i++) {
    const matches = id
      ? String(data[i][idCol]) === id
      : normalizeUsername_(data[i][usernameCol]) ===
        normalizeUsername_(username);

    if (matches) {
      updateStoredRole_(sheet, i + 1, headers, data[i][usernameCol]);

      return {
        status: "success",
        user: publicUser_(data[i], headers)
      };
    }
  }

  throw new Error("Utilisateur introuvable.");
}

/* =========================================
   UTILISATEUR PUBLIC
========================================= */

function publicUser_(row, headers) {
  const value = name => {
    const i = headers.indexOf(name);
    return i >= 0 ? row[i] : "";
  };

  const username = String(value("Username") || "");
  const role = resolveUserRole_(username, value("Role"));

  return {
    id: String(value("ID") || ""),
    nom: String(value("Nom") || ""),
    username: username,
    email: String(value("Email") || ""),
    numero: String(value("Numero") || ""),
    credits: Number(value("Credits")) || 0,
    codeReference: String(value("CodeReference") || ""),
    parrain: String(value("Parrain") || ""),
    dateCreation: formatDate_(value("DateCreation")),
    role: role,
    isAdmin: role === "admin"
  };
}

function resolveUserRole_(username, storedRole) {
  const normalized = normalizeUsername_(username);

  if (ADMIN_USERNAMES.indexOf(normalized) !== -1) {
    return "admin";
  }

  const role = String(storedRole || "").trim().toLowerCase();
  return role === "admin" ? "admin" : "user";
}

function blogPostFromRow_(row) {
  return {
    id: String(row[0] || ""),
    slug: String(row[1] || ""),
    titre: String(row[2] || ""),
    description: String(row[3] || ""),
    categorie: String(row[4] || ""),
    image: formatDriveImageUrl_(row[5]),
    contenu: String(row[6] || ""),
    auteur: String(row[7] || ""),
    date: formatDate_(row[8]),
    dateModification: formatDate_(row[9]),
    statut: String(row[10] || "Publié"),
    lecture: String(row[11] || "")
  };
}

function updateStoredRole_(sheet, rowNumber, headers, username) {
  const roleCol = headers.indexOf("Role");
  if (roleCol < 0 || rowNumber < 2) return;

  const current = String(
    sheet.getRange(rowNumber, roleCol + 1).getDisplayValue() || ""
  ).trim().toLowerCase();
  const expected = resolveUserRole_(username, current);

  if (current !== expected) {
    sheet.getRange(rowNumber, roleCol + 1).setValue(expected);
  }
}

/* =========================================
   GÉNÉRATION DU CODE BENTOUL-29844
========================================= */

function generateReferralCode_(sheet) {
  const lastRow = sheet.getLastRow();
  const codes = lastRow > 1
    ? sheet.getRange(2, 8, lastRow - 1, 1)
        .getDisplayValues()
        .flat()
        .map(value => String(value).toLowerCase())
    : [];

  let code;

  do {
    const number = Math.floor(10000 + Math.random() * 90000);
    code = "bentoul-" + number;
  } while (codes.includes(code));

  return code;
}

/* =========================================
   HASH DU PIN
========================================= */

function hashUserPin_(pin, username) {
  const raw =
    normalizeUsername_(username) + "|" + String(pin);

  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw,
    Utilities.Charset.UTF_8
  );

  return Utilities.base64Encode(digest);
}

function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function normalizeUsername_(value) {
  return String(value || "").trim().toLowerCase();
}

/* =========================================
   INTERACTIONS
========================================= */

function saveInteraction_(ss, p) {
  const targetType = String(p.contentType || p.targetType || "");
  const targetId = String(p.contentId || p.targetId || "");
  const action = String(p.action || "");

  if (!["series", "serie", "episode"].includes(targetType)) {
    throw new Error("Type de contenu invalide.");
  }

  const isSerie = targetType === "series" || targetType === "serie";
  const sheet = ss.getSheetByName(isSerie ? SHEET_SERIES : SHEET_EPISODES);

  const data = sheet.getDataRange().getValues();
  let rowNumber = 0;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === targetId) {
      rowNumber = i + 1;
      break;
    }
  }

  if (!rowNumber) {
    throw new Error("Contenu introuvable.");
  }

  const columns = isSerie
    ? { like: 6, dislike: 7, share: 8 }
    : { like: 7, dislike: 8, share: 9 };

  let colToUpdate = 0;
  if (action === "like") colToUpdate = columns.like;
  else if (action === "dislike") colToUpdate = columns.dislike;
  else if (action === "share") colToUpdate = columns.share;

  if (colToUpdate > 0) {
    const cell = sheet.getRange(rowNumber, colToUpdate);
    const current = Number(cell.getValue()) || 0;
    cell.setValue(Math.max(0, current + 1));
  }

  return {
    status: "success",
    message: "Interaction enregistrée."
  };
}

/* =========================================
   CRÉATION OU MODIFICATION SÉRIE OU ÉPISODE
========================================= */

function saveContent_(ss, p, type, now) {
  const isSerie = type === "serie" || type === "series";
  const sheet = ss.getSheetByName(
    isSerie ? SHEET_SERIES : SHEET_EPISODES
  );

  const id = String(p.id || "").trim();
  const titre = String(p.titre || "").trim();
  const statut = String(p.statut || "Publié");

  if (!titre) throw new Error("Le titre est obligatoire.");

  if (!["Publié", "Brouillon"].includes(statut)) {
    throw new Error("Statut invalide.");
  }

  if (!isSerie && !String(p.seriesId || "").trim()) {
    throw new Error("L'identifiant de la série est obligatoire.");
  }

  let image = String(p.image || "").trim();
  let contenu = String(p.contenu || "");

  // 1. Détecter et téléverser toutes les images Base64 présentes dans le contenu HTML
  const base64Regex = /data:image\/[a-zA-Z0-9.+_-]+;base64,[a-zA-Z0-9+/=]+/gi;
  const matches = contenu.match(base64Regex);

  if (matches && matches.length > 0) {
    const uniqueMatches = Array.from(new Set(matches));
    uniqueMatches.forEach(b64 => {
      const uploadedUrl = uploadBase64ToDrive(b64, isSerie ? "Serie" : "Episode");
      if (uploadedUrl) {
        contenu = contenu.split(b64).join(uploadedUrl);
        if (!image) image = uploadedUrl;
      }
    });
  }

  // 2. Si l'image principale est elle-même en Base64
  if (image.indexOf("data:image") === 0) {
    const uploaded = uploadBase64ToDrive(image, isSerie ? "Serie" : "Episode");
    if (uploaded) {
      image = uploaded;
    }
  } else if (image) {
    image = formatDriveImageUrl_(image);
  }

  // 3. Si l'image principale est vide, extraire la première image du contenu HTML
  if (!image) {
    const imgTagMatch = contenu.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgTagMatch && imgTagMatch[1]) {
      image = formatDriveImageUrl_(imgTagMatch[1]);
    }
  }

  const data = sheet.getDataRange().getValues();
  let rowNumber = 0;

  // Recherche de l'ID existant pour mise à jour
  if (id) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === id) {
        rowNumber = i + 1;
        break;
      }
    }
  }

  let finalId = id;

  if (!rowNumber) {
    // NOUVELLE CRÉATION
    finalId = (isSerie ? "SERIE_" : "EP_") + Utilities.getUuid();

    if (isSerie) {
      sheet.appendRow([
        finalId, titre, contenu, image, now, 0, 0, 0, statut
      ]);
    } else {
      sheet.appendRow([
        finalId, String(p.seriesId), titre, contenu,
        image, now, 0, 0, 0, statut
      ]);
    }

  } else if (isSerie) {
    // MISE À JOUR DE LA SÉRIE EXISTANTE
    sheet.getRange(rowNumber, 2).setValue(titre);
    sheet.getRange(rowNumber, 3).setValue(contenu);
    if (image) sheet.getRange(rowNumber, 4).setValue(image);
    sheet.getRange(rowNumber, 5).setValue(now);
    sheet.getRange(rowNumber, 9).setValue(statut);

  } else {
    // MISE À JOUR DE L'ÉPISODE EXISTANT
    sheet.getRange(rowNumber, 2).setValue(String(p.seriesId));
    sheet.getRange(rowNumber, 3).setValue(titre);
    sheet.getRange(rowNumber, 4).setValue(contenu);
    if (image) sheet.getRange(rowNumber, 5).setValue(image);
    sheet.getRange(rowNumber, 6).setValue(now);
    sheet.getRange(rowNumber, 10).setValue(statut);
  }

  return {
    status: "success",
    id: finalId,
    imageUrl: image,
    message: rowNumber ? "Modification enregistrée avec succès." : "Création réussie."
  };
}


/* =========================================
   BLOG : CRÉATION OU MODIFICATION D'UN ARTICLE
========================================= */

function slugifyBlog_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stripHtmlForBlog_(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateBlogText_(text, maxLength) {
  const clean = String(text || "").trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 1).replace(/\s+\S*$/, "") + "…";
}

function estimateBlogReading_(html) {
  const words = stripHtmlForBlog_(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200)) + " min";
}

function saveBlogPost_(ss, p, now) {
  const sheet = ss.getSheetByName(SHEET_BLOG);
  const id = String(p.id || "").trim();
  const titre = String(p.titre || p.title || "").trim();
  const description = String(p.description || "").trim();
  const categorie =
    String(p.categorie || p.category || "Astuce").trim() || "Astuce";
  const auteur =
    String(p.auteur || p.author || "BENTOUL CREATION").trim() ||
    "BENTOUL CREATION";
  const statut = String(p.statut || "Publié").trim() || "Publié";

  if (!titre) {
    throw new Error("Le titre de l'article est obligatoire.");
  }

  if (!["Publié", "Brouillon"].includes(statut)) {
    throw new Error("Statut invalide.");
  }

  let slug = slugifyBlog_(p.slug || titre);

  if (!slug) {
    slug = "article-" + Utilities.getUuid().slice(0, 8);
  }

  let contenu = String(p.contenu || p.content || "");
  let image = String(p.image || "").trim();

  // 1. Téléverser les images Base64 présentes dans le contenu HTML.
  const base64Regex = /data:image\/[a-zA-Z0-9.+_-]+;base64,[a-zA-Z0-9+/=]+/gi;
  const matches = contenu.match(base64Regex);

  if (matches && matches.length > 0) {
    Array.from(new Set(matches)).forEach(b64 => {
      const uploadedUrl = uploadBase64ToDrive(b64, "Blog");
      if (uploadedUrl) {
        contenu = contenu.split(b64).join(uploadedUrl);
        if (!image) image = uploadedUrl;
      }
    });
  }

  // 2. Image de couverture Base64 ou lien Drive.
  if (image.indexOf("data:image") === 0) {
    const uploaded = uploadBase64ToDrive(image, "Blog");
    if (uploaded) image = uploaded;
  } else if (image) {
    image = formatDriveImageUrl_(image);
  }

  // 3. À défaut, reprendre la première image du contenu.
  if (!image) {
    const imgTagMatch = contenu.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgTagMatch && imgTagMatch[1]) {
      image = formatDriveImageUrl_(imgTagMatch[1]);
    }
  }

  const descriptionFinale =
    description || truncateBlogText_(stripHtmlForBlog_(contenu), 160);
  const lecture =
    String(p.lecture || "").trim() || estimateBlogReading_(contenu);

  const data = sheet.getDataRange().getValues();
  let rowNumber = 0;

  if (id) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === id) {
        rowNumber = i + 1;
        break;
      }
    }
  }

  const slugTaken = candidate => {
    for (let i = 1; i < data.length; i++) {
      if (i + 1 === rowNumber) continue;
      if (String(data[i][1] || "").trim().toLowerCase() === candidate) {
        return true;
      }
    }
    return false;
  };

  if (slugTaken(slug)) {
    const base = slug;
    let suffix = 2;
    while (slugTaken(base + "-" + suffix)) suffix++;
    slug = base + "-" + suffix;
  }

  if (!rowNumber) {
    const finalId = "BLOG_" + Utilities.getUuid();

    sheet.appendRow([
      finalId,
      slug,
      titre,
      descriptionFinale,
      categorie,
      image,
      contenu,
      auteur,
      now,
      now,
      statut,
      lecture
    ]);

    return {
      status: "success",
      id: finalId,
      slug: slug,
      imageUrl: image,
      message: statut === "Publié"
        ? "Article publié dans le blog."
        : "Brouillon enregistré."
    };
  }

  const finalId = String(data[rowNumber - 1][0] || id);
  const dateCreation = data[rowNumber - 1][8] || now;

  sheet.getRange(rowNumber, 2, 1, 11).setValues([[
    slug,
    titre,
    descriptionFinale,
    categorie,
    image,
    contenu,
    auteur,
    dateCreation,
    now,
    statut,
    lecture
  ]]);

  return {
    status: "success",
    id: finalId,
    slug: slug,
    imageUrl: image,
    message: statut === "Publié"
      ? "Article du blog mis à jour."
      : "Brouillon mis à jour."
  };
}

/* =========================================
   ARTICLES DU BLOG : IMPORT DES ARTICLES DU SITE
========================================= */

function defaultBlogPosts_() {
  return [
    {
      slug: "google-drive-organiser",
      titre: "Google Drive : organiser, sauvegarder et partager tes fichiers",
      description:
        "Dossiers, noms clairs, droits de partage et sauvegarde : organise ton Google Drive une fois pour toutes et retrouve tes fichiers en quelques secondes.",
      categorie: "Cloud",
      image: "/images/blog-google-drive.jpg",
      auteur: "BENTOUL CREATION",
      date: "2026-11-18",
      lecture: "5 min",
      contenu: `
        <p>Google Drive est pratique, mais sans organisation il devient vite un fouillis. Une méthode simple te fait gagner du temps chaque jour.</p>
        <h2>1. Crée une arborescence claire</h2>
        <p>Quelques dossiers suffisent : <strong>Documents</strong>, <strong>Photos</strong>, <strong>Études</strong>, <strong>Administratif</strong>. Évite de créer un dossier pour chaque fichier.</p>
        <h2>2. Adopte des noms de fichiers réguliers</h2>
        <p>Utilise un format comme <em>2026-11-23 facture internet.pdf</em>. La date au début classe les fichiers automatiquement et facilite la recherche.</p>
        <h2>3. Maîtrise les partages</h2>
        <p>Par défaut, un fichier reste privé. Quand tu partages, choisis <strong>Lecteur</strong> pour consulter, <strong>Commentateur</strong> pour donner un avis, et <strong>Éditeur</strong> seulement aux personnes de confiance.</p>
        <h2>4. Garde l'essentiel hors ligne</h2>
        <p>Dans l'application Drive, rends disponibles hors ligne les documents dont tu as besoin sans réseau. Tu évites de télécharger tout le dossier.</p>
        <h2>5. Sécurise ton compte</h2>
        <p>Active la validation en deux étapes et vérifie régulièrement les appareils connectés. Un compte compromis expose tous tes fichiers.</p>
        <div class="blog-tip"><strong>Astuce :</strong> vide la corbeille de Drive de temps en temps. Les fichiers supprimés y restent 30 jours et continuent d'occuper ton espace.</div>
      `
    },
    {
      slug: "liberer-stockage-android",
      titre: "Libérer du stockage sur Android sans perdre tes fichiers",
      description:
        "Cache, photos, applications inutiles : la méthode simple pour récupérer de l'espace sur ton Android sans effacer ce qui compte.",
      categorie: "Stockage",
      image: "/images/blog-stockage-android.jpg",
      auteur: "BENTOUL CREATION",
      date: "2026-11-20",
      lecture: "5 min",
      contenu: `
        <p>Un message « stockage presque plein » ralentit le téléphone et bloque les mises à jour. Avant de supprimer au hasard, regarde ce qui occupe réellement l'espace.</p>
        <h2>1. Analyse le stockage</h2>
        <p>Ouvre <strong>Paramètres &gt; Stockage</strong>. Android classe les fichiers par catégorie : applications, photos, vidéos, audio et autres. Commence par la catégorie la plus lourde.</p>
        <h2>2. Vide le cache, pas les données</h2>
        <p>Le cache se recrée automatiquement. Dans <strong>Paramètres &gt; Applications</strong>, choisis une application lourde puis <strong>Stockage &gt; Vider le cache</strong>. Évite « Effacer les données », qui supprime tes comptes et tes réglages.</p>
        <h2>3. Trie tes photos et vidéos</h2>
        <p>Les vidéos en 4K prennent énormément de place. Sauvegarde-les sur Google Photos ou Drive, puis supprime les doublons et les captures d'écran inutiles. Pense à vider la corbeille de la galerie.</p>
        <h2>4. Désinstalle ce que tu n'utilises plus</h2>
        <p>Les jeux et applications oubliés peuvent peser plusieurs gigaoctets. Désinstalle-les, puis vide le dossier de téléchargements des fichiers APK et PDF déjà consultés.</p>
        <h2>5. Utilise le cloud pour les gros fichiers</h2>
        <p>Déplace les documents et les vidéos vers Google Drive. Tu peux les garder accessibles hors ligne seulement quand tu en as besoin, puis libérer l'espace local.</p>
        <div class="blog-tip"><strong>À retenir :</strong> supprimer le cache et les fichiers inutiles ne touche pas à tes photos. Fais quand même une sauvegarde avant toute suppression importante.</div>
      `
    },
    {
      slug: "securiser-android",
      titre: "5 réglages Android pour sécuriser ton téléphone",
      description:
        "Verrouillage, Play Protect, permissions, mises à jour : les 5 réglages Android à activer pour protéger ton téléphone des menaces courantes.",
      categorie: "Sécurité",
      image: "/images/blog-securite-android.jpg",
      auteur: "BENTOUL CREATION",
      date: "2026-11-23",
      lecture: "4 min",
      contenu: `
        <p>Ton téléphone contient tes messages, tes photos et parfois tes comptes bancaires. Quelques réglages simples suffisent pour le protéger sans compliquer ton quotidien.</p>
        <h2>1. Active un verrouillage solide</h2>
        <p>Utilise un code PIN à 6 chiffres, un schéma complexe ou l'empreinte digitale. Évite les codes faciles comme 0000 ou ta date de naissance.</p>
        <h2>2. Vérifie Google Play Protect</h2>
        <p>Play Protect analyse les applications avant et après leur installation. Ouvre le Play Store, touche ta photo de profil, puis <strong>Play Protect</strong> et lance une analyse.</p>
        <h2>3. Contrôle les permissions</h2>
        <p>Une application de lampe torche n'a pas besoin de lire tes contacts. Dans <strong>Paramètres &gt; Applications &gt; Autorisations</strong>, retire les accès inutiles, surtout à la localisation, aux SMS et au microphone.</p>
        <h2>4. Installe uniquement depuis le Play Store</h2>
        <p>Les fichiers APK téléchargés sur des sites inconnus sont la première source de logiciels malveillants. Désactive l'installation de sources inconnues si elle est activée.</p>
        <h2>5. Garde ton système à jour</h2>
        <p>Les mises à jour corrigent des failles de sécurité. Active les mises à jour automatiques et installe-les dès que possible, même si elles prennent quelques minutes.</p>
        <div class="blog-tip"><strong>Astuce :</strong> fais une sauvegarde régulière de tes photos et documents importants. En cas de perte ou de vol, tu pourras tout récupérer.</div>
      `
    }
  ];
}

/**
 * Insère les articles statiques du site dans la feuille Blog.
 * Idempotent : un article dont le slug existe déjà n'est jamais dupliqué.
 * L'ordre d'ajout est du plus ancien au plus récent, car getBlogPosts
 * renvoie les lignes dans l'ordre inverse.
 */
function seedDefaultBlogPosts_(ss, force) {
  const sheet = ss.getSheetByName(SHEET_BLOG);
  if (!sheet) return 0;

  const props = PropertiesService.getScriptProperties();
  const seedDone = props.getProperty(BLOG_SEED_KEY) === "1";

  if (!force && seedDone) return 0;

  const data = sheet.getDataRange().getValues();
  const existing = {};
  for (let i = 1; i < data.length; i++) {
    const slug = String(data[i][1] || "").trim().toLowerCase();
    if (slug) existing[slug] = true;
  }

  const now = new Date();
  let inserted = 0;

  defaultBlogPosts_().forEach(post => {
    const slug = slugifyBlog_(post.slug);
    if (!slug || existing[slug]) return;

    sheet.appendRow([
      "BLOG_" + Utilities.getUuid(),
      slug,
      post.titre,
      post.description,
      post.categorie,
      post.image,
      post.contenu,
      post.auteur,
      post.date,
      now,
      "Publié",
      post.lecture
    ]);

    existing[slug] = true;
    inserted++;
  });

  props.setProperty(BLOG_SEED_KEY, "1");

  if (inserted > 0) {
    console.log("Blog : " + inserted + " article(s) du site importé(s).");
  }

  return inserted;
}

/* =========================================
   CRÉDITS : ACHAT ET DÉBLOCAGE D'ÉPISODES
========================================= */

/**
 * Débloque un épisode en débitant 1 crédit au maximum une seule fois.
 * doPost utilise déjà ScriptLock : le contrôle du doublon et le débit sont atomiques
 * par rapport aux autres requêtes passant par cette API.
 */
function purchaseEpisode_(ss, p, now) {
  const userId = String(p.userId || p.id || "").trim();
  const episodeId = String(p.episodeId || p.idEpisode || "").trim();

  if (!userId || !episodeId) {
    throw new Error("Identifiant du compte et de l'épisode obligatoires.");
  }

  const userSheet = ss.getSheetByName(SHEET_USER);
  const userData = userSheet.getDataRange().getValues();
  if (!userData.length) throw new Error("Aucun compte utilisateur trouvé.");
  const userHeaders = userData[0].map(String);
  const idCol = userHeaders.indexOf("ID");
  const creditsCol = userHeaders.indexOf("Credits");
  if (idCol < 0 || creditsCol < 0) {
    throw new Error("Colonnes ID ou Credits manquantes dans la feuille USER.");
  }

  let userRowNumber = 0;
  let userRow = null;
  for (let i = 1; i < userData.length; i++) {
    if (String(userData[i][idCol] || "") === userId) {
      userRowNumber = i + 1;
      userRow = userData[i];
      break;
    }
  }
  if (!userRow) throw new Error("Compte utilisateur introuvable. Reconnecte-toi.");

  const episodeSheet = ss.getSheetByName(SHEET_EPISODES);
  const episodeData = episodeSheet.getDataRange().getValues();
  let episodeRowNumber = 0;
  let episodeRow = null;
  for (let i = 1; i < episodeData.length; i++) {
    if (String(episodeData[i][0] || "") === episodeId) {
      episodeRowNumber = i + 1;
      episodeRow = episodeData[i];
      break;
    }
  }
  if (!episodeRow) throw new Error("Épisode introuvable.");
  if (String(episodeRow[9] || "Publié") !== "Publié") {
    throw new Error("Cet épisode n'est pas disponible actuellement.");
  }

  const seriesId = String(episodeRow[1] || "").trim();
  let episodeNumber = 0;
  for (let i = 1; i < episodeData.length; i++) {
    if (String(episodeData[i][1] || "").trim() !== seriesId) continue;
    if (String(episodeData[i][9] || "Publié") !== "Publié") continue;
    episodeNumber++;
    if (String(episodeData[i][0] || "") === episodeId) break;
  }

  if (episodeNumber > 0 && episodeNumber <= EPISODES_FREE_COUNT) {
    return {
      status: "success",
      alreadyUnlocked: true,
      free: true,
      message: "Cet épisode est gratuit.",
      credits: Number(userRow[creditsCol]) || 0,
      episodeId: episodeId
    };
  }

  const purchasedSheet = ss.getSheetByName(SHEET_PURCHASED_EPISODES);
  const purchaseData = purchasedSheet.getDataRange().getValues();
  for (let i = 1; i < purchaseData.length; i++) {
    if (String(purchaseData[i][1] || "") === userId &&
        String(purchaseData[i][3] || "") === episodeId) {
      return {
        status: "success",
        alreadyUnlocked: true,
        message: "Cet épisode est déjà débloqué sur ton compte.",
        credits: Number(userRow[creditsCol]) || 0,
        episodeId: episodeId
      };
    }
  }

  const currentCredits = Number(userRow[creditsCol]) || 0;
  if (currentCredits < EPISODE_CREDIT_COST) {
    return {
      status: "error",
      code: "INSUFFICIENT_CREDITS",
      message: "Solde insuffisant. Obtiens des crédits pour débloquer cet épisode.",
      credits: currentCredits,
      requiredCredits: EPISODE_CREDIT_COST,
      episodeId: episodeId
    };
  }

  // Débit serveur + journal d'achat. Le verrou global est pris dans doPost.
  const newCredits = currentCredits - EPISODE_CREDIT_COST;
  userSheet.getRange(userRowNumber, creditsCol + 1).setValue(newCredits);
  purchasedSheet.appendRow([
    "BUY_" + Utilities.getUuid(),
    userId,
    seriesId,
    episodeId,
    EPISODE_CREDIT_COST,
    now
  ]);

  return {
    status: "success",
    alreadyUnlocked: false,
    message: "Épisode débloqué avec succès.",
    credits: newCredits,
    episodeId: episodeId,
    seriesId: seriesId,
    cost: EPISODE_CREDIT_COST
  };
}

/** Renvoie les ID des épisodes déjà achetés par un compte. */
function getPurchasedEpisodeIds_(ss, userId) {
  const ids = new Set();
  if (!userId) return ids;

  const sheet = ss.getSheetByName(SHEET_PURCHASED_EPISODES);
  if (!sheet || sheet.getLastRow() < 2) return ids;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1] || "") === userId && data[i][3]) {
      ids.add(String(data[i][3]));
    }
  }
  return ids;
}

/* =========================================
   GOOGLE DRIVE
========================================= */

function uploadBase64ToDrive(base64Data, prefix) {
  try {
    const parts = base64Data.split(",");
    if (parts.length < 2) return "";

    const contentType = parts[0]
      .split(";")[0]
      .replace("data:", "");

    if (!/^image\/(jpeg|png|webp|gif|svg\+xml)$/i.test(contentType)) {
      throw new Error("Format d'image non autorisé.");
    }

    const decoded = Utilities.base64Decode(parts[1]);
    let extension = contentType.split("/")[1] || "jpg";
    extension = extension.replace("jpeg", "jpg").replace("svg+xml", "svg");
    const fileName = prefix + "_" + Utilities.getUuid() + "." + extension;

    const blob = Utilities.newBlob(decoded, contentType, fileName);
    const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    const folder = folders.hasNext()
      ? folders.next()
      : DriveApp.createFolder(DRIVE_FOLDER_NAME);

    const file = folder.createFile(blob);

    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

    return "https://lh3.googleusercontent.com/d/" + file.getId();

  } catch (err) {
    console.error("Erreur Drive : " + err);
    return "";
  }
}

/* =========================================
   CRÉATION DES FEUILLES
========================================= */

function checkAndCreateSheets(ss) {
  createSheetIfMissing_(
    ss, SHEET_SERIES,
    ["ID", "Titre Série", "Description/HTML", "Image",
     "Date", "Likes", "Dislikes", "Shares", "Statut"]
  );

  createSheetIfMissing_(
    ss, SHEET_EPISODES,
    ["ID", "SeriesID", "Titre Episode", "ContenuHTML", "Image",
     "Date", "Likes", "Dislikes", "Shares", "Statut"]
  );

  createSheetIfMissing_(
    ss, SHEET_COMMENTS,
    ["ID", "EpisodeID", "Username", "Message", "Date"]
  );

  createSheetIfMissing_(
    ss, SHEET_STATS,
    ["Date", "Visiteur_ID", "Pays", "Type_Evenement",
     "Titre_Consulte", "ID_Consulte", "Device", "OS", "Navigateur"]
  );

  createSheetIfMissing_(
    ss, SHEET_PURCHASED_EPISODES,
    ["ID_Achat", "UserID", "SeriesID", "EpisodeID", "CoutCredits", "DateAchat"]
  );

  createSheetIfMissing_(ss, SHEET_BLOG, BLOG_HEADERS);

  try {
    seedDefaultBlogPosts_(ss, false);
  } catch (err) {
    console.error("Import des articles du blog : " + err);
  }

  let userSheet = ss.getSheetByName(SHEET_USER);

  if (!userSheet) {
    userSheet = ss.insertSheet(SHEET_USER);
    userSheet.getRange(1, 1, 1, USER_HEADERS.length)
      .setValues([USER_HEADERS]);
    userSheet.setFrozenRows(1);
    userSheet.getRange("A:K").setNumberFormat("@");
    userSheet.getRange("G:G").setNumberFormat("0");
    userSheet.getRange("J:J").setNumberFormat("@");
  } else {
    const lastCol = Math.max(userSheet.getLastColumn(), 1);
    const headers = userSheet.getRange(1, 1, 1, lastCol)
      .getDisplayValues()[0].map(String);

    USER_HEADERS.forEach(header => {
      if (!headers.includes(header)) {
        userSheet.getRange(1, userSheet.getLastColumn() + 1)
          .setValue(header);
        headers.push(header);
      }
    });

    userSheet.setFrozenRows(1);
  }

  migrateUserRoles_(userSheet);
}

function migrateUserRoles_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol)
    .getDisplayValues()[0].map(String);
  const roleCol = headers.indexOf("Role") + 1;
  const usernameCol = headers.indexOf("Username") + 1;

  if (roleCol < 1 || usernameCol < 1) return;

  const usernames = sheet
    .getRange(2, usernameCol, lastRow - 1, 1)
    .getDisplayValues();
  const currentRoles = sheet
    .getRange(2, roleCol, lastRow - 1, 1)
    .getDisplayValues();

  let changed = false;

  const nextRoles = currentRoles.map((row, index) => {
    const current = String(row[0] || "").trim().toLowerCase();
    const expected = resolveUserRole_(usernames[index][0], current);
    if (current !== expected) changed = true;
    return [expected];
  });

  if (changed) {
    sheet.getRange(2, roleCol, lastRow - 1, 1).setValues(nextRoles);
  }
}

function createSheetIfMissing_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

/* =========================================
   UTILITAIRES
========================================= */

function formatDate_(value) {
  if (!value) return "";

  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone() || "GMT",
      "dd/MM/yyyy HH:mm:ss"
    );
  }

  return String(value);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function initialiserBentoul() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  checkAndCreateSheets(ss);
  Logger.log("Base BENTOUL initialisée : " + ss.getUrl());
}

function importerArticlesDuSite() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  checkAndCreateSheets(ss);
  const inserted = seedDefaultBlogPosts_(ss, true);
  Logger.log(
    inserted + " article(s) importé(s) dans la feuille Blog : " + ss.getUrl()
  );
}