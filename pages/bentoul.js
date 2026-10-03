const catalogApiUrl = (window.APP_CONFIG && window.APP_CONFIG.apiUrl || "").trim();
const catalogGrid = document.querySelector("#catalog-grid");
const catalogStatus = document.querySelector("#catalog-status");
const productSearch = document.querySelector("#product-search");
const catalogSection = document.querySelector("#catalog-section");
const catalogDetails = document.querySelector("#catalog-details");
const sessionKey = "bcreation-user-session";
let catalogProducts = [];
let purchasedProductIds = new Set();
let purchaseHistoryLoaded = false;
let activeProduct = null;
let currentSession = readUserSession();
let pendingPurchase = null;
let pendingPurchaseAction = "download";

function normalizeProductField(field) {
  return String(field || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function openSharedProductFromHash() {
  let targetId = "";
  try {
    targetId = decodeURIComponent(window.location.hash.slice(1));
  } catch (error) {
    return;
  }
  if (!targetId.startsWith("product-")) return;
  const card = document.getElementById(targetId);
  if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function getProductValue(product, ...fieldNames) {
  const keys = Object.keys(product);
  for (const fieldName of fieldNames) {
    const key = keys.find((candidate) => normalizeProductField(candidate) === normalizeProductField(fieldName));
    if (key && product[key] !== null && product[key] !== undefined) return product[key];
  }
  return "";
}

function safeResourceUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value), window.location.href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch (error) {
    return "";
  }
}

function readUserSession() {
  try {
    const serialized = sessionStorage.getItem(sessionKey);
    if (!serialized) return null;
    const session = JSON.parse(serialized);
    return session && session.token && session.user && session.user.email ? session : null;
  } catch (error) {
    catalogStatus.dataset.state = "error";
    catalogStatus.textContent = "Impossible de lire la session utilisateur dans ce navigateur.";
    return null;
  }
}

function getProductId(product) {
  return String(getProductValue(product, "ID", "id", "ID_Produit") || "").trim();
}

function getProductTitle(product) {
  return String(getProductValue(product, "Titre", "Title", "Nom") || "Produit sans titre").trim();
}

function getProductPrice(product) {
  const price = Number(getProductValue(product, "Prix", "Price"));
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function getCurrentCredits() {
  return Math.max(0, Number(currentSession && currentSession.user.credits) || 0);
}

function isPdfProduct(product) {
  const category = String(getProductValue(product, "Categorie", "Category")).toLowerCase();
  const contentType = String(getProductValue(product, "MimeType", "ContentType", "Format")).toLowerCase();
  const title = getProductTitle(product).toLowerCase();
  return category.includes("pdf") ||
    contentType.includes("pdf") ||
    title.endsWith(".pdf");
}

function setCatalogMessage(message, state = "") {
  catalogStatus.textContent = message;
  if (state) catalogStatus.dataset.state = state;
  else delete catalogStatus.dataset.state;
}

function addActionButton(parent, label, className, action, productId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.productId = productId;
  parent.append(button);
  return button;
}

function createProductCard(product) {
  const title = getProductTitle(product);
  const productId = getProductId(product);
  const category = String(getProductValue(product, "Categorie", "Category") || "Général").trim();
  const description = String(getProductValue(product, "Description") || "Découvrez ce produit BENTOUL.").trim();
  const price = getProductPrice(product);
  const likes = Number(getProductValue(product, "Likes"));
  const imageUrl = safeResourceUrl(getProductValue(product, "ImageUrl", "Image"));
  const iconValue = String(getProductValue(product, "Icon") || "");
  const icon = iconValue.startsWith("fa-")
    ? (category.toLocaleLowerCase("fr") === "pdf" ? "PDF" : title.slice(0, 1).toUpperCase())
    : (iconValue || title.slice(0, 1).toUpperCase());
  const alreadyPurchased = purchasedProductIds.has(productId);

  const card = document.createElement("article");
  card.className = "product-card";
  if (productId) card.id = `product-${productId}`;

  const imageWrap = document.createElement("div");
  imageWrap.className = "product-image-wrap";

  const fallback = document.createElement("span");
  fallback.className = "product-image-fallback";
  fallback.textContent = icon.slice(0, 3);
  imageWrap.append(fallback);

  if (imageUrl) {
    const image = document.createElement("img");
    image.className = "product-image";
    image.src = imageUrl;
    image.alt = title;
    image.loading = "lazy";
    image.addEventListener("error", () => image.remove(), { once: true });
    imageWrap.append(image);
  }

  const categoryLabel = document.createElement("span");
  categoryLabel.className = "product-category";
  categoryLabel.textContent = category;
  imageWrap.append(categoryLabel);

  const content = document.createElement("div");
  content.className = "product-content";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const summary = document.createElement("p");
  summary.className = "product-description";
  summary.textContent = description;

  const meta = document.createElement("div");
  meta.className = "product-meta";

  const priceLabel = document.createElement("span");
  priceLabel.className = "product-price";
  priceLabel.textContent = price > 0 ? `${price} crédits` : "Gratuit";
  meta.append(priceLabel);

  if (alreadyPurchased) {
    const ownedLabel = document.createElement("span");
    ownedLabel.className = "product-owned";
    ownedLabel.textContent = "Déjà acquis";
    meta.append(ownedLabel);
  } else if (Number.isFinite(likes) && likes > 0) {
    const likesLabel = document.createElement("span");
    likesLabel.className = "product-likes";
    likesLabel.textContent = `${likes} j’aime`;
    meta.append(likesLabel);
  }

  const actions = document.createElement("div");
  actions.className = "product-actions";
  addActionButton(actions, "Détails", "product-action product-action-primary product-action-details", "details", productId);

  content.append(heading, summary, meta, actions);
  card.append(imageWrap, content);
  return card;
}

function renderProducts(searchTerm = "") {
  const term = searchTerm.trim().toLocaleLowerCase("fr");
  const filteredProducts = catalogProducts.filter((product) => {
    const searchableText = [
      getProductTitle(product),
      getProductValue(product, "Categorie", "Category"),
      getProductValue(product, "Description")
    ].join(" ").toLocaleLowerCase("fr");
    return searchableText.includes(term);
  });

  catalogGrid.replaceChildren();
  if (filteredProducts.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "catalog-empty";
    emptyState.textContent = term
      ? "Aucun produit ne correspond à votre recherche."
      : "Aucun produit n’est disponible pour le moment.";
    catalogGrid.append(emptyState);
    return;
  }

  catalogGrid.append(...filteredProducts.map(createProductCard));
}

function createDialog(className) {
  const dialog = document.createElement("dialog");
  dialog.className = `catalog-dialog ${className}`;
  document.body.append(dialog);
  return dialog;
}

const purchaseDialog = createDialog("purchase-dialog");
purchaseDialog.innerHTML = `
  <div class="dialog-content">
    <h2 id="purchase-dialog-title"></h2>
    <p class="dialog-description" id="purchase-dialog-description"></p>
    <div class="purchase-summary" id="purchase-summary"></div>
    <p class="dialog-message" id="purchase-dialog-message" role="status" aria-live="polite"></p>
    <div class="dialog-actions">
      <button class="dialog-button" id="purchase-cancel" type="button">Annuler</button>
      <button class="dialog-button dialog-button-primary" id="purchase-confirm" type="button">Confirmer le téléchargement</button>
    </div>
  </div>
`;

const previewDialog = createDialog("preview-dialog");
previewDialog.innerHTML = `
  <div class="dialog-content">
    <div class="preview-header">
      <h2 id="preview-title"></h2>
      <button class="dialog-button" id="preview-close" type="button">Fermer</button>
    </div>
    <iframe class="preview-frame" id="preview-frame" title="Aperçu PDF"></iframe>
    <p class="dialog-message">Si l’aperçu ne s’affiche pas, <a class="preview-open-link" id="preview-open-link" target="_blank" rel="noopener noreferrer">ouvrez le PDF dans un nouvel onglet</a>.</p>
  </div>
`;

const detailsPanel = document.createElement("section");
detailsPanel.className = "product-details";
detailsPanel.id = "product-details";
detailsPanel.hidden = true;
detailsPanel.setAttribute("aria-live", "polite");
catalogSection.parentElement.append(detailsPanel);

function getProductById(productId) {
  return catalogProducts.find((product) => getProductId(product) === productId);
}

function showCatalog() {
  catalogSection.hidden = false;
  detailsPanel.hidden = true;
  activeProduct = null;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateSessionCredits(credits) {
  if (!currentSession) return;
  currentSession.user.credits = Number(credits) || 0;
  sessionStorage.setItem(sessionKey, JSON.stringify(currentSession));

  const headerCredits = document.querySelector("#user-credits");
  const sidebarCredits = document.querySelector("#sidebar-credits");
  if (headerCredits) headerCredits.textContent = String(currentSession.user.credits);
  if (sidebarCredits) sidebarCredits.textContent = `${currentSession.user.credits} crédits`;
}

function showProductDetails(product) {
  activeProduct = product;
  catalogSection.hidden = true;
  detailsPanel.hidden = false;
  detailsPanel.replaceChildren();

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "product-action details-back";
  backButton.textContent = "← Retour aux produits";
  backButton.addEventListener("click", showCatalog);

  const layout = document.createElement("div");
  layout.className = "details-layout";

  const imageWrap = document.createElement("div");
  imageWrap.className = "details-image-wrap";

  const imageUrl = safeResourceUrl(getProductValue(product, "ImageUrl", "Image"));
  if (imageUrl) {
    const image = document.createElement("img");
    image.className = "details-image";
    image.src = imageUrl;
    image.alt = getProductTitle(product);
    image.addEventListener("error", () => image.remove(), { once: true });
    imageWrap.append(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "details-image-placeholder";
    placeholder.textContent = "B.";
    imageWrap.append(placeholder);
  }

  const copy = document.createElement("div");
  copy.className = "details-copy";

  const category = document.createElement("span");
  category.className = "product-category";
  category.textContent = String(getProductValue(product, "Categorie", "Category") || "Général");
  category.style.position = "static";
  category.style.display = "inline-block";

  const title = document.createElement("h2");
  title.textContent = getProductTitle(product);

  const description = document.createElement("p");
  description.className = "details-description";
  description.textContent = String(getProductValue(product, "Description") || "Aucune description disponible.");

  const creditPanel = document.createElement("div");
  creditPanel.className = "details-credit-panel";
  const price = getProductPrice(product);
  const creditItems = [
    ["Prix du document", price > 0 ? `${price} crédits` : "Gratuit"],
    ["Crédits restants", currentSession ? `${getCurrentCredits()} crédits` : "Connectez-vous"]
  ];
  creditItems.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "details-credit";
    const itemLabel = document.createElement("span");
    itemLabel.textContent = label;
    const itemValue = document.createElement("strong");
    itemValue.textContent = value;
    item.append(itemLabel, itemValue);
    creditPanel.append(item);
  });

  const actions = document.createElement("div");
  actions.className = "product-actions";
  const productId = getProductId(product);
  const alreadyPurchased = purchasedProductIds.has(productId);
  if (alreadyPurchased) {
    if (isPdfProduct(product)) {
      addActionButton(actions, "Aperçu PDF", "product-action", "preview", productId);
    }
    addActionButton(actions, "Télécharger", "product-action product-action-primary", "download", productId);
    addActionButton(actions, "Partager", "product-action", "share", productId);
  } else {
    addActionButton(
      actions,
      price > 0 ? `Acheter · ${price} crédits` : "Obtenir gratuitement",
      "product-action product-action-primary",
      "purchase",
      productId
    );
  }
  copy.append(category, title, description, creditPanel, actions);
  layout.append(imageWrap, copy);
  detailsPanel.append(backButton, layout);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPdfDocumentPreview(product, fileUrl) {
  previewDialog.querySelector("#preview-title").textContent = getProductTitle(product);
  previewDialog.querySelector("#preview-frame").src = fileUrl;
  previewDialog.querySelector("#preview-open-link").href = fileUrl;
  previewDialog.showModal();
}

async function showPdfPreview(product) {
  if (!isPdfProduct(product)) {
    setCatalogMessage("L’aperçu intégré est disponible uniquement pour les documents PDF.", "error");
    return;
  }
  const productId = getProductId(product);
  if (!purchasedProductIds.has(productId)) {
    setCatalogMessage("Achetez d’abord ce document pour accéder à son aperçu.", "error");
    return;
  }
  if (!currentSession) {
    setCatalogMessage("Connectez-vous au compte qui a acheté ce document.", "error");
    return;
  }

  setCatalogMessage("Ouverture de l’aperçu PDF…");
  try {
    const response = await fetch(catalogApiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getPurchasedProductFile",
        productId: productId,
        email: currentSession.user.email,
        token: currentSession.token
      })
    });
    if (!response.ok) throw new Error(`Le serveur a répondu avec le statut ${response.status}.`);

    const result = await response.json();
    if (!result || result.success !== true) {
      throw new Error(result && result.message ? result.message : "L’accès à ce document a été refusé.");
    }
    const fileUrl = safeResourceUrl(result.fileUrl);
    if (!fileUrl) throw new Error("Aucun lien PDF valide n’est configuré pour ce document.");

    setCatalogMessage(`Aperçu de « ${getProductTitle(product)} » ouvert.`);
    showPdfDocumentPreview(product, fileUrl);
  } catch (error) {
    setCatalogMessage(
      error instanceof TypeError
        ? "Impossible de joindre le serveur pour ouvrir le PDF. Vérifiez votre connexion."
        : (error.message || "Impossible d’ouvrir l’aperçu PDF."),
      "error"
    );
  }
}

async function shareProduct(product) {
  const title = getProductTitle(product);
  const shareUrl = new URL(window.location.href);
  shareUrl.hash = `product-${getProductId(product)}`;

  const shareData = {
    title: title,
    text: `Découvrez « ${title} » sur BENTOUL.`,
    url: shareUrl.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      setCatalogMessage(`Lien de « ${title} » partagé.`);
      return;
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      throw new Error("Le partage et le presse-papiers ne sont pas disponibles dans ce navigateur.");
    }
    await navigator.clipboard.writeText(shareUrl.href);
    setCatalogMessage("Lien du produit copié dans le presse-papiers.");
  } catch (error) {
    if (error && error.name === "AbortError") return;
    setCatalogMessage(error.message || "Impossible de partager ce document.", "error");
  }
}

function updateCreditSummary(summary, price, balance, isLoggedIn, alreadyPurchased = false, purchaseRejected = false) {
  summary.replaceChildren();
  const remaining = alreadyPurchased || purchaseRejected ? balance : Math.max(0, balance - price);
  const rows = [
    ["Prix du document", alreadyPurchased ? "Déjà acquis" : price > 0 ? `${price} crédits` : "Gratuit"],
    ["Crédits restants", isLoggedIn ? `${balance} crédits` : "—"],
    [purchaseRejected ? "Solde conservé" : "Solde après achat", isLoggedIn ? `${remaining} crédits` : "—"]
  ];
  rows.forEach(([label, value], index) => {
    const row = document.createElement("div");
    row.className = `purchase-summary-row${index === rows.length - 1 ? " purchase-summary-row-total" : ""}`;
    const rowLabel = document.createElement("span");
    rowLabel.textContent = label;
    const rowValue = document.createElement("strong");
    rowValue.textContent = value;
    row.append(rowLabel, rowValue);
    summary.append(row);
  });
}

function openPurchaseConfirmation(product, action = "download") {
  const title = getProductTitle(product);
  const price = getProductPrice(product);
  const balance = getCurrentCredits();
  const productId = getProductId(product);
  const alreadyPurchased = purchasedProductIds.has(productId);
  const message = purchaseDialog.querySelector("#purchase-dialog-message");
  const confirmButton = purchaseDialog.querySelector("#purchase-confirm");

  pendingPurchase = product;
  pendingPurchaseAction = action;
  purchaseDialog.querySelector("#purchase-dialog-title").textContent = action === "preview"
    ? "Aperçu du document PDF"
    : action === "purchase" ? "Confirmer l’achat" : "Confirmer le téléchargement";
  purchaseDialog.querySelector("#purchase-dialog-description").textContent = action === "preview"
    ? `L’aperçu de « ${title} » nécessite l’accès au document.`
    : action === "purchase"
      ? `Vous souhaitez acheter « ${title} ». Vérifiez le coût et votre solde avant de confirmer.`
      : `Vous souhaitez télécharger « ${title} ». Vérifiez le coût avant de confirmer.`;
  updateCreditSummary(purchaseDialog.querySelector("#purchase-summary"), price, balance, Boolean(currentSession), alreadyPurchased);
  message.textContent = "";
  message.dataset.state = "";
  confirmButton.disabled = false;
  confirmButton.textContent = action === "preview"
    ? "Confirmer et ouvrir l’aperçu"
    : action === "purchase" ? "Confirmer l’achat" : "Confirmer et télécharger";

  if (!productId) {
    message.textContent = "L’identifiant de ce produit est invalide.";
    message.dataset.state = "error";
    confirmButton.disabled = true;
  } else if (!currentSession) {
    message.textContent = "Connectez-vous depuis le menu latéral pour acheter ou télécharger ce document.";
    confirmButton.disabled = true;
    confirmButton.textContent = "Connexion requise";
  } else if (!alreadyPurchased && purchaseHistoryLoaded && balance < price) {
    message.textContent = `Crédits insuffisants : il vous manque ${price - balance} crédits.`;
    message.dataset.state = "error";
    confirmButton.disabled = true;
    confirmButton.textContent = "Crédits insuffisants";
  } else if (alreadyPurchased) {
    message.textContent = "Ce document est déjà acquis : aucun crédit ne sera débité.";
  }

  purchaseDialog.showModal();
}

function openDownloadUrl(fileUrl) {
  const link = document.createElement("a");
  link.href = fileUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.referrerPolicy = "no-referrer";
  document.body.append(link);
  link.click();
  link.remove();
}

async function confirmProductDownload() {
  if (!pendingPurchase || !currentSession) return;

  const product = pendingPurchase;
  const message = purchaseDialog.querySelector("#purchase-dialog-message");
  const confirmButton = purchaseDialog.querySelector("#purchase-confirm");
  const productId = getProductId(product);
  if (!productId) {
    message.textContent = "L’identifiant de ce produit est invalide.";
    message.dataset.state = "error";
    return;
  }

  const downloadWindow = pendingPurchaseAction === "download"
    ? window.open("about:blank", "_blank")
    : null;
  if (downloadWindow) downloadWindow.opener = null;
  confirmButton.disabled = true;
  purchaseDialog.querySelector("#purchase-cancel").disabled = true;
  confirmButton.textContent = "Vérification des crédits…";
  message.textContent = "Vérification du solde et préparation du document…";
  message.dataset.state = "";

  try {
    const response = await fetch(catalogApiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "buyProduct",
        productId: productId,
        email: currentSession.user.email,
        token: currentSession.token
      })
    });
    if (!response.ok) throw new Error(`Le serveur a répondu avec le statut ${response.status}.`);

    const result = await response.json();
    if (!result || typeof result.success !== "boolean") {
      throw new Error("La réponse du serveur est invalide.");
    }

    if (!result.success) {
      if (downloadWindow) downloadWindow.close();
      if (result.currentCredits !== undefined) updateSessionCredits(result.currentCredits);
      updateCreditSummary(
        purchaseDialog.querySelector("#purchase-summary"),
        Number(result.requiredCredits) || getProductPrice(product),
        getCurrentCredits(),
        true,
        false,
        Boolean(result.insufficientCredits)
      );
      message.textContent = result.message || "Le téléchargement n’a pas pu être autorisé.";
      message.dataset.state = "error";
      confirmButton.disabled = true;
      confirmButton.textContent = result.insufficientCredits ? "Crédits insuffisants" : "Téléchargement indisponible";
      purchaseDialog.querySelector("#purchase-cancel").disabled = false;
      return;
    }

    const authorizedUrl = safeResourceUrl(result.fileUrl);
    if (!authorizedUrl) {
      if (downloadWindow) downloadWindow.close();
      throw new Error("Aucun lien de téléchargement n’est configuré pour ce produit.");
    }

    if (result.newCredits !== undefined) updateSessionCredits(result.newCredits);
    purchasedProductIds.add(productId);
    purchaseHistoryLoaded = true;
    setCatalogMessage(result.message || "Téléchargement autorisé.");
    purchaseDialog.close();
    renderProducts(productSearch.value);
    openSharedProductFromHash();
    if (activeProduct && getProductId(activeProduct) === productId) showProductDetails(product);
    if (pendingPurchaseAction === "preview") {
      showPdfDocumentPreview(product, authorizedUrl);
    } else if (pendingPurchaseAction === "purchase") {
      setCatalogMessage(`« ${getProductTitle(product)} » est maintenant disponible dans votre compte.`);
    } else if (downloadWindow) {
      downloadWindow.location.replace(authorizedUrl);
    } else {
      openDownloadUrl(authorizedUrl);
    }
  } catch (error) {
    if (downloadWindow) downloadWindow.close();
    message.textContent = error instanceof TypeError
      ? "Impossible de joindre le serveur d’achat. Vérifiez votre connexion Internet."
      : (error.message || "Une erreur est survenue lors de l’achat.");
    message.dataset.state = "error";
    confirmButton.disabled = false;
    confirmButton.textContent = "Réessayer";
    purchaseDialog.querySelector("#purchase-cancel").disabled = false;
  }
}

function handleProductAction(event) {
  const button = event.target.closest("[data-action][data-product-id]");
  if (!button) return;

  const product = getProductById(button.dataset.productId);
  if (!product) {
    setCatalogMessage("Produit introuvable dans la liste affichée.", "error");
    return;
  }

  switch (button.dataset.action) {
    case "details":
      showProductDetails(product);
      break;
    case "preview":
      showPdfPreview(product);
      break;
    case "download":
      openPurchaseConfirmation(product);
      break;
    case "purchase":
      openPurchaseConfirmation(product, "purchase");
      break;
    case "share":
      shareProduct(product);
      break;
    default:
      setCatalogMessage("Action produit inconnue.", "error");
  }
}

async function loadPurchaseHistory() {
  if (!currentSession || !catalogApiUrl) return;

  const endpoint = new URL(catalogApiUrl);
  endpoint.searchParams.set("action", "getPurchases");
  endpoint.searchParams.set("email", currentSession.user.email);
  endpoint.searchParams.set("token", currentSession.token);

  const response = await fetch(endpoint.href);
  if (!response.ok) throw new Error(`Historique d’achats : le serveur a répondu avec le statut ${response.status}.`);
  const result = await response.json();
  if (!result || result.success !== true || !Array.isArray(result.purchases)) {
    throw new Error(result && result.message ? result.message : "L’historique des achats est invalide.");
  }

  purchasedProductIds = new Set(
    result.purchases.map((purchase) => String(purchase.idProduit || purchase.ID_Produit || "").trim()).filter(Boolean)
  );
  purchaseHistoryLoaded = true;
}

async function syncCatalogSession() {
  currentSession = readUserSession();
  purchasedProductIds = new Set();
  purchaseHistoryLoaded = false;

  if (currentSession) {
    try {
      await loadPurchaseHistory();
    } catch (error) {
      setCatalogMessage(`Session active, mais ${error.message}`, "error");
    }
  }

  renderProducts(productSearch.value);
  if (activeProduct) showProductDetails(activeProduct);
}

async function loadProducts() {
  if (!catalogApiUrl) {
    setCatalogMessage("L’URL de l’API Apps Script n’est pas configurée.", "error");
    catalogGrid.setAttribute("aria-busy", "false");
    return;
  }

  try {
    const endpoint = new URL(catalogApiUrl);
    endpoint.searchParams.set("action", "getProducts");
    endpoint.searchParams.set("sheet", "produits");

    const response = await fetch(endpoint.href);
    if (!response.ok) throw new Error(`Le serveur a répondu avec le statut ${response.status}.`);
    const result = await response.json();
    if (!result || result.success !== true || !Array.isArray(result.products)) {
      throw new Error(result && result.message ? result.message : "La réponse de l’API ne contient pas de liste de produits valide.");
    }

    catalogProducts = result.products;
    if (currentSession) {
      try {
        await loadPurchaseHistory();
      } catch (error) {
        setCatalogMessage(`Produits chargés, mais ${error.message}`, "error");
      }
    }

    const count = catalogProducts.length;
    if (catalogStatus.dataset.state !== "error") {
      setCatalogMessage(`${count} produit${count === 1 ? "" : "s"} disponible${count === 1 ? "" : "s"}`);
    }
    renderProducts(productSearch.value);
    openSharedProductFromHash();
  } catch (error) {
    setCatalogMessage(
      error instanceof TypeError
        ? "Impossible de charger les produits. Vérifiez votre connexion et l’accès à l’API Apps Script."
        : (error.message || "Une erreur est survenue lors du chargement des produits."),
      "error"
    );
  } finally {
    catalogGrid.setAttribute("aria-busy", "false");
  }
}

productSearch.addEventListener("input", () => renderProducts(productSearch.value));
catalogGrid.addEventListener("click", handleProductAction);
detailsPanel.addEventListener("click", handleProductAction);
window.addEventListener("hashchange", openSharedProductFromHash);
window.addEventListener("bcreation-session-changed", syncCatalogSession);
purchaseDialog.querySelector("#purchase-cancel").addEventListener("click", () => purchaseDialog.close());
purchaseDialog.querySelector("#purchase-confirm").addEventListener("click", confirmProductDownload);
previewDialog.querySelector("#preview-close").addEventListener("click", () => previewDialog.close());
previewDialog.addEventListener("close", () => {
  previewDialog.querySelector("#preview-frame").src = "about:blank";
});
loadProducts();
