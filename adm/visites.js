(() => {
  const API_URL = window.BENTOUL_ANALYTICS_API_URL;
  const SESSION_KEY = "bentoul-analytics-admin-session";
  const loginPanel = document.getElementById("login-panel");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const dashboard = document.getElementById("dashboard");
  const dashboardStatus = document.getElementById("dashboard-status");
  const periodSelect = document.getElementById("period");
  let adminSession = null;

  async function request(payload) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Le serveur a répondu avec le statut ${response.status}.`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "La demande a échoué.");
    return result;
  }

  function setStatus(element, message) {
    element.textContent = message;
  }

  function renderRows(target, rows, columns, emptyMessage) {
    target.replaceChildren();
    if (!rows.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = columns;
      cell.textContent = emptyMessage;
      row.append(cell);
      target.append(row);
      return;
    }
    rows.forEach(values => {
      const row = document.createElement("tr");
      values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.append(cell);
      });
      target.append(row);
    });
  }

  function renderDailyChart(days) {
    const chart = document.getElementById("daily-chart");
    chart.replaceChildren();
    const maxViews = Math.max(1, ...days.map(day => day.views));
    days.forEach(day => {
      const row = document.createElement("div");
      row.className = "chart-row";
      const label = document.createElement("span");
      label.textContent = new Date(`${day.date}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      const track = document.createElement("div");
      track.className = "bar-track";
      track.setAttribute("aria-label", `${day.views} pages vues`);
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.width = `${(day.views / maxViews) * 100}%`;
      track.append(bar);
      const total = document.createElement("span");
      total.textContent = String(day.views);
      row.append(label, track, total);
      chart.append(row);
    });
  }

  async function loadAnalytics() {
    if (!adminSession) return;
    setStatus(dashboardStatus, "Chargement des statistiques…");
    try {
      const data = await request({
        action: "getSiteAnalytics",
        email: adminSession.email,
        dashboardToken: adminSession.token,
        period: periodSelect.value
      });
      document.getElementById("total-views").textContent = data.views.toLocaleString("fr-FR");
      document.getElementById("unique-visitors").textContent = data.uniqueVisitors.toLocaleString("fr-FR");
      document.getElementById("top-page").textContent = data.pages[0]?.page || "Aucune visite";
      renderDailyChart(data.daily || []);
      renderRows(document.getElementById("pages-table"),
        (data.pages || []).map(item => [item.page, item.views, item.uniqueVisitors]), 3, "Aucune visite enregistrée.");
      renderRows(document.getElementById("referrers-table"),
        (data.referrers || []).map(item => [item.referrer, item.visits]), 2, "Aucune origine enregistrée.");
      setStatus(dashboardStatus, "");
    } catch (error) {
      console.error(error);
      setStatus(dashboardStatus, `Erreur : ${error.message}`);
    }
  }

  async function restoreSession() {
    try {
      adminSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (error) {
      console.error("La session des statistiques est illisible.", error);
      sessionStorage.removeItem(SESSION_KEY);
    }
    if (!adminSession?.email || !adminSession?.token) return;
    loginPanel.hidden = true;
    dashboard.hidden = false;
    await loadAnalytics();
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    setStatus(loginStatus, "Vérification des identifiants…");
    try {
      const result = await request({
        action: "dashboardAuth",
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value
      });
      adminSession = { email: document.getElementById("email").value.trim().toLowerCase(), token: result.token };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminSession));
      loginPanel.hidden = true;
      dashboard.hidden = false;
      await loadAnalytics();
    } catch (error) {
      console.error(error);
      setStatus(loginStatus, `Erreur : ${error.message}`);
    }
  });

  periodSelect.addEventListener("change", loadAnalytics);
  document.getElementById("logout").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    adminSession = null;
    dashboard.hidden = true;
    loginPanel.hidden = false;
  });

  if (!API_URL) {
    loginForm.querySelector("button[type=submit]").disabled = true;
    setStatus(loginStatus, "L’URL de l’API de statistiques n’est pas configurée.");
  } else {
    restoreSession();
  }
})();
