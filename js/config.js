
window.APP_CONFIG = {
  APP_NAME: "BENTOUL CREATION",
  API_URL: "https://script.google.com/macros/s/AKfycbzOyxfS9zCr-czSm3wSuXTiiyuImxuPys2HrTambNkY9NuFyS8XpbI5JZON58pu_Cdz/exec"
};

window.apiRequest = async function (payload, method = "POST") {
  const url = window.APP_CONFIG.API_URL;

  if (!url || url.includes("COLLE_ICI")) {
    throw new Error("Configure l'URL Apps Script dans js/config.js.");
  }

  let requestUrl = url;
  const options = { method };

  if (method === "GET") {
    const params = new URLSearchParams(payload);
    requestUrl += (url.includes("?") ? "&" : "?") + params.toString();
  } else {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(requestUrl, options);

  if (!response.ok) {
    throw new Error("Le serveur a répondu avec une erreur.");
  }

  const result = await response.json();

  if (result.status === "error") {
    throw new Error(result.message || "Une erreur est survenue.");
  }

  return result;
};
