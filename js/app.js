
(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  let currentUser = null;

  try {
    currentUser = JSON.parse(sessionStorage.getItem("bentoulUser") || "null");
  } catch {
    currentUser = null;
  }

  // HEADER
  $("#app-header").innerHTML = `
    <header class="app-header">
      <button id="menu-toggle" class="icon-btn"
        type="button" aria-label="Ouvrir le menu">☰</button>

      <a href="#" class="brand" data-page="home">
        BENTOUL <span>CREATION</span>
      </a>

      <button class="icon-btn" type="button" data-page="profile"
        aria-label="Mon profil">👤</button>
    </header>
  `;

  // SIDEBAR
  $("#app-sidebar").innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

    <nav class="sidebar-panel" aria-label="Menu principal">
      <div class="sidebar-brand">BENTOUL CREATION</div>

      <button type="button" data-page="home">⌂ Accueil</button>
      <button type="button" data-page="series">▤ Séries</button>

      <button type="button" data-page="auth" data-guest-only>
        ♙ Connexion / Inscription
      </button>

      <button type="button" data-page="profile">
        ◎ Mon profil
      </button>

      <button type="button" id="sidebar-logout" data-user-only hidden>
        ↪ Déconnexion
      </button>
    </nav>
  `;

  // FOOTER
  $("#app-footer").innerHTML = `
    <nav class="bottom-nav" aria-label="Navigation principale">
      <button type="button" data-page="home" class="nav-item active">
        ⌂<span>Accueil</span>
      </button>

      <button type="button" data-page="series" class="nav-item">
        ▤<span>Séries</span>
      </button>

      <button type="button" data-page="auth" class="nav-item" data-guest-only>
        ♙<span>Compte</span>
      </button>

      <button type="button" data-page="profile" class="nav-item">
        ◎<span>Profil</span>
      </button>
    </nav>
  `;

  // Affichage selon l'état de connexion.
  function updateAuthUI(user) {
    currentUser = user || null;

    document.body.classList.toggle("user-connected", !!currentUser);

    document.querySelectorAll("[data-guest-only]").forEach((element) => {
      element.hidden = !!currentUser;
    });

    document.querySelectorAll("[data-user-only]").forEach((element) => {
      element.hidden = !currentUser;
    });

    document.querySelectorAll(".nav-item").forEach((element) => {
      element.classList.toggle(
        "active",
        element.dataset.page === getCurrentPage()
      );
    });
  }

  function getCurrentPage() {
    const activePage = $(".page.active");
    return activePage ? activePage.id.replace("page-", "") : "home";
  }

  window.updateAuthUI = updateAuthUI;
  window.getCurrentUser = () => currentUser;

  // Messages de l'application.
  window.showMessage = function (message, isError = false) {
    const element = $("#app-message");
    if (!element) return;

    element.textContent = String(message ?? "");
    element.classList.toggle("error", isError);
    element.classList.add("visible");

    if (!message) element.classList.remove("visible");
  };

  // Navigation entre les pages.
  window.navigateTo = function (page) {
    // Un utilisateur connecté n'a pas besoin de rouvrir le formulaire.
    if (page === "auth" && currentUser) {
      page = "profile";
    }

    const target = $("#page-" + page);

    if (!target) {
      window.showMessage("Cette page n'existe pas.", true);
      return;
    }

    document.querySelectorAll(".page").forEach((section) => {
      section.classList.toggle("active", section === target);
    });

    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.page === page);
    });

    $("#app-sidebar").classList.remove("open");

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (page === "series" && window.loadSeries) {
      window.loadSeries();
    }

    if (page === "profile" && window.renderProfile) {
      window.renderProfile();
    }
  };

  // Gestion centralisée des boutons de navigation.
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button) return;

    event.preventDefault();
    window.navigateTo(button.dataset.page);
  });

  // Menu latéral.
  $("#menu-toggle").addEventListener("click", () => {
    $("#app-sidebar").classList.toggle("open");
  });

  $("#sidebar-backdrop").addEventListener("click", () => {
    $("#app-sidebar").classList.remove("open");
  });

  // Onglets Connexion / Inscription.
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const isRegister = button.dataset.authTab === "register";
      const loginForm = $("#login-form");
      const registerForm = $("#register-form");

      if (!loginForm || !registerForm) return;

      loginForm.hidden = isRegister;
      registerForm.hidden = !isRegister;

      document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
        tab.classList.toggle("active", tab === button);
      });
    });
  });

  // Déconnexion.
  function logout() {
    currentUser = null;
    sessionStorage.removeItem("bentoulUser");

    updateAuthUI(null);

    if (window.renderProfile) {
      window.renderProfile();
    }

    window.navigateTo("home");
    window.showMessage("Tu es déconnecté.");
  }

  $("#sidebar-logout").addEventListener("click", logout);

  // Initialisation.
  updateAuthUI(currentUser);
  window.navigateTo("home");
})();
