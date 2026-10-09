var USERS_SHEET_NAME = "USERS";
var USERS_HEADERS = ["ID", "NOM", "USERS", "EMAIL", "CREDITS", "PHONE", "PASSWORD", "ROLE", "CODE", "AVATAR"];
var ASTUCES_SHEET_NAME = "ASTUCES";
var ASTUCES_HEADERS = ["ID", "TITRE", "SHORT_DESCRIPTION", "DESCRIPTION", "TYPE", "URLIMAGE", "URLVIDEO", "URLREDIRECTION", "LIKE", "DESLIKE", "PARTAGE", "VISITES"];
var HISTOIRE_SHEET_NAME = "HISTOIRE";
var HISTOIRE_HEADERS = ["ID", "TITRE", "SOUS_TITRE", "CONTNUE", "TYPE", "URLREDIRECTION", "URLAUDIO", "URLVIDEO", "LIKE", "DESLIKE", "VISITES", "PARTAGE"];
var BOUTIQUE_SHEET_NAME = "BOUTIQUE";
var BOUTIQUE_HEADERS = ["ID", "TITREQ", "DESCRIPTION", "IMAGE", "URDOENLOAD", "CREDITS", "TYPE"];
var BOUTIQUE_UNLOCKS_SHEET_NAME = "BOUTIQUE_DEBLOCAGES";

function doGet(e) {
  try {
    var parameters = e && e.parameter ? e.parameter : {};
    if (parameters.action === "getAstuces") {
      return getAstuces_(parameters.viewerKey);
    }
    if (parameters.action === "getHistoire") {
      return getHistoire_(parameters.viewerKey);
    }
    if (parameters.action === "getBoutique") {
      return getBoutique_(parameters.username);
    }
    if (parameters.action !== "getUserData") {
      return jsonResponse_({ status: "invalid_action" });
    }

    var sheet = getUsersSheet_();
    var columns = getUserColumns_(sheet);
    var username = String(parameters.username || "").trim().toLowerCase();
    var email = String(parameters.email || "").trim().toLowerCase();
    var users = getUserRows_(sheet);

    for (var i = 0; i < users.length; i++) {
      var row = users[i];
      if ((username && String(row[columns.USERS - 1] || "").trim().toLowerCase() === username) ||
          (email && String(row[columns.EMAIL - 1] || "").trim().toLowerCase() === email)) {
        return jsonResponse_({
          status: "success",
          user: publicUser_(row, columns)
        });
      }
    }
    return jsonResponse_({ status: "not_found" });
  } catch (error) {
    return jsonResponse_({ status: "error", message: error.message || String(error) });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "trackAstuce") {
      return trackAstuce_(data);
    }
    if (data.action === "trackHistoire") {
      return trackHistoire_(data);
    }
    if (data.action === "unlockBoutiqueItem") {
      return unlockBoutiqueItem_(data);
    }
    var sheet = getUsersSheet_();
    var columns = getUserColumns_(sheet);

    if (data.action === "signup" || data.action === "login") {
      return handleAuthentication_(sheet, columns, data);
    }
    if (data.action === "updateAvatar") {
      return updateUserAvatar_(sheet, columns, data);
    }
    return recordActivity_(data, sheet, columns);
  } catch (error) {
    return jsonResponse_({ status: "error", message: error.message || String(error) });
  }
}

function getHistoireColumns_(sheet) {
  if (sheet.getLastRow() < 1) throw new Error("L’onglet HISTOIRE doit contenir ses en-têtes.");
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var columns = {};
  headers.forEach(function(header, index) {
    var normalized = String(header).trim().toUpperCase();
    if (normalized) columns[normalized] = index + 1;
  });
  var missing = HISTOIRE_HEADERS.filter(function(header) {
    return !columns[header];
  });
  if (missing.length) throw new Error("En-têtes manquants dans HISTOIRE : " + missing.join(", ") + ".");
  return columns;
}

function getHistoire_(viewerKey) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Aucun Google Sheet n’est associé à ce projet Apps Script.");
  var sheet = spreadsheet.getSheetByName(HISTOIRE_SHEET_NAME);
  if (!sheet) throw new Error('Onglet "HISTOIRE" introuvable. Vérifiez le nom de la feuille.');
  var columns = getHistoireColumns_(sheet);
  var viewerHash = hashAstuceViewer_(viewerKey);
  var interactions = getAstuceViewerInteractions_(viewerHash);
  var rows = sheet.getLastRow() < 2
    ? []
    : sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();
  var items = rows.map(function(row, index) {
    var id = String(row[columns.ID - 1] || "row-" + (index + 2));
    var hasContent = [columns.TITRE, columns.SOUS_TITRE, columns.CONTNUE, columns.TYPE].some(function(column) {
      return String(row[column - 1] || "").trim() !== "";
    });
    if (!hasContent) return null;
    return {
      id: id,
      title: String(row[columns.TITRE - 1] || ""),
      subtitle: String(row[columns.SOUS_TITRE - 1] || ""),
      content: String(row[columns.CONTNUE - 1] || ""),
      type: String(row[columns.TYPE - 1] || ""),
      redirectUrl: String(row[columns.URLREDIRECTION - 1] || ""),
      audioUrl: String(row[columns.URLAUDIO - 1] || ""),
      videoUrl: String(row[columns.URLVIDEO - 1] || ""),
      likes: Number(row[columns.LIKE - 1]) || 0,
      dislikes: Number(row[columns.DESLIKE - 1]) || 0,
      visits: Number(row[columns.VISITES - 1]) || 0,
      shares: Number(row[columns.PARTAGE - 1]) || 0,
      myVote: interactions["histoire:" + id] || "",
      myViewed: Boolean(interactions["viewed:histoire:" + id])
    };
  }).filter(function(item) {
    return item !== null;
  });
  return jsonResponse_({ status: "success", items: items });
}

function trackHistoire_(data) {
  var id = String(data.id || "").trim();
  var metric = String(data.metric || "").trim().toUpperCase();
  var viewerHash = hashAstuceViewer_(data.viewerKey);
  var allowedMetrics = ["LIKE", "DESLIKE", "VISITES", "PARTAGE"];
  if (!id || allowedMetrics.indexOf(metric) === -1) throw new Error("Action ou identifiant d’histoire invalide.");

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Aucun Google Sheet n’est associé à ce projet Apps Script.");
  var sheet = spreadsheet.getSheetByName(HISTOIRE_SHEET_NAME);
  if (!sheet) throw new Error('Onglet "HISTOIRE" introuvable. Vérifiez le nom de la feuille.');
  var columns = getHistoireColumns_(sheet);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var rows = sheet.getLastRow() < 2 ? [] :
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < rows.length; i++) {
      var rowId = String(rows[i][columns.ID - 1] || "row-" + (i + 2));
      if (rowId !== id) continue;
      var interactionId = "histoire:" + id;
      var interactions = getAstuceInteractionsSheet_();
      var interactionRows = interactions.getLastRow() < 2 ? [] :
        interactions.getRange(2, 1, interactions.getLastRow() - 1, 4).getValues();
      var previousVote = "";
      var alreadyViewed = false;
      for (var j = 0; j < interactionRows.length; j++) {
        if (String(interactionRows[j][0]) !== interactionId || String(interactionRows[j][1]) !== viewerHash) continue;
        if (interactionRows[j][2] === "LIKE" || interactionRows[j][2] === "DESLIKE") previousVote = interactionRows[j][2];
        if (interactionRows[j][2] === "VISITES") alreadyViewed = true;
      }
      if ((metric === "LIKE" || metric === "DESLIKE") && previousVote) {
        return jsonResponse_({
          status: "already_voted", vote: previousVote,
          likes: Number(rows[i][columns.LIKE - 1]) || 0,
          dislikes: Number(rows[i][columns.DESLIKE - 1]) || 0
        });
      }
      if (metric === "VISITES" && alreadyViewed) {
        return jsonResponse_({ status: "already_viewed", count: Number(rows[i][columns.VISITES - 1]) || 0 });
      }
      var cell = sheet.getRange(i + 2, columns[metric]);
      var count = (Number(cell.getValue()) || 0) + 1;
      cell.setValue(count);
      if (metric === "LIKE" || metric === "DESLIKE" || metric === "VISITES") {
        interactions.appendRow([interactionId, viewerHash, metric, new Date()]);
      }
      return jsonResponse_({
        status: "success", metric: metric, count: count,
        vote: metric === "LIKE" || metric === "DESLIKE" ? metric : "",
        likes: metric === "LIKE" ? count : Number(rows[i][columns.LIKE - 1]) || 0,
        dislikes: metric === "DESLIKE" ? count : Number(rows[i][columns.DESLIKE - 1]) || 0
      });
    }
    throw new Error("Histoire introuvable dans l’onglet HISTOIRE.");
  } finally {
    lock.releaseLock();
  }
}

function getBoutiqueColumns_(sheet) {
  if (sheet.getLastRow() < 1) throw new Error("L’onglet BOUTIQUE doit contenir ses en-têtes.");
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var columns = {};
  headers.forEach(function(header, index) {
    var normalized = String(header).trim().toUpperCase();
    if (normalized) columns[normalized] = index + 1;
  });
  var missing = BOUTIQUE_HEADERS.filter(function(header) {
    return !columns[header];
  });
  if (missing.length) throw new Error("En-têtes manquants dans BOUTIQUE : " + missing.join(", ") + ".");
  return columns;
}

function getBoutiqueUnlocksSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(BOUTIQUE_UNLOCKS_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(BOUTIQUE_UNLOCKS_SHEET_NAME);
    sheet.appendRow(["USERNAME", "ITEM_ID", "DATE", "CREDITS_PAID"]);
  }
  return sheet;
}

function getBoutique_(username) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Aucun Google Sheet n’est associé à ce projet Apps Script.");
  var sheet = spreadsheet.getSheetByName(BOUTIQUE_SHEET_NAME);
  if (!sheet) throw new Error('Onglet "BOUTIQUE" introuvable. Vérifiez le nom de la feuille.');
  var columns = getBoutiqueColumns_(sheet);
  var normalizedUsername = String(username || "").trim().toLowerCase();
  var unlockedIds = {};
  if (normalizedUsername) {
    var unlocks = spreadsheet.getSheetByName(BOUTIQUE_UNLOCKS_SHEET_NAME);
    if (unlocks && unlocks.getLastRow() > 1) {
      unlocks.getRange(2, 1, unlocks.getLastRow() - 1, 2).getDisplayValues().forEach(function(row) {
        if (String(row[0]).trim().toLowerCase() === normalizedUsername) unlockedIds[String(row[1])] = true;
      });
    }
  }
  var rows = sheet.getLastRow() < 2
    ? []
    : sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();
  var items = rows.map(function(row) {
    var id = String(row[columns.ID - 1] || "").trim();
    if (!id) return null;
    var unlocked = Boolean(unlockedIds[id]);
    return {
      id: id,
      title: String(row[columns.TITREQ - 1] || ""),
      description: String(row[columns.DESCRIPTION - 1] || ""),
      image: String(row[columns.IMAGE - 1] || ""),
      downloadUrl: unlocked ? String(row[columns.URDOENLOAD - 1] || "") : "",
      credits: Math.max(0, Number(row[columns.CREDITS - 1]) || 0),
      type: String(row[columns.TYPE - 1] || ""),
      unlocked: unlocked
    };
  }).filter(function(item) {
    return item !== null;
  });
  return jsonResponse_({ status: "success", items: items });
}

function unlockBoutiqueItem_(data) {
  var username = String(data.username || "").trim().toLowerCase();
  var itemId = String(data.id || "").trim();
  if (!username || !itemId) throw new Error("Connectez-vous et sélectionnez un document avant de le débloquer.");

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Aucun Google Sheet n’est associé à ce projet Apps Script.");
  var boutique = spreadsheet.getSheetByName(BOUTIQUE_SHEET_NAME);
  if (!boutique) throw new Error('Onglet "BOUTIQUE" introuvable. Vérifiez le nom de la feuille.');
  var itemColumns = getBoutiqueColumns_(boutique);
  var users = getUsersSheet_();
  var userColumns = getUserColumns_(users);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var userRows = getUserRows_(users);
    var userIndex = -1;
    for (var i = 0; i < userRows.length; i++) {
      if (String(userRows[i][userColumns.USERS - 1] || "").trim().toLowerCase() === username) {
        userIndex = i;
        break;
      }
    }
    if (userIndex === -1) throw new Error("Compte introuvable. Connectez-vous à nouveau.");

    var productRows = boutique.getLastRow() < 2
      ? []
      : boutique.getRange(2, 1, boutique.getLastRow() - 1, boutique.getLastColumn()).getDisplayValues();
    var product = null;
    for (var productIndex = 0; productIndex < productRows.length; productIndex++) {
      if (String(productRows[productIndex][itemColumns.ID - 1] || "").trim() === itemId) {
        product = productRows[productIndex];
        break;
      }
    }
    if (!product) throw new Error("Document introuvable dans l’onglet BOUTIQUE.");

    var unlocks = getBoutiqueUnlocksSheet_();
    var existingUnlocks = unlocks.getLastRow() < 2
      ? []
      : unlocks.getRange(2, 1, unlocks.getLastRow() - 1, 2).getDisplayValues();
    for (var unlockIndex = 0; unlockIndex < existingUnlocks.length; unlockIndex++) {
      if (String(existingUnlocks[unlockIndex][0]).trim().toLowerCase() === username &&
          String(existingUnlocks[unlockIndex][1]).trim() === itemId) {
        var existingUser = users.getRange(userIndex + 2, 1, 1, users.getLastColumn()).getValues()[0];
        return jsonResponse_({
          status: "already_unlocked",
          credits: Number(existingUser[userColumns.CREDITS - 1]) || 0,
          item: {
            id: itemId,
            title: String(product[itemColumns.TITREQ - 1] || ""),
            description: String(product[itemColumns.DESCRIPTION - 1] || ""),
            image: String(product[itemColumns.IMAGE - 1] || ""),
            downloadUrl: String(product[itemColumns.URDOENLOAD - 1] || ""),
            credits: Math.max(0, Number(product[itemColumns.CREDITS - 1]) || 0),
            type: String(product[itemColumns.TYPE - 1] || ""),
            unlocked: true
          }
        });
      }
    }

    var cost = Number(product[itemColumns.CREDITS - 1]) || 0;
    if (cost < 0) throw new Error("Le coût du document est invalide dans BOUTIQUE.");
    var currentCredits = Number(userRows[userIndex][userColumns.CREDITS - 1]) || 0;
    if (currentCredits < cost) {
      return jsonResponse_({ status: "insufficient_credits", credits: currentCredits, required: cost });
    }

    var remainingCredits = currentCredits - cost;
    var creditCell = users.getRange(userIndex + 2, userColumns.CREDITS);
    creditCell.setValue(remainingCredits);
    try {
      unlocks.appendRow([username, itemId, new Date(), cost]);
    } catch (error) {
      creditCell.setValue(currentCredits);
      throw error;
    }
    return jsonResponse_({
      status: "success",
      credits: remainingCredits,
      item: {
        id: itemId,
        title: String(product[itemColumns.TITREQ - 1] || ""),
        description: String(product[itemColumns.DESCRIPTION - 1] || ""),
        image: String(product[itemColumns.IMAGE - 1] || ""),
        downloadUrl: String(product[itemColumns.URDOENLOAD - 1] || ""),
        credits: cost,
        type: String(product[itemColumns.TYPE - 1] || ""),
        unlocked: true
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function getAstuces_(viewerKey) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Aucun Google Sheet n’est associé à ce projet Apps Script.");
  var sheet = spreadsheet.getSheetByName(ASTUCES_SHEET_NAME);
  if (!sheet) throw new Error('Onglet "ASTUCES" introuvable. Vérifiez le nom de la feuille.');
  var columns = getAstucesColumns_(sheet);
  var viewerHash = hashAstuceViewer_(viewerKey);
  var interactions = getAstuceViewerInteractions_(viewerHash);
  var rows = sheet.getLastRow() < 2
    ? []
    : sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();

  var items = rows.map(function(row, index) {
    var hasContent = [
      columns.TITRE,
      columns.SHORT_DESCRIPTION,
      columns.DESCRIPTION,
      columns.TYPE,
      columns.URLIMAGE,
      columns.URLVIDEO,
      columns.URLREDIRECTION
    ].some(function(column) {
      return String(row[column - 1] || "").trim() !== "";
    });
    if (!hasContent) return null;

    return {
      id: String(row[columns.ID - 1] || "row-" + (index + 2)),
      title: String(row[columns.TITRE - 1] || ""),
      shortDescription: String(row[columns.SHORT_DESCRIPTION - 1] || ""),
      description: String(row[columns.DESCRIPTION - 1] || ""),
      type: String(row[columns.TYPE - 1] || ""),
      imageUrl: String(row[columns.URLIMAGE - 1] || ""),
      videoUrl: String(row[columns.URLVIDEO - 1] || ""),
      redirectUrl: String(row[columns.URLREDIRECTION - 1] || ""),
      likes: Number(row[columns.LIKE - 1]) || 0,
      dislikes: Number(row[columns.DESLIKE - 1]) || 0,
      shares: Number(row[columns.PARTAGE - 1]) || 0,
      visits: Number(row[columns.VISITES - 1]) || 0,
      myVote: interactions[String(row[columns.ID - 1] || "row-" + (index + 2))] || "",
      myViewed: Boolean(interactions["viewed:" + String(row[columns.ID - 1] || "row-" + (index + 2))])
    };
  }).filter(function(item) {
    return item !== null;
  });
  return jsonResponse_({ status: "success", items: items });
}

function getAstucesColumns_(sheet) {
  if (sheet.getLastRow() < 1) {
    throw new Error("L’onglet ASTUCES doit contenir sa ligne d’en-têtes.");
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var columns = {};
  headers.forEach(function(header, index) {
    var normalized = String(header).trim().toUpperCase();
    if (normalized) columns[normalized] = index + 1;
  });
  var missing = ASTUCES_HEADERS.filter(function(header) {
    return !columns[header];
  });
  if (missing.length) {
    throw new Error("En-têtes manquants dans ASTUCES : " + missing.join(", ") + ".");
  }
  return columns;
}

function trackAstuce_(data) {
  var id = String(data.id || "").trim();
  var metric = String(data.metric || "").trim().toUpperCase();
  var viewerHash = hashAstuceViewer_(data.viewerKey);
  var allowedMetrics = ["LIKE", "DESLIKE", "PARTAGE", "VISITES"];
  if (!id || allowedMetrics.indexOf(metric) === -1) {
    throw new Error("Action ou identifiant de ressource invalide.");
  }

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Aucun Google Sheet n’est associé à ce projet Apps Script.");
  var sheet = spreadsheet.getSheetByName(ASTUCES_SHEET_NAME);
  if (!sheet) throw new Error('Onglet "ASTUCES" introuvable. Vérifiez le nom de la feuille.');
  var columns = getAstucesColumns_(sheet);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var rows = sheet.getLastRow() < 2
      ? []
      : sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < rows.length; i++) {
      var rowId = String(rows[i][columns.ID - 1] || "");
      var fallbackRowNumber = /^row-(\d+)$/.test(id) ? Number(id.slice(4)) : 0;
      var matchesFallbackRow = fallbackRowNumber === i + 2 && !rowId;
      if (rowId === id || matchesFallbackRow) {
        var interactions = getAstuceInteractionsSheet_();
        var interactionRows = interactions.getLastRow() < 2
          ? []
          : interactions.getRange(2, 1, interactions.getLastRow() - 1, 4).getValues();
        var previousVote = "";
        var alreadyViewed = false;
        for (var interactionIndex = 0; interactionIndex < interactionRows.length; interactionIndex++) {
          var interaction = interactionRows[interactionIndex];
          if (String(interaction[0]) !== id || String(interaction[1]) !== viewerHash) continue;
          if (interaction[2] === "LIKE" || interaction[2] === "DESLIKE") previousVote = interaction[2];
          if (interaction[2] === "VISITES") alreadyViewed = true;
        }

        if ((metric === "LIKE" || metric === "DESLIKE") && previousVote) {
          return jsonResponse_({
            status: "already_voted",
            metric: metric,
            vote: previousVote,
            likes: Number(rows[i][columns.LIKE - 1]) || 0,
            dislikes: Number(rows[i][columns.DESLIKE - 1]) || 0
          });
        }
        if (metric === "VISITES" && alreadyViewed) {
          return jsonResponse_({
            status: "already_viewed",
            metric: metric,
            count: Number(rows[i][columns.VISITES - 1]) || 0
          });
        }

        var cell = sheet.getRange(i + 2, columns[metric]);
        var count = (Number(cell.getValue()) || 0) + 1;
        cell.setValue(count);
        if (metric === "LIKE" || metric === "DESLIKE" || metric === "VISITES") {
          interactions.appendRow([id, viewerHash, metric, new Date()]);
        }
        return jsonResponse_({
          status: "success",
          metric: metric,
          count: count,
          vote: metric === "LIKE" || metric === "DESLIKE" ? metric : "",
          likes: metric === "LIKE" ? count : Number(rows[i][columns.LIKE - 1]) || 0,
          dislikes: metric === "DESLIKE" ? count : Number(rows[i][columns.DESLIKE - 1]) || 0
        });
      }
    }
    throw new Error("Ressource introuvable dans l’onglet ASTUCES.");
  } finally {
    lock.releaseLock();
  }
}

function hashAstuceViewer_(viewerKey) {
  var key = String(viewerKey || "").trim().toLowerCase();
  if (!/^(?:user|guest):[a-z0-9_.@-]{3,100}$/.test(key)) {
    throw new Error("Identifiant visiteur manquant ou invalide. Rechargez la page et réessayez.");
  }
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key);
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
}

function getAstuceInteractionsSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("ASTUCES_INTERACTIONS");
  if (!sheet) {
    sheet = spreadsheet.insertSheet("ASTUCES_INTERACTIONS");
    sheet.appendRow(["ASTUCE_ID", "VIEWER_HASH", "ACTION", "DATE"]);
  }
  return sheet;
}

function getAstuceViewerInteractions_(viewerHash) {
  var interactions = {};
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("ASTUCES_INTERACTIONS");
  if (!sheet) return interactions;
  if (!viewerHash || sheet.getLastRow() < 2) return interactions;
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  rows.forEach(function(row) {
    if (String(row[1]) !== viewerHash) return;
    var id = String(row[0]);
    if (row[2] === "LIKE" || row[2] === "DESLIKE") interactions[id] = row[2];
    if (row[2] === "VISITES") interactions["viewed:" + id] = true;
  });
  return interactions;
}

function getUsersSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Aucun Google Sheet n’est associé à ce projet Apps Script.");
  }
  var sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) {
    throw new Error('Onglet "USERS" introuvable. Vérifiez le nom de la feuille.');
  }
  return sheet;
}

function getUserColumns_(sheet) {
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < USERS_HEADERS.length) {
    throw new Error("La ligne 1 de USERS doit contenir les en-têtes : ID, NOM, USERS, EMAIL, CREDITS, PHONE, PASSWORD, ROLE, CODE, Avatar.");
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var columns = {};
  headers.forEach(function(header, index) {
    var normalized = String(header).trim().toUpperCase();
    if (normalized) columns[normalized] = index + 1;
  });

  var missing = USERS_HEADERS.filter(function(header) {
    return !columns[header];
  });
  if (missing.length) {
    throw new Error("En-têtes manquants dans USERS : " + missing.join(", ") + ".");
  }
  return columns;
}

function getUserRows_(sheet) {
  var lastRow = sheet.getLastRow();
  return lastRow < 2
    ? []
    : sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
}

function handleAuthentication_(sheet, columns, data) {
  var username = String(data.username || "").trim();
  var normalizedUsername = username.toLowerCase();
  var password = String(data.password || "");
  var name = String(data.name || "").trim().replace(/\s+/g, " ");

  if (!/^[A-Za-z0-9_.-]{3,30}$/.test(username)) {
    throw new Error("Le nom d’utilisateur doit contenir 3 à 30 caractères (lettres, chiffres, point, tiret ou underscore).");
  }
  if (password.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var rows = getUserRows_(sheet);
    var userRow = -1;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][columns.USERS - 1] || "").trim().toLowerCase() === normalizedUsername) {
        userRow = i + 2;
        break;
      }
    }

    if (data.action === "signup") {
      if (name.length < 2) {
        throw new Error("Saisissez votre nom (au moins 2 caractères).");
      }
      if (userRow !== -1) {
        throw new Error("Ce nom d’utilisateur existe déjà. Choisissez-en un autre.");
      }

      var newUser = new Array(sheet.getLastColumn()).fill("");
      newUser[columns.ID - 1] = Utilities.getUuid();
      newUser[columns.NOM - 1] = name;
      newUser[columns.USERS - 1] = username;
      newUser[columns.EMAIL - 1] = String(data.email || "").trim();
      newUser[columns.CREDITS - 1] = 10;
      newUser[columns.PHONE - 1] = String(data.phone || "").trim();
      newUser[columns.PASSWORD - 1] = createPasswordHash_(password);
      newUser[columns.ROLE - 1] = "USER";
      newUser[columns.CODE - 1] = createReferenceCode_(rows, columns.CODE);
      newUser[columns.AVATAR - 1] = "";
      sheet.appendRow(newUser);
      userRow = sheet.getLastRow();
    } else {
      if (userRow === -1) {
        throw new Error("Nom d’utilisateur ou mot de passe incorrect.");
      }
      var passwordCell = sheet.getRange(userRow, columns.PASSWORD);
      var storedPassword = String(passwordCell.getValue() || "");
      if (!verifyPassword_(password, storedPassword)) {
        throw new Error("Nom d’utilisateur ou mot de passe incorrect.");
      }
      if (storedPassword.indexOf("$") === -1) {
        passwordCell.setValue(createPasswordHash_(password));
      }
      var referenceCell = sheet.getRange(userRow, columns.CODE);
      if (!String(referenceCell.getValue() || "").trim()) {
        referenceCell.setValue(createReferenceCode_(rows, columns.CODE));
      }
    }

    var row = sheet.getRange(userRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    return jsonResponse_({
      status: "success",
      user: publicUser_(row, columns)
    });
  } finally {
    lock.releaseLock();
  }
}

function publicUser_(row, columns) {
  return {
    id: String(row[columns.ID - 1] || ""),
    name: String(row[columns.NOM - 1] || ""),
    username: String(row[columns.USERS - 1] || ""),
    email: String(row[columns.EMAIL - 1] || ""),
    credits: Number(row[columns.CREDITS - 1]) || 0,
    points: Number(row[columns.CREDITS - 1]) || 0,
    phone: String(row[columns.PHONE - 1] || ""),
    referenceCode: String(row[columns.CODE - 1] || ""),
    avatar: String(row[columns.AVATAR - 1] || "")
  };
}

function createReferenceCode_(rows, codeColumn) {
  var existingCodes = {};
  rows.forEach(function(row) {
    var code = String(row[codeColumn - 1] || "").trim().toLowerCase();
    if (code) existingCodes[code] = true;
  });

  var code;
  do {
    code = "bentou-" + Math.floor(10000 + Math.random() * 90000);
  } while (existingCodes[code]);
  return code;
}

function updateUserAvatar_(sheet, columns, data) {
  var username = String(data.username || "").trim().toLowerCase();
  var avatar = String(data.avatar || "");
  if (!username) throw new Error("Reconnectez-vous avant de modifier la photo.");
  if (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(avatar)) {
    throw new Error("La photo doit être une image JPEG, PNG ou WebP valide.");
  }
  if (avatar.length > 45000) {
    throw new Error("La photo est trop volumineuse. Choisissez une image plus petite.");
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var rows = getUserRows_(sheet);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][columns.USERS - 1] || "").trim().toLowerCase() === username) {
        sheet.getRange(i + 2, columns.AVATAR).setValue(avatar);
        return jsonResponse_({
          status: "success",
          avatar: avatar,
          user: publicUser_(sheet.getRange(i + 2, 1, 1, sheet.getLastColumn()).getValues()[0], columns)
        });
      }
    }
    throw new Error("Utilisateur introuvable dans la feuille USERS.");
  } finally {
    lock.releaseLock();
  }
}

function recordActivity_(data, sheet, columns) {
  var username = String(data.username || "").trim().toLowerCase();
  var email = String(data.email || "").trim().toLowerCase();
  var rows = getUserRows_(sheet);

  for (var i = 0; i < rows.length; i++) {
    var rowUsername = String(rows[i][columns.USERS - 1] || "").trim().toLowerCase();
    var rowEmail = String(rows[i][columns.EMAIL - 1] || "").trim().toLowerCase();
    if ((username && rowUsername === username) || (email && rowEmail === email)) {
      var rowNumber = i + 2;
      sheet.getRange(rowNumber, columns.CREDITS).setValue(Number(data.currentPoints) || 0);
      if (data.name) sheet.getRange(rowNumber, columns.NOM).setValue(data.name);
      break;
    }
  }

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = spreadsheet.getSheetByName("Historique");
  if (!logSheet) {
    logSheet = spreadsheet.insertSheet("Historique");
    logSheet.appendRow(["Date", "Email", "Nom", "Type", "Détail", "Variation Points", "Points Actuels"]);
  }
  logSheet.appendRow([
    new Date(),
    data.email || data.username || "",
    data.name || "",
    data.type || "",
    data.detail || "",
    Number(data.pointChange) || 0,
    Number(data.currentPoints) || 0
  ]);

  return jsonResponse_({ status: "success" });
}

function createPasswordHash_(password) {
  var salt = Utilities.getUuid().replace(/-/g, "");
  return salt + "$" + hashPassword_(password, salt);
}

function verifyPassword_(password, storedPassword) {
  var parts = storedPassword.split("$");
  if (parts.length === 2) {
    return constantTimeEquals_(hashPassword_(password, parts[0]), parts[1]);
  }
  return storedPassword !== "" && constantTimeEquals_(password, storedPassword);
}

function hashPassword_(password, salt) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ":" + password,
    Utilities.Charset.UTF_8
  );
  for (var i = 0; i < 10000; i++) {
    digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, digest);
  }
  return digest.map(function(byte) {
    return ("0" + ((byte + 256) % 256).toString(16)).slice(-2);
  }).join("");
}

function constantTimeEquals_(left, right) {
  left = String(left);
  right = String(right);
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var i = 0; i < left.length; i++) {
    difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return difference === 0;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
