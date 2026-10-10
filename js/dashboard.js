/* Dashboard Bentoul - logique de l'administration ----------------------- */

const API = "https://script.google.com/macros/s/AKfycbzAX4YuzRIx8OxWMd5ggA-Lu_Ou1AaVeBAfKlgxGtQ5DpaOiu0ODT_WmdARaVLZj8en/exec";
const $ = (selector) => document.querySelector(selector);

// Champs utilisés par chaque collection du dashboard.
const definitions = {
  astuces: {
    label: "Astuces",
    fields: [["ID", "Identifiant"], ["TITRE", "Titre"], ["SHORT_DESCRIPTION", "Résumé"], ["DESCRIPTION", "Description", "textarea"], ["TYPE", "Type"], ["URLIMAGE", "Image"], ["URLVIDEO", "Vidéo"], ["URLREDIRECTION", "Lien"]]
  },
  histoire: {
    label: "Histoire",
    fields: [["ID", "Identifiant"], ["TITRE", "Titre"], ["SOUS_TITRE", "Sous-titre"], ["CONTNUE", "Contenu", "textarea"], ["TYPE", "Type"], ["URLREDIRECTION", "Lien"], ["URLAUDIO", "Audio"], ["URLVIDEO", "Vidéo"]]
  },
  boutique: {
    label: "Boutique",
    fields: [["ID", "Identifiant"], ["TITREQ", "Titre"], ["DESCRIPTION", "Description", "textarea"], ["IMAGE", "Image"], ["URDOENLOAD", "Lien de téléchargement"], ["CREDITS", "Crédits", "number"], ["TYPE", "Type"]]
  }
};

// Etat de l'interface.
let data = { astuces: [], histoire: [], boutique: [], messages: [] };
let tab = "astuces";
let editing = null;

// -------------------------------------------------------------------------
// Utilitaires et communication avec Google Apps Script
// -------------------------------------------------------------------------
function text(value) { return String(value ?? ""); }

function username() {
  return $("#adminUsername").value.trim() || localStorage.getItem("devmaster_username") || "";
}

function say(message, error = false) {
  $("#status").textContent = message;
  $("#status").style.color = error ? "#b91c1c" : "";
}

function createId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function api(url, options) {
  const response = await fetch(url, options);
  const output = await response.json();
  if (!response.ok || output.status !== "success") throw new Error(output.message || "Erreur serveur");
  return output;
}

async function load() {
  try {
    say("Chargement…");
    const output = await api(`${API}?action=getDashboard&username=${encodeURIComponent(username())}`);
    data = {
      astuces: output.astuces || [],
      histoire: output.histoire || [],
      boutique: output.boutique || [],
      messages: output.messages || []
    };
    localStorage.setItem("devmaster_username", username());
    render();
    say("Données chargées.");
  } catch (error) {
    say(error.message, true);
  }
}

// -------------------------------------------------------------------------
// Rendu de la liste, des messages et du formulaire
// -------------------------------------------------------------------------
function render() {
  renderList();
  renderForm();
}

function renderList() {
  const list = $("#list");
  $("#listTitle").textContent = tab === "messages" ? "Messages clients" : definitions[tab].label;
  list.replaceChildren();

  if (!data[tab].length) {
    list.innerHTML = "<div class=\"empty\">Aucun élément.</div>";
    return;
  }

  data[tab].forEach((item) => list.appendChild(createListRow(item)));
}

function createListRow(item) {
  const row = document.createElement("article");
  row.className = tab === "messages" ? "row message" : "row";

  if (tab === "messages") {
    const head = document.createElement("div");
    head.className = "message-head";
    head.innerHTML = "<strong></strong><span class=\"badge\"></span>";
    head.querySelector("strong").textContent = `${item.NOM || item.USERNAME || "Visiteur"} · ${item.EMAIL || ""}`;
    head.querySelector("span").textContent = item.STATUT || "NOUVEAU";
    if (item.STATUT === "RÉPONDU") head.querySelector("span").classList.add("done");

    const message = document.createElement("div");
    message.className = "message-text";
    message.textContent = item.MESSAGE || "";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = item.REPONSE ? `Réponse : ${item.REPONSE}` : "";

    const actions = document.createElement("div");
    actions.className = "actions";
    const reply = createButton("Répondre", "btn primary", () => showReply(item));
    actions.appendChild(reply);
    row.append(head, message, meta, actions);
    return row;
  }

  const title = document.createElement("div");
  title.innerHTML = "<strong></strong><span class=\"meta\"></span>";
  title.querySelector("strong").textContent = item.TITRE || item.TITREQ || item.ID || "Sans titre";
  title.querySelector(".meta").textContent = `${item.TYPE || ""} · ligne ${item.row}`;

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(
    createButton("Modifier", "btn", () => editItem(item)),
    createButton("Supprimer", "btn danger", () => deleteItem(item))
  );
  row.append(title, actions);
  return row;
}

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function editorKey() {
  return tab === "histoire" ? "CONTNUE" : "DESCRIPTION";
}

function renderForm() {
  const form = $("#editorForm");
  const replyBox = $("#replyBox");
  const editor = $("#richEditor");

  if (tab === "messages") {
    form.classList.add("hidden");
    replyBox.classList.remove("hidden");
    replyBox.innerHTML = "<div class=\"empty\">Sélectionnez un message pour répondre.</div>";
    return;
  }

  form.classList.remove("hidden");
  replyBox.classList.add("hidden");
  $("#formTitle").textContent = editing ? "Modifier une ressource" : "Ajouter une ressource";
  editor.innerHTML = editing ? text(editing[editorKey()]) : "";

  const fields = $("#formFields");
  fields.replaceChildren();
  definitions[tab].fields.forEach(([key, label, type]) => {
    if (key === editorKey()) return;
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    const fieldLabel = document.createElement("label");
    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    fieldLabel.textContent = label;
    input.name = key;
    input.type = type || "text";
    input.value = editing ? text(editing[key]) : key === "ID" ? createId() : "";
    if (key === "ID") input.readOnly = true;
    wrapper.append(fieldLabel, input);
    fields.appendChild(wrapper);
  });
}

// -------------------------------------------------------------------------
// Actions CRUD et réponse aux messages
// -------------------------------------------------------------------------
function editItem(item) {
  editing = item;
  renderForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteItem(item) {
  if (!confirm("Supprimer cette ressource ?")) return;
  try {
    await api(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "dashboardDelete", username: username(), collection: tab, row: item.row })
    });
    say("Ressource supprimée.");
    await load();
  } catch (error) {
    say(error.message, true);
  }
}

function showReply(item) {
  $("#replyBox").classList.remove("hidden");
  $("#editorForm").classList.add("hidden");
  $("#formTitle").textContent = "Répondre au client";

  const box = document.createElement("div");
  box.className = "message";
  box.innerHTML = "<div class=\"meta\"></div><textarea class=\"reply\" placeholder=\"Votre réponse…\"></textarea><div class=\"form-actions\"><button class=\"btn primary\" type=\"button\">Envoyer la réponse</button></div>";
  box.querySelector(".meta").textContent = `${item.NOM || item.USERNAME || "Visiteur"} · ${item.EMAIL || ""}`;
  box.querySelector("textarea").value = item.REPONSE || "";
  box.querySelector("button").addEventListener("click", async () => {
    try {
      await api(API, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "supportReply", username: username(), row: item.row, reply: box.querySelector("textarea").value })
      });
      say("Réponse enregistrée.");
      await load();
    } catch (error) {
      say(error.message, true);
    }
  });
  $("#replyBox").replaceChildren(box);
}

// -------------------------------------------------------------------------
// Panneaux coulissants et sélection de collection
// -------------------------------------------------------------------------
const listPanel = $("#listPanel");
const editorSidebar = $("#editorSidebar");
const drawerBackdrop = $("#drawerBackdrop");

function closeDrawers() {
  listPanel.classList.remove("open");
  editorSidebar.classList.remove("open");
  drawerBackdrop.classList.remove("open");
  $("#listOpenBtn").setAttribute("aria-expanded", "false");
  $("#optionsBtn").setAttribute("aria-expanded", "false");
}

function openList() {
  if (listPanel.classList.contains("open")) {
    closeDrawers();
    return;
  }
  editorSidebar.classList.remove("open");
  listPanel.classList.add("open");
  drawerBackdrop.classList.add("open");
  $("#listOpenBtn").setAttribute("aria-expanded", "true");
  $("#optionsBtn").setAttribute("aria-expanded", "false");
}

function openOptions() {
  if (editorSidebar.classList.contains("open")) {
    closeDrawers();
    return;
  }
  listPanel.classList.remove("open");
  editorSidebar.classList.add("open");
  drawerBackdrop.classList.add("open");
  $("#listOpenBtn").setAttribute("aria-expanded", "false");
  $("#optionsBtn").setAttribute("aria-expanded", "true");
}

function setupNavigation() {
  const select = $("#collectionSelect");
  select.addEventListener("change", () => {
    tab = select.value;
    editing = null;
    render();
  });
  $("#listOpenBtn").addEventListener("click", openList);
  $("#optionsBtn").addEventListener("click", openOptions);
  $("#listCloseBtn").addEventListener("click", closeDrawers);
  drawerBackdrop.addEventListener("click", closeDrawers);
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      tab = button.dataset.tab;
      select.value = tab;
      editing = null;
      document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === button));
      render();
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawers();
  });
}

// -------------------------------------------------------------------------
// Barre d'outils de l'éditeur riche
// -------------------------------------------------------------------------
function toolbarButton(command) {
  return $(`#editorToolbar [data-command="${command}"]`);
}

function toolbarGroup(label, nodes) {
  const group = document.createElement("div");
  group.className = "toolbar-group";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", label);
  nodes.filter(Boolean).forEach((node) => group.appendChild(node));
  return group;
}

function setupToolbar() {
  const toolbar = $("#editorToolbar");
  const listButton = createButton("Liste", "btn list-toggle", openList);
  listButton.title = "Ouvrir la liste des contenus";
  const collectionSelect = $("#collectionSelect");
  const formatSelect = toolbar.querySelector('[data-command="formatBlock"]');
  const fontSelect = document.createElement("select");
  const sizeSelect = document.createElement("select");

  fontSelect.className = "font-select";
  fontSelect.dataset.command = "fontName";
  fontSelect.title = "Police";
  ["Arial", "Georgia", "Verdana", "Tahoma", "Courier New", "Times New Roman"].forEach((font) => fontSelect.add(new Option(font, font)));

  sizeSelect.className = "size-select";
  sizeSelect.dataset.command = "fontSize";
  sizeSelect.title = "Taille";
  [["Petit", "12px"], ["Normal", "14px"], ["Moyen", "16px"], ["Grand", "18px"], ["Très grand", "24px"], ["Titre", "32px"]].forEach(([label, value]) => sizeSelect.add(new Option(label, value)));

  const colors = document.createElement("div");
  colors.className = "color-palette";
  colors.title = "Couleur du texte";
  ["#111827", "#dc2626", "#d97706", "#16a34a", "#2563eb", "#7c3aed", "#db2777", "#ffffff"].forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.title = `Couleur ${color}`;
    button.style.backgroundColor = color;
    button.addEventListener("click", () => applyEditorStyle("foreColor", color));
    colors.appendChild(button);
  });

  toolbar.replaceChildren(
    toolbarGroup("Navigation", [listButton, collectionSelect]),
    toolbarGroup("Format du texte", [formatSelect, fontSelect, sizeSelect, toolbarButton("bold"), toolbarButton("italic"), toolbarButton("underline"), toolbarButton("strikeThrough"), toolbarButton("clearFormatting")]),
    toolbarGroup("Couleur", [colors]),
    toolbarGroup("Listes", [toolbarButton("insertUnorderedList"), toolbarButton("insertOrderedList")]),
    toolbarGroup("Alignement", [toolbarButton("justifyLeft"), toolbarButton("justifyCenter"), toolbarButton("justifyRight")]),
    toolbarGroup("Insertion", [toolbarButton("createLink"), toolbarButton("insertImage")]),
    toolbarGroup("Historique", [toolbarButton("undo"), toolbarButton("redo")])
  );

  formatSelect.replaceChildren(...[["Paragraphe", "p"], ["Titre 1", "h1"], ["Titre 2", "h2"], ["Titre 3", "h3"], ["Titre 4", "h4"], ["Titre 5", "h5"], ["Titre 6", "h6"], ["Citation", "blockquote"]].map(([label, value]) => new Option(label, value)));
  toolbar.querySelectorAll("[data-command]").forEach((control) => {
    // Ne pas bloquer le clic natif des listes déroulantes.
    if (control.tagName !== "SELECT") {
      control.addEventListener("mousedown", (event) => event.preventDefault());
    }
    control.addEventListener(control.tagName === "SELECT" ? "change" : "click", () => handleEditorCommand(control));
  });
}

function handleEditorCommand(control) {
  if (control.dataset.command === "clearFormatting") {
    clearEditorFormatting();
    return;
  }
  if (["fontName", "fontSize"].includes(control.dataset.command)) return applyEditorStyle(control.dataset.command, control.value);
  if (control.dataset.command === "formatBlock") {
    $("#richEditor").focus();
    document.execCommand("formatBlock", false, control.value);
    $("#richEditor").innerHTML = cleanEditorMarkup($("#richEditor").innerHTML);
    return;
  }
  runEditorCommand(control.dataset.command);
}

// Remplace le contenu riche par du texte brut en conservant les retours à la ligne.
function clearEditorFormatting() {
  const editor = $("#richEditor");
  const plainText = editor.innerText.replace(/\r\n/g, "\n");
  editor.textContent = plainText;
  editor.focus();
}

// -------------------------------------------------------------------------
// Nettoyage et formatage du contenu HTML de l'éditeur
// -------------------------------------------------------------------------
const allowedFontSizes = ["12px", "14px", "16px", "18px", "24px", "32px"];

function cleanEditorMarkup(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  holder.querySelectorAll("font").forEach((font) => {
    const span = document.createElement("span");
    if (font.getAttribute("face")) span.style.fontFamily = font.getAttribute("face");
    if (font.getAttribute("color")) span.style.color = font.getAttribute("color");
    if (font.getAttribute("size")) span.style.fontSize = allowedFontSizes[Math.min(Number(font.getAttribute("size")) || 3, allowedFontSizes.length) - 1];
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
  holder.querySelectorAll("[style]").forEach((node) => {
    if (node.style.fontSize && !allowedFontSizes.includes(node.style.fontSize)) node.style.removeProperty("font-size");
    if (node.style.fontFamily) node.style.fontFamily = node.style.fontFamily.replace(/["']/g, "");
    if (!node.getAttribute("style")?.trim()) node.removeAttribute("style");
  });
  holder.querySelectorAll("*").forEach((node) => {
    if (!node.textContent.trim() && !node.querySelector("img,br,video,iframe")) node.remove();
  });
  return holder.innerHTML.trim();
}

function applyEditorStyle(command, value) {
  const editor = $("#richEditor");
  editor.focus();
  document.execCommand("styleWithCSS", false, true);
  if (command === "fontSize") {
    document.execCommand("fontSize", false, "7");
    editor.querySelectorAll('font[size="7"]').forEach((node) => { node.style.fontSize = value; node.removeAttribute("size"); });
  } else {
    document.execCommand(command, false, value);
  }
  editor.innerHTML = cleanEditorMarkup(editor.innerHTML);
}

function runEditorCommand(command) {
  const editor = $("#richEditor");
  editor.focus();
  if (command === "createLink") {
    const url = prompt("URL du lien :", "https://");
    if (url) document.execCommand("createLink", false, url);
  } else if (command === "insertImage") {
    const url = prompt("URL de l'image :", "https://");
    if (url) document.execCommand("insertImage", false, url);
  } else {
    document.execCommand(command, false, null);
  }
  editor.innerHTML = cleanEditorMarkup(editor.innerHTML);
}

// -------------------------------------------------------------------------
// Enregistrement et initialisation
// -------------------------------------------------------------------------
$("#editorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.target));
  values[editorKey()] = cleanEditorMarkup($("#richEditor").innerHTML);
  try {
    await api(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "dashboardSave", username: username(), collection: tab, row: editing ? editing.row : 0, values }) });
    editing = null;
    say("Ressource enregistrée.");
    await load();
  } catch (error) {
    say(error.message, true);
  }
});

$("#cancelBtn").addEventListener("click", () => { editing = null; renderForm(); });
$("#refreshBtn").addEventListener("click", load);
$("#adminUsername").value = localStorage.getItem("devmaster_username") || "";
setupNavigation();
setupToolbar();
render();
