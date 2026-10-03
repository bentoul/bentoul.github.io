
// Configuration du classeur et des noms des feuilles
const DATABASE_SPREADSHEET_ID = "1rEgFtRKceu4pOQWm5FliQ-NK-QdlNgIgvHtlpJlavA4";
const SHEET_NAME = "Utilisateurs";
const PRODUCTS_SHEET_NAME = "produits";
const PURCHASES_SHEET_NAME = "Achats";
const BENAMOURA_SHEET_NAME = "benamoura";
const BENTOULINGUO_SHEET_NAME = "bentoulinguo";
const LESSONS_SHEET_NAME = "Lecons";

function getDatabaseSpreadsheet() {
  return SpreadsheetApp.openById(DATABASE_SPREADSHEET_ID);
}

// Initialisation et récupération de la feuille Utilisateurs
function getSheet() {
  const ss = getDatabaseSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["ID", "Nom", "Email", "MotDePasse", "Credits", "DateCreation", "Avatar", "Role"]);
    sheet.getRange(1, 1, 1, 8).setFontWeight("bold");
  } else {
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (headers.indexOf("Avatar") === -1) {
      sheet.getRange(1, headers.length + 1).setValue("Avatar").setFontWeight("bold");
    }
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (currentHeaders.indexOf("Role") === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue("Role").setFontWeight("bold");
    }
  }
  return sheet;
}

// Initialisation et récupération de la feuille Achats
function getPurchasesSheet() {
  const ss = getDatabaseSpreadsheet();
  let sheet = ss.getSheetByName(PURCHASES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PURCHASES_SHEET_NAME);
    sheet.appendRow(["ID", "Email", "ID_Produit", "NomProduit", "PrixPaye", "Date", "Statut"]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
  }
  return sheet;
}

// Initialisation et récupération de la feuille Produits / Benamoura
function getProductsSheet(sheetName) {
  const ss = getDatabaseSpreadsheet();
  const targetName = sheetName || (ss.getSheetByName(BENAMOURA_SHEET_NAME) ? BENAMOURA_SHEET_NAME : PRODUCTS_SHEET_NAME);
  let sheet = ss.getSheetByName(targetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(targetName);
    if (targetName === BENAMOURA_SHEET_NAME) {
      sheet.appendRow(["ID", "Titre", "Description", "ImageUrl", "Categorie", "DateAjout", "UrlRedirection", "SeriesTitle", "EpisodeNumber"]);
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold");
    } else if (targetName.toLowerCase() === BENTOULINGUO_SHEET_NAME.toLowerCase()) {
      sheet.appendRow(["ID", "Titre", "Categorie", "Description", "DateAjout", "ImageUrl", "Langue", "UrlRedirection", "UrlAudio", "UrlVideo"]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold");
    } else {
      sheet.appendRow(["ID", "Titre", "Categorie", "Prix", "Icon", "Couleur", "Description", "DownloadUrl", "DateAjout", "ImageUrl", "Likes"]);
      sheet.getRange(1, 1, 1, 11).setFontWeight("bold");
    }
  }
  if (targetName.toLowerCase() === PRODUCTS_SHEET_NAME.toLowerCase()) {
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (headers.indexOf("Likes") === -1) sheet.getRange(1, headers.length + 1).setValue("Likes").setFontWeight("bold");
  } else if (targetName.toLowerCase() === BENAMOURA_SHEET_NAME.toLowerCase()) {
    let headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    ["ID", "Titre", "Description", "ImageUrl", "Categorie", "DateAjout", "UrlRedirection", "SeriesTitle", "EpisodeNumber"].forEach(header => {
      if (findHeaderIndex(headers, header) === -1) {
        sheet.getRange(1, headers.length + 1).setValue(header).setFontWeight("bold");
        headers.push(header);
      }
    });
  }
  return sheet;
}

function normalizeHeader(header) {
  return String(header || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findHeaderIndex(headers, name) {
  const target = normalizeHeader(name);
  return headers.findIndex(header => normalizeHeader(header) === target);
}

function setValueByHeader(sheet, rowIndex, headers, name, value) {
  const columnIndex = findHeaderIndex(headers, name);
  if (columnIndex === -1) {
    throw new Error("Colonne manquante dans la feuille : " + name);
  }
  sheet.getRange(rowIndex, columnIndex + 1).setValue(value);
}

// Récupérer la liste des produits ou articles
function getProductsList(sheetName) {
  const sheet = getProductsSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0].map(h => h.toString().trim());
  const products = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue;

    const item = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      }

      item[headers[j]] = val;
    }
    products.push(item);
  }

  return products;
}

function getPublicProductsList(sheetName) {
  const products = getProductsList(sheetName);
  if ((sheetName || "").toString().trim().toLowerCase() !== PRODUCTS_SHEET_NAME.toLowerCase()) {
    return products;
  }

  return products.map(product => {
    const publicProduct = Object.assign({}, product);
    Object.keys(publicProduct).forEach(key => {
      if (["downloadurl", "urlredirection", "urlfichier", "fileurl"].includes(normalizeHeader(key))) {
        delete publicProduct[key];
      }
    });
    return publicProduct;
  });
}

function hasValidSeriesEpisode(data) {
  const seriesTitle = String(data.seriesTitle || data.SeriesTitle || "").trim();
  const episodeNumber = String(data.episodeNumber || data.EpisodeNumber || "").trim();
  if (!seriesTitle && !episodeNumber) return true;
  return Boolean(seriesTitle) && Number.isInteger(Number(episodeNumber)) && Number(episodeNumber) >= 1;
}

function getLessonsSheet() {
  const ss = getDatabaseSpreadsheet();
  let sheet = ss.getSheetByName(LESSONS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LESSONS_SHEET_NAME);
    sheet.appendRow(["ID", "CourseID", "CourseTitle", "Titre", "ImageUrl", "VideoUrl", "DateAjout"]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
  }
  return sheet;
}

function setupDatabase() {
  getSheet();
  getPurchasesSheet();
  getProductsSheet(PRODUCTS_SHEET_NAME);
  getProductsSheet(BENAMOURA_SHEET_NAME);
  getProductsSheet(BENTOULINGUO_SHEET_NAME);
  getLessonsSheet();
  return "Les feuilles Utilisateurs, produits, Achats, benamoura, bentoulinguo et Lecons sont prêtes.";
}

function getLessonsList(courseId) {
  const rows = getLessonsSheet().getDataRange().getValues();
  const targetId = (courseId || "").toString().trim();
  return rows.slice(1).filter(row => !targetId || row[1].toString().trim() === targetId).map(row => ({
    id: row[0],
    courseId: row[1],
    courseTitle: row[2],
    title: row[3],
    imageUrl: row[4],
    videoUrl: row[5],
    date: row[6] instanceof Date ? Utilities.formatDate(row[6], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : row[6]
  }));
}

function getCourseLessonsResponse(courseId, email) {
  const targetId = (courseId || "").toString().trim();
  const course = getProductsList(PRODUCTS_SHEET_NAME).find(item => (item.ID || item.id || "").toString() === targetId);
  if (course && (Number(course.Prix || course.prix) || 0) > 0) {
    const targetEmail = (email || "").toString().trim().toLowerCase();
    const purchases = getPurchasesSheet().getDataRange().getValues();
    const hasPurchased = purchases.slice(1).some(row => row[1] && row[1].toString().trim().toLowerCase() === targetEmail && row[2].toString() === targetId);
    if (!hasPurchased) return { success: false, message: "Débloquez ce cours pour accéder à ses leçons." };
  }
  return { success: true, lessons: getLessonsList(targetId) };
}

function getUserColumnIndex(headers, name, fallback) {
  const target = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const index = headers.findIndex(header => header.toString().toLowerCase().replace(/[^a-z0-9]/g, "") === target);
  return index === -1 ? fallback : index;
}

function hasDashboardAdminRole(row, roleIndex) {
  const role = (row[roleIndex] || row[7] || "").toString().trim().toLowerCase();
  return role === "admin";
}

function isDashboardAdmin(email) {
  const targetEmail = (email || "").toString().trim().toLowerCase();
  if (!targetEmail) return false;
  const rows = getSheet().getDataRange().getValues();
  const emailIndex = getUserColumnIndex(rows[0], "email", 2);
  const roleIndex = getUserColumnIndex(rows[0], "role", 7);
  return rows.slice(1).some(row => row[emailIndex] && row[emailIndex].toString().trim().toLowerCase() === targetEmail &&
    hasDashboardAdminRole(row, roleIndex));
}

function createDashboardSession(email) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put("dashboard:" + token, email, 21600);
  return { success: true, token: token };
}

function authenticateDashboard(email, password) {
  const targetEmail = (email || "").toString().trim().toLowerCase();
  const rows = getSheet().getDataRange().getValues();
  const emailIndex = getUserColumnIndex(rows[0], "email", 2);
  const passwordIndex = getUserColumnIndex(rows[0], "motdepasse", 3);
  const roleIndex = getUserColumnIndex(rows[0], "role", 7);
  const user = rows.slice(1).find(row => row[emailIndex] && row[emailIndex].toString().trim().toLowerCase() === targetEmail);
  if (!user || (user[passwordIndex] || "").toString() !== (password || "").toString() || !hasDashboardAdminRole(user, roleIndex)) {
    return { success: false, message: "Identifiants administrateur incorrects." };
  }
  return createDashboardSession(targetEmail);
}

function authenticateDashboardSession(email, userToken) {
  const targetEmail = (email || "").toString().trim().toLowerCase();
  if (!hasValidUserSession(targetEmail, userToken) || !isDashboardAdmin(targetEmail)) {
    return { success: false, message: "Connectez-vous avec un compte administrateur pour ouvrir cet éditeur." };
  }
  return createDashboardSession(targetEmail);
}

function createUserSession(email) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put("user:" + token, (email || "").toString().trim().toLowerCase(), 21600);
  return token;
}

function hasValidUserSession(email, token) {
  const targetEmail = (email || "").toString().trim().toLowerCase();
  return Boolean(targetEmail && token && CacheService.getScriptCache().get("user:" + token) === targetEmail);
}

function saveDashboardImage(data) {
  const mimeType = (data.mimeType || "").toString();
  const base64 = (data.base64 || "").toString().replace(/^data:[^,]+,/, "");
  if (!mimeType.startsWith("image/") || !base64) throw new Error("Fichier image invalide.");
  if (base64.length > 4200000) throw new Error("L’image doit faire moins de 3 Mo.");
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, (data.fileName || "cours-image").toString());
  const file = DriveApp.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/uc?export=view&id=" + file.getId();
}

// Récupérer l'historique d'un utilisateur
function getPurchasesList(email) {
  const sheet = getPurchasesSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const targetEmail = (email || "").trim().toLowerCase();
  const list = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[1] && row[1].toString().toLowerCase() === targetEmail) {
      let dateVal = row[5];
      if (dateVal instanceof Date) {
        dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
      }
      list.push({
        id: row[0],
        email: row[1],
        idProduit: row[2],
        nomProduit: row[3],
        prixPaye: row[4],
        date: dateVal,
        statut: row[6] || "Complété"
      });
    }
  }

  return list.reverse();
}

// Handler GET
function doGet(e) {
  const action = ((e && e.parameter && e.parameter.action) || "").toString().trim();

  if (action === "getProducts") {
    const ss = getDatabaseSpreadsheet();
    const defaultSheet = ss.getSheetByName(BENAMOURA_SHEET_NAME) ? BENAMOURA_SHEET_NAME : PRODUCTS_SHEET_NAME;
    const targetSheet = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : defaultSheet;
    return responseJSON({ success: true, products: getPublicProductsList(targetSheet) });
  }

  if (action === "getPurchases") {
    if (!hasValidUserSession(e.parameter.email, e.parameter.token)) {
      return responseJSON({ success: false, message: "Connectez-vous pour consulter vos achats." });
    }
    const email = e.parameter.email;
    return responseJSON({ success: true, purchases: getPurchasesList(email) });
  }

  if (action === "getLessons") {
    if (!hasValidUserSession(e.parameter.email, e.parameter.token)) {
      return responseJSON({ success: false, message: "Connectez-vous pour accéder aux leçons." });
    }
    return responseJSON(getCourseLessonsResponse(e.parameter.courseId, e.parameter.email));
  }

  return responseJSON({ success: true, message: "API Benamoura / Bentoulapps opérationnelle." });
}

// Handler POST
function doPost(e) {
  try {
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = {};
      }
    }

    // Récupération souple de l'action (depuis le JSON ou depuis l'URL)
    const action = (data.action || (e && e.parameter && e.parameter.action) || "").toString().trim();

    if (action === "getProducts") {
      const ss = getDatabaseSpreadsheet();
      const defaultSheet = ss.getSheetByName(BENAMOURA_SHEET_NAME) ? BENAMOURA_SHEET_NAME : PRODUCTS_SHEET_NAME;
      const targetSheet = data.sheet || (e && e.parameter && e.parameter.sheet) || defaultSheet;
      return responseJSON({ success: true, products: getPublicProductsList(targetSheet) });
    }

    if (action === "getPurchases") {
      if (!hasValidUserSession(data.email, data.token)) {
        return responseJSON({ success: false, message: "Connectez-vous pour consulter vos achats." });
      }
      return responseJSON({ success: true, purchases: getPurchasesList(data.email) });
    }

    if (action === "getPurchasedProductFile") {
      const email = (data.email || "").toString().trim().toLowerCase();
      const productId = (data.productId || "").toString().trim();
      if (!hasValidUserSession(email, data.token)) {
        return responseJSON({ success: false, message: "Connectez-vous pour accéder à vos documents." });
      }
      if (!productId) {
        return responseJSON({ success: false, message: "L’identifiant du produit est invalide." });
      }

      const purchaseRows = getPurchasesSheet().getDataRange().getValues();
      const hasPurchased = purchaseRows.slice(1).some(row =>
        row[1] && row[1].toString().trim().toLowerCase() === email &&
        row[2] && row[2].toString().trim() === productId &&
        (row[6] || "Complété").toString().trim().toLowerCase() === "complété"
      );
      if (!hasPurchased) {
        return responseJSON({ success: false, message: "Ce document n’a pas été acheté avec ce compte." });
      }

      const product = getProductsList(PRODUCTS_SHEET_NAME).find(item =>
        (item.id || item.ID || "").toString().trim() === productId
      );
      if (!product) {
        return responseJSON({ success: false, message: "Document introuvable dans la boutique." });
      }

      const fileUrl = (product.UrlRedirection || product.DownloadUrl || product.url_fichier || "").toString().trim();
      if (!/^https?:\/\//i.test(fileUrl)) {
        return responseJSON({ success: false, message: "Aucun lien de document valide n’est configuré." });
      }
      return responseJSON({ success: true, fileUrl: fileUrl });
    }

    if (action === "getLessons") {
      if (!hasValidUserSession(data.email, data.token)) {
        return responseJSON({ success: false, message: "Connectez-vous pour accéder aux leçons." });
      }
      return responseJSON(getCourseLessonsResponse(data.courseId, data.email));
    }

    if (action === "likeProduct") {
      const email = (data.email || "").toString().trim().toLowerCase();
      if (!hasValidUserSession(email, data.token)) {
        return responseJSON({ success: false, message: "Connectez-vous pour aimer ce produit." });
      }

      const productId = (data.productId || "").toString().trim();
      const productSheet = getProductsSheet(PRODUCTS_SHEET_NAME);
      const productRows = productSheet.getDataRange().getValues();
      const headers = productRows[0].map(header => header.toString().trim());
      const likesColumn = headers.indexOf("Likes") + 1;
      const productRow = productRows.findIndex((row, index) => index > 0 && row[0].toString().trim() === productId);
      if (productRow === -1 || likesColumn < 1) return responseJSON({ success: false, message: "Produit introuvable." });

      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      let likes;
      try {
        likes = (Number(productSheet.getRange(productRow + 1, likesColumn).getValue()) || 0) + 1;
        productSheet.getRange(productRow + 1, likesColumn).setValue(likes);
      } finally {
        lock.releaseLock();
      }
      return responseJSON({ success: true, likes: likes });
    }

    if (action === "dashboardAuth") {
      return responseJSON(authenticateDashboard(data.email, data.password));
    }

    if (action === "dashboardAuthSession") {
      return responseJSON(authenticateDashboardSession(data.email, data.userToken));
    }

    if (action === "uploadContentImage" || (action === "dashboardUploadImage" && data.sheet)) {
      const targetName = (data.sheet || "").toString().trim().toLowerCase();
      const allowedSheets = [PRODUCTS_SHEET_NAME, BENAMOURA_SHEET_NAME, BENTOULINGUO_SHEET_NAME];
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedSheets.includes(targetName)) return responseJSON({ success: false, message: "Espace de publication non autorisé." });
      if (!allowedMimeTypes.includes((data.mimeType || "").toString().toLowerCase())) return responseJSON({ success: false, message: "Format d’image non pris en charge." });
      if ((data.base64 || "").toString().length > 4200000) return responseJSON({ success: false, message: "L’image doit faire moins de 3 Mo." });
      data.fileName = (data.fileName || "article-image").toString().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      return responseJSON({ success: true, imageUrl: saveDashboardImage(data) });
    }

    if (["dashboardGetCourses", "dashboardGetLessons", "dashboardAddCourse", "dashboardAddLesson", "dashboardDeleteLesson", "dashboardUploadImage"].includes(action)) {
      const tokenEmail = CacheService.getScriptCache().get("dashboard:" + (data.token || ""));
      if (!tokenEmail || tokenEmail !== (data.email || "").toString().trim().toLowerCase() || !isDashboardAdmin(tokenEmail)) {
        return responseJSON({ success: false, message: "Accès réservé à l’administration." });
      }

      if (action === "dashboardGetCourses") {
        return responseJSON({ success: true, courses: getProductsList(PRODUCTS_SHEET_NAME) });
      }

      if (action === "dashboardGetLessons") {
        return responseJSON({ success: true, lessons: getLessonsList(data.courseId) });
      }

      if (action === "dashboardUploadImage") {
        return responseJSON({ success: true, imageUrl: saveDashboardImage(data) });
      }

      if (action === "dashboardAddCourse") {
        const title = (data.title || "").toString().trim();
        if (!title) return responseJSON({ success: false, message: "Le titre du cours est obligatoire." });
        const courseId = "PRD-" + Date.now();
        const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        getProductsSheet(PRODUCTS_SHEET_NAME).appendRow([
          courseId, title, "Cours", Number(data.price) || 0, "", "", data.description || "", "", date, data.imageUrl || ""
        ]);
        return responseJSON({ success: true, courseId: courseId, message: "Cours enregistré dans Google Sheets." });
      }

      if (action === "dashboardAddLesson") {
        const courseId = (data.courseId || "").toString().trim();
        const title = (data.title || "").toString().trim();
        const course = getProductsList(PRODUCTS_SHEET_NAME).find(item => (item.ID || item.id || "").toString() === courseId);
        if (!course) return responseJSON({ success: false, message: "Sélectionnez un cours valide." });
        if (!title) return responseJSON({ success: false, message: "Le titre de la leçon est obligatoire." });
        const lessonId = "LES-" + Date.now();
        const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        getLessonsSheet().appendRow([lessonId, courseId, course.Titre || course.titre || "", title, data.imageUrl || "", data.videoUrl || "", date]);
        return responseJSON({ success: true, lessonId: lessonId, message: "Leçon ajoutée au cours." });
      }

      if (action === "dashboardDeleteLesson") {
        const lessonId = (data.lessonId || "").toString().trim();
        const sheet = getLessonsSheet();
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString().trim() === lessonId) {
            sheet.deleteRow(i + 1);
            return responseJSON({ success: true, message: "Leçon supprimée." });
          }
        }
        return responseJSON({ success: false, message: "Leçon introuvable." });
      }
    }

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();

    // 1. Inscription
    if (action === "register") {
      const email = (data.email || "").trim().toLowerCase();
      const nom = data.nom || data.name || "Utilisateur";

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][2] && rows[i][2].toString().toLowerCase() === email) {
          return responseJSON({ success: false, message: "Cet email est déjà utilisé." });
        }
      }

      const id = "USR-" + Date.now();
      const credits = 150;
      const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
      const avatar = data.avatar || "";
      const role = "client";

      sheet.appendRow([id, nom, email, data.password, credits, date, avatar, role]);

      return responseJSON({
        success: true,
        message: "Inscription réussie !",
        token: createUserSession(email),
        user: { id, nom, name: nom, email, credits, avatar, role, date_creation: date }
      });
    }

    // 2. Connexion
    if (action === "login") {
      const email = (data.email || "").trim().toLowerCase();
      const password = (data.password || "").toString();

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][2] && rows[i][2].toString().toLowerCase() === email && rows[i][3].toString() === password) {
          const dateVal = rows[i][5] instanceof Date 
            ? Utilities.formatDate(rows[i][5], Session.getScriptTimeZone(), "yyyy-MM-dd") 
            : rows[i][5];

          return responseJSON({
            success: true,
            message: "Connexion réussie !",
            token: createUserSession(email),
            user: {
              id: rows[i][0],
              nom: rows[i][1],
              name: rows[i][1],
              email: rows[i][2],
              credits: Number(rows[i][4]) || 0,
              date_creation: dateVal || "-",
              avatar: rows[i][6] || "",
              role: rows[i][getUserColumnIndex(rows[0], "role", 7)] || "client"
            }
          });
        }
      }

      return responseJSON({ success: false, message: "Email ou mot de passe incorrect." });
    }

    // 3. Achat / Déblocage
    if (action === "buyProduct") {
      const email = (data.email || "").trim().toLowerCase();
      if (!hasValidUserSession(email, data.token)) {
        return responseJSON({ success: false, message: "Connectez-vous pour effectuer un achat." });
      }
      const productId = (data.productId || "").toString();

      const products = getProductsList(PRODUCTS_SHEET_NAME);
      let product = products.find(p => (p.id || p.ID || "").toString() === productId);

      let price = 0;
      let title = "Article numérique";
      let fileUrl = "";

      if (product) {
        price = Number(product.prix || product.Prix) || 0;
        title = product.titre || product.Titre || title;
        fileUrl = product.UrlRedirection || product.DownloadUrl || product.url_fichier || "";
      } else {
        return responseJSON({ success: false, message: "Produit introuvable dans la boutique." });
      }

      if (!Number.isFinite(price) || price < 0) {
        return responseJSON({ success: false, message: "Le prix du produit est invalide." });
      }
      if (!/^https?:\/\//i.test(fileUrl)) {
        return responseJSON({ success: false, message: "Aucun lien de téléchargement valide n’est configuré pour ce produit." });
      }

      const purchaseLock = LockService.getScriptLock();
      purchaseLock.waitLock(10000);
      try {
        const purchaseSheet = getPurchasesSheet();
        const purchaseRows = purchaseSheet.getDataRange().getValues();
        const previousPurchase = purchaseRows.slice(1).find(row =>
          row[1] && row[1].toString().trim().toLowerCase() === email &&
          row[2] && row[2].toString().trim() === productId &&
          (row[6] || "Complété").toString().trim().toLowerCase() === "complété"
        );
        const currentRows = sheet.getDataRange().getValues();

        for (let i = 1; i < currentRows.length; i++) {
          if (currentRows[i][2] && currentRows[i][2].toString().trim().toLowerCase() === email) {
            const currentCredits = Number(currentRows[i][4]) || 0;
            if (previousPurchase) {
              return responseJSON({
                success: true,
                alreadyPurchased: true,
                message: "Ce produit est déjà disponible dans votre compte.",
                newCredits: currentCredits,
                fileUrl: fileUrl
              });
            }

            if (currentCredits < price) {
              return responseJSON({
                success: false,
                insufficientCredits: true,
                currentCredits: currentCredits,
                requiredCredits: price,
                message: `Crédits insuffisants (${currentCredits}/${price}).`
              });
            }

            const newCredits = currentCredits - price;
            const purchaseId = "ACH-" + Date.now();
            const purchaseDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
            purchaseSheet.appendRow([purchaseId, email, productId, title, price, purchaseDate, "Complété"]);
            try {
              sheet.getRange(i + 1, 5).setValue(newCredits);
            } catch (err) {
              purchaseSheet.deleteRow(purchaseSheet.getLastRow());
              throw err;
            }

            return responseJSON({
              success: true,
              alreadyPurchased: false,
              message: "Ressource débloquée avec succès !",
              newCredits: newCredits,
              fileUrl: fileUrl
            });
          }
        }
      } finally {
        purchaseLock.releaseLock();
      }

      return responseJSON({ success: false, message: "Utilisateur non trouvé." });
    }

    // 4. Ajout d'article / produit (Admin)
    if (action === "adminAddProduct" || action === "addProduct" || action === "add") {
      const ss = getDatabaseSpreadsheet();
      const targetName = (data.sheet || (e && e.parameter && e.parameter.sheet) || (ss.getSheetByName(BENAMOURA_SHEET_NAME) ? BENAMOURA_SHEET_NAME : PRODUCTS_SHEET_NAME)).toString().trim();
      if (![PRODUCTS_SHEET_NAME, BENAMOURA_SHEET_NAME, BENTOULINGUO_SHEET_NAME].includes(targetName.toLowerCase())) {
        return responseJSON({ success: false, message: "Espace de publication non autorisé." });
      }
      if (targetName.toLowerCase() === BENAMOURA_SHEET_NAME.toLowerCase() && !hasValidSeriesEpisode(data)) {
        return responseJSON({ success: false, message: "Une histoire en série doit avoir un nom de série et un numéro d’épisode valide." });
      }
      const prodSheet = getProductsSheet(targetName);

      const titre = data.titre || data.Titre || "";
      const desc = data.description || data.Description || "";
      const img = data.ImageUrl || data.imageUrl || data.image || "";
      const cat = data.categorie || data.Categorie || "Général";
      const dateAjout = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      const urlFile = data.DownloadUrl || data.downloadUrl || data.urlRedirection || data.UrlRedirection || data.url_fichier || "";

      if (targetName.toLowerCase() === BENTOULINGUO_SHEET_NAME.toLowerCase()) {
        // bentoulinguo : ID, Titre, Categorie, Description, DateAjout, ImageUrl, Langue, UrlRedirection, UrlAudio, UrlVideo
        const newId = "BTG-" + Date.now();
        const langue = data.langue || data.Langue || "";
        const urlRedirection = data.urlRedirection || data.UrlRedirection || "";
        const urlAudio = data.urlAudio || data.UrlAudio || "";
        const urlVideo = data.urlVideo || data.UrlVideo || "";
        prodSheet.appendRow([newId, titre, cat, desc, dateAjout, img, langue, urlRedirection, urlAudio, urlVideo]);
      } else if (targetName.toLowerCase() === BENAMOURA_SHEET_NAME.toLowerCase()) {
        const newId = "BEN-" + Date.now();
        const headers = prodSheet.getRange(1, 1, 1, prodSheet.getLastColumn()).getValues()[0].map(header => String(header).trim());
        const row = {
          ID: newId, Titre: titre, Description: desc, ImageUrl: img, Categorie: cat, DateAjout: dateAjout, UrlRedirection: urlFile,
          SeriesTitle: data.seriesTitle || data.SeriesTitle || "",
          EpisodeNumber: data.episodeNumber || data.EpisodeNumber || ""
        };
        prodSheet.appendRow(headers.map(header => {
          const field = Object.keys(row).find(key => normalizeHeader(key) === normalizeHeader(header));
          return field === undefined ? "" : row[field];
        }));
      } else {
        // produits : ID, Titre, Categorie, Prix, Icon, Couleur, Description, DownloadUrl, DateAjout, ImageUrl
        const newId = "PRD-" + Date.now();
        const prix = Number(data.prix || data.Prix) || 0;
        const icon = data.icon || data.Icon || "";
        const couleur = data.couleur || data.Couleur || "";
        prodSheet.appendRow([newId, titre, cat, prix, icon, couleur, desc, urlFile, dateAjout, img, 0]);
      }

      return responseJSON({ success: true, message: "Enregistré avec succès dans " + targetName + " !" });
    }

    // 5. Modification d'un élément (Admin Edit)
    if (action === "adminUpdateProduct" || action === "updateProduct" || action === "update") {
      const targetName = (data.sheet || (e && e.parameter && e.parameter.sheet) || BENAMOURA_SHEET_NAME).toString().trim();
      if (![PRODUCTS_SHEET_NAME, BENAMOURA_SHEET_NAME, BENTOULINGUO_SHEET_NAME].includes(targetName.toLowerCase())) {
        return responseJSON({ success: false, message: "Espace de publication non autorisé." });
      }
      if (targetName.toLowerCase() === BENAMOURA_SHEET_NAME.toLowerCase() && !hasValidSeriesEpisode(data)) {
        return responseJSON({ success: false, message: "Une histoire en série doit avoir un nom de série et un numéro d’épisode valide." });
      }
      const targetSheet = getProductsSheet(targetName);
      const tableRows = targetSheet.getDataRange().getValues();
      const targetId = (data.id || data.ID || (e && e.parameter && e.parameter.id) || "").toString().trim();

      let foundIndex = -1;
      for (let i = 1; i < tableRows.length; i++) {
        if (tableRows[i][0] && tableRows[i][0].toString().trim() === targetId) {
          foundIndex = i + 1;
          break;
        }
      }

      if (foundIndex === -1) {
        return responseJSON({ success: false, message: "Élément introuvable avec l'ID : " + targetId });
      }

      if (targetName.toLowerCase() === BENTOULINGUO_SHEET_NAME.toLowerCase()) {
        // bentoulinguo : 1:ID, 2:Titre, 3:Categorie, 4:Description, 5:DateAjout, 6:ImageUrl, 7:Langue, 8:UrlRedirection, 9:UrlAudio, 10:UrlVideo
        if (data.titre !== undefined || data.Titre !== undefined) targetSheet.getRange(foundIndex, 2).setValue(data.titre || data.Titre);
        if (data.categorie !== undefined || data.Categorie !== undefined) targetSheet.getRange(foundIndex, 3).setValue(data.categorie || data.Categorie);
        if (data.description !== undefined || data.Description !== undefined) targetSheet.getRange(foundIndex, 4).setValue(data.description || data.Description);
        if (data.imageUrl !== undefined || data.ImageUrl !== undefined || data.image !== undefined) {
          const imageUrl = data.imageUrl !== undefined ? data.imageUrl : data.ImageUrl !== undefined ? data.ImageUrl : data.image;
          targetSheet.getRange(foundIndex, 6).setValue(imageUrl);
        }
        if (data.langue !== undefined || data.Langue !== undefined) targetSheet.getRange(foundIndex, 7).setValue(data.langue !== undefined ? data.langue : data.Langue);
        if (data.urlRedirection !== undefined || data.UrlRedirection !== undefined) {
          targetSheet.getRange(foundIndex, 8).setValue(data.urlRedirection !== undefined ? data.urlRedirection : data.UrlRedirection);
        }
        if (data.urlAudio !== undefined || data.UrlAudio !== undefined) {
          targetSheet.getRange(foundIndex, 9).setValue(data.urlAudio !== undefined ? data.urlAudio : data.UrlAudio);
        }
        if (data.urlVideo !== undefined || data.UrlVideo !== undefined) {
          targetSheet.getRange(foundIndex, 10).setValue(data.urlVideo !== undefined ? data.urlVideo : data.UrlVideo);
        }
      } else if (targetName.toLowerCase() === BENAMOURA_SHEET_NAME.toLowerCase()) {
        const headers = tableRows[0].map(header => String(header).trim());
        if (data.titre !== undefined || data.Titre !== undefined) {
          setValueByHeader(targetSheet, foundIndex, headers, "Titre", data.titre !== undefined ? data.titre : data.Titre);
        }
        if (data.description !== undefined || data.Description !== undefined) {
          setValueByHeader(targetSheet, foundIndex, headers, "Description", data.description !== undefined ? data.description : data.Description);
        }
        if (data.imageUrl !== undefined || data.ImageUrl !== undefined || data.image !== undefined) {
          const imageUrl = data.imageUrl !== undefined ? data.imageUrl : data.ImageUrl !== undefined ? data.ImageUrl : data.image;
          setValueByHeader(targetSheet, foundIndex, headers, "ImageUrl", imageUrl);
        }
        if (data.categorie !== undefined || data.Categorie !== undefined) {
          setValueByHeader(targetSheet, foundIndex, headers, "Categorie", data.categorie !== undefined ? data.categorie : data.Categorie);
        }
        if (data.urlRedirection !== undefined || data.UrlRedirection !== undefined || data.downloadUrl !== undefined) {
          const urlRedirection = data.urlRedirection !== undefined ? data.urlRedirection : data.UrlRedirection !== undefined ? data.UrlRedirection : data.downloadUrl;
          setValueByHeader(targetSheet, foundIndex, headers, "UrlRedirection", urlRedirection);
        }
        if (data.seriesTitle !== undefined || data.SeriesTitle !== undefined) {
          setValueByHeader(targetSheet, foundIndex, headers, "SeriesTitle", data.seriesTitle !== undefined ? data.seriesTitle : data.SeriesTitle);
        }
        if (data.episodeNumber !== undefined || data.EpisodeNumber !== undefined) {
          const episodeNumber = data.episodeNumber !== undefined ? data.episodeNumber : data.EpisodeNumber;
          setValueByHeader(targetSheet, foundIndex, headers, "EpisodeNumber", episodeNumber === "" ? "" : Number(episodeNumber));
        }
      } else {
        // produits : 1:ID, 2:Titre, 3:Categorie, 4:Prix, 5:Icon, 6:Couleur, 7:Description, 8:DownloadUrl, 9:DateAjout, 10:ImageUrl
        if (data.titre !== undefined || data.Titre !== undefined) targetSheet.getRange(foundIndex, 2).setValue(data.titre || data.Titre);
        if (data.categorie !== undefined || data.Categorie !== undefined) targetSheet.getRange(foundIndex, 3).setValue(data.categorie || data.Categorie);
        if (data.prix !== undefined || data.Prix !== undefined) targetSheet.getRange(foundIndex, 4).setValue(Number(data.prix || data.Prix) || 0);
        if (data.icon !== undefined || data.Icon !== undefined) targetSheet.getRange(foundIndex, 5).setValue(data.icon || data.Icon);
        if (data.couleur !== undefined || data.Couleur !== undefined) targetSheet.getRange(foundIndex, 6).setValue(data.couleur || data.Couleur);
        if (data.description !== undefined || data.Description !== undefined) targetSheet.getRange(foundIndex, 7).setValue(data.description || data.Description);
        if (data.downloadUrl !== undefined || data.DownloadUrl !== undefined || data.url_fichier !== undefined) {
          targetSheet.getRange(foundIndex, 8).setValue(data.downloadUrl || data.DownloadUrl || data.url_fichier);
        }
        if (data.imageUrl !== undefined || data.ImageUrl !== undefined || data.image !== undefined) {
          targetSheet.getRange(foundIndex, 10).setValue(data.imageUrl || data.ImageUrl || data.image);
        }
      }

      return responseJSON({ success: true, message: "Mise à jour réussie !" });
    }

    // 6. Suppression d'un élément (Admin Delete)
    if (action === "adminDeleteProduct" || action === "deleteProduct" || action === "delete") {
      const targetName = (data.sheet || (e && e.parameter && e.parameter.sheet) || BENAMOURA_SHEET_NAME).toString().trim();
      if (![PRODUCTS_SHEET_NAME, BENAMOURA_SHEET_NAME, BENTOULINGUO_SHEET_NAME].includes(targetName.toLowerCase())) {
        return responseJSON({ success: false, message: "Espace de publication non autorisé." });
      }
      const targetSheet = getProductsSheet(targetName);
      const tableRows = targetSheet.getDataRange().getValues();
      const targetId = (data.id || data.ID || (e && e.parameter && e.parameter.id) || "").toString().trim();

      for (let i = 1; i < tableRows.length; i++) {
        if (tableRows[i][0] && tableRows[i][0].toString().trim() === targetId) {
          targetSheet.deleteRow(i + 1);
          return responseJSON({ success: true, message: "Élément supprimé avec succès !" });
        }
      }

      return responseJSON({ success: false, message: "ID introuvable dans la feuille " + targetName });
    }

    return responseJSON({ success: false, message: "Action non reconnue : " + action });

  } catch (err) {
    return responseJSON({ success: false, message: "Erreur serveur : " + err.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
