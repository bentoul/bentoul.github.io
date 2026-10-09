document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  app.innerHTML = `
    <header class="app-header">
      <button class="menu-button" id="menuBtn" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="sideMenu">
        <span aria-hidden="true">☰</span>
      </button>
      <a class="app-title" href="#accueil">Mon Application</a>
    </header>

    <button class="menu-overlay" id="menuOverlay" type="button" aria-label="Fermer le menu" tabindex="-1"></button>
    <nav class="side-menu" id="sideMenu" aria-label="Navigation principale" aria-hidden="true" inert>
      <a href="#accueil"><span aria-hidden="true">🏠</span> Accueil</a>
      <a href="#bibliotheque"><span aria-hidden="true">📚</span> Bibliothèque</a>
      <a href="#profil"><span aria-hidden="true">👤</span> Profil</a>
    </nav>

    <footer>
      <button>Accueil</button>
      <button>Boutique</button>
      <button>Histoire</button>
      <button>Aide</button>
    </footer>
  `;

  const menuButton = document.getElementById("menuBtn");
  const sideMenu = document.getElementById("sideMenu");
  const menuOverlay = document.getElementById("menuOverlay");

  const setMenuOpen = (isOpen) => {
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
    sideMenu.setAttribute("aria-hidden", String(!isOpen));
    sideMenu.inert = !isOpen;
    document.body.classList.toggle("menu-open", isOpen);

    if (isOpen) {
      sideMenu.querySelector("a").focus();
    } else {
      menuButton.focus();
    }
  };

  menuButton.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });
  menuOverlay.addEventListener("click", () => setMenuOpen(false));
  sideMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setMenuOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
    }
  });
});