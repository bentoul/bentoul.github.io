const API_URL = (window.APP_CONFIG && window.APP_CONFIG.apiUrl || "https://script.google.com/macros/s/AKfycbxUu3Fy_VKO7qcNrVYwH3p79OY7mrklGlV0uW3YyctQtOeA2CyiagR4sAHe-IUbzFWhNw/exec").trim();
const SESSION_KEY = "bcreation-user-session";
const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="24" fill="#e2e8f0"/><circle cx="24" cy="18" r="8" fill="#94a3b8"/><path d="M8 44c1-9 7-14 16-14s15 5 16 14" fill="#94a3b8"/></svg>'
)}`;
const homeContent = document.querySelector("#accueil")?.innerHTML || "";

const styles = `
  :root {
    color-scheme: light;
    font-family: Arial, Helvetica, sans-serif;
    color: #172033;
    background: #f4f6fa;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    padding: 56px 0 56px;
  }

  .header {
    position: fixed;
    z-index: 20;
    top: 0;
    left: 50%;
    width: 60%;
    min-height: 56px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.1rem;
    padding: 0.4rem 1.25rem;
    color: #172033;
    background: #fff;
    border-bottom: 1px solid #e8edf4;
    box-shadow: 0 4px 18px rgb(15 23 42 / 5%);
  }

  .brand {
    margin: 0;
    color: #111827;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    white-space: nowrap;
  }

  .sidebar-close,
  .sidebar-backdrop {
    display: none;
  }

  .menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    padding: 0;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    color: #334155;
    background: #fff;
    font: inherit;
    cursor: pointer;
    transition: color 150ms ease, background 150ms ease, border-color 150ms ease;
  }

  .menu-toggle:hover {
    color: #1d4ed8;
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .menu-toggle:focus-visible {
    outline: 3px solid rgb(59 130 246 / 25%);
    outline-offset: 2px;
  }

  .header p {
    margin: 0;
    color: #64748b;
    font-size: 0.875rem;
  }

  .account-summary {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-left: auto;
  }

  .account-name {
    color: #334155;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .credits-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.65rem;
    border: 1px solid #fed7aa;
    border-radius: 999px;
    color: #c2410c;
    background: #fff7ed;
    font-size: 0.8rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .credits-badge svg {
    width: 16px;
    height: 16px;
    color: #ea580c;
  }

  .location-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    color: #64748b;
    background: #f8fafc;
  }

  .location-badge svg {
    width: 15px;
    height: 15px;
  }

  .location-badge {
    border: 0;
    background: transparent;
  }

  /* Sidebar user summary */
  .sidebar-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid #eef2f7;
    margin-bottom: 0.75rem;
  }

  .sidebar-avatar {
    width: 48px;
    height: 48px;
    border-radius: 999px;
    object-fit: cover;
    background: #e2e8f0;
  }

  .sidebar-user-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .sidebar-user-name {
    font-weight: 700;
    color: #0f172a;
  }

  .sidebar-user-email {
    font-size: 0.85rem;
    color: #64748b;
  }

  .sidebar-user-credits {
    margin-left: auto;
    color: #c2410c;
    font-weight: 700;
  }

  .auth-action {
    width: 100%;
    min-height: 44px;
    border: 0;
    border-radius: 0.6rem;
    background: #1d4ed8;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }

  .layout {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    width: 60%;
    min-height: calc(100vh - 112px);
    margin: 0 auto;
  }

  .layout.sidebar-collapsed {
    grid-template-columns: minmax(0, 1fr);
  }

  .layout.sidebar-collapsed .sidebar {
    display: none;
  }

  .sidebar {
    padding: 1.5rem 1rem;
    background: #fff;
    border-right: 1px solid #e2e8f0;
  }

  .sidebar h2 {
    margin: 0 0 1rem;
    color: #64748b;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sidebar nav {
    display: grid;
    gap: 0.35rem;
  }

  .sidebar a {
    padding: 0.75rem;
    border-radius: 0.5rem;
    color: #334155;
    text-decoration: none;
  }

  .sidebar a:hover,
  .sidebar a[aria-current="page"] {
    color: #1d4ed8;
    background: #eff6ff;
  }

  main {
    width: 100%;
    max-width: 1100px;
    padding: clamp(1.25rem, 3vw, 2.5rem);
  }

  .home-hero {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr);
    align-items: center;
    gap: clamp(1.5rem, 4vw, 3.5rem);
    min-height: 330px;
    overflow: hidden;
    padding: clamp(1.5rem, 4vw, 3rem);
    border: 1px solid #dbeafe;
    border-radius: 1.5rem;
    background:
      radial-gradient(ellipse at 85% 10%, rgb(191 219 254 / 58%), transparent 38%),
      linear-gradient(135deg, #fff 8%, #f8fbff 62%, #eff6ff);
    box-shadow: 0 18px 44px rgb(30 64 175 / 7%);
  }

  .hero-copy {
    position: relative;
    z-index: 1;
    max-width: 610px;
  }

  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem;
    color: #1d4ed8;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hero-eyebrow::before {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f97316;
    content: "";
  }

  .hero-title {
    max-width: 620px;
    margin: 0;
    color: #0f172a;
    font-size: clamp(2.2rem, 5vw, 4rem);
    font-weight: 800;
    letter-spacing: -0.055em;
    line-height: 1.04;
  }

  .hero-title span {
    color: #2563eb;
  }

  .hero-description {
    max-width: 570px;
    margin: 1.15rem 0 0;
    color: #526176;
    font-size: clamp(0.98rem, 1.5vw, 1.1rem);
    line-height: 1.75;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.6rem;
  }

  .hero-button {
    display: inline-flex;
    min-height: 46px;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    padding: 0.75rem 1.1rem;
    border: 1px solid transparent;
    border-radius: 0.75rem;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
  }

  .hero-button:hover {
    transform: translateY(-1px);
  }

  .hero-button-primary {
    color: #fff;
    background: #1d4ed8;
    box-shadow: 0 8px 18px rgb(29 78 216 / 18%);
  }

  .hero-button-primary:hover {
    background: #1e40af;
  }

  .hero-button-secondary {
    color: #334155;
    border-color: #dbe3ef;
    background: rgb(255 255 255 / 78%);
  }

  .hero-button-secondary:hover {
    border-color: #bfdbfe;
    background: #fff;
  }

  .hero-art {
    position: relative;
    display: grid;
    min-height: 250px;
    place-items: center;
  }

  .hero-orbit {
    position: absolute;
    width: min(100%, 270px);
    aspect-ratio: 1;
    border: 1px solid rgb(59 130 246 / 17%);
    border-radius: 50%;
    background: radial-gradient(circle, rgb(219 234 254 / 65%), rgb(239 246 255 / 25%) 62%, transparent 63%);
  }

  .hero-orbit::before,
  .hero-orbit::after {
    position: absolute;
    inset: 12%;
    border: 1px dashed rgb(59 130 246 / 18%);
    border-radius: 50%;
    content: "";
  }

  .hero-orbit::after {
    inset: 25%;
    border-style: solid;
    border-color: rgb(249 115 22 / 17%);
  }

  .hero-center {
    position: relative;
    z-index: 1;
    display: grid;
    width: 108px;
    height: 108px;
    place-items: center;
    border: 1px solid rgb(255 255 255 / 80%);
    border-radius: 2rem;
    color: #fff;
    background: linear-gradient(145deg, #3b82f6, #1d4ed8);
    box-shadow: 0 18px 38px rgb(37 99 235 / 28%);
    transform: rotate(-6deg);
  }

  .hero-center svg {
    width: 52px;
    height: 52px;
  }

  .hero-float {
    position: absolute;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.65rem 0.85rem;
    border: 1px solid rgb(226 232 240 / 90%);
    border-radius: 0.85rem;
    color: #334155;
    background: rgb(255 255 255 / 92%);
    box-shadow: 0 10px 24px rgb(15 23 42 / 8%);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .hero-float svg {
    width: 18px;
    height: 18px;
  }

  .hero-float-top {
    top: 12%;
    right: 2%;
    color: #7c3aed;
  }

  .hero-float-bottom {
    bottom: 12%;
    left: 0;
    color: #ea580c;
  }

  .home-topics {
    padding: clamp(2rem, 4vw, 3.25rem) 0 1rem;
  }

  .topics-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .topics-heading h2 {
    margin: 0;
    color: #0f172a;
    font-size: clamp(1.35rem, 2.5vw, 1.75rem);
    letter-spacing: -0.035em;
  }

  .topics-heading p {
    max-width: 400px;
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .topic-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .topic-card {
    min-height: 155px;
    padding: 1.1rem;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    background: #fff;
    box-shadow: 0 4px 14px rgb(15 23 42 / 3%);
    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  }

  .topic-card:hover {
    transform: translateY(-3px);
    border-color: #bfdbfe;
    box-shadow: 0 12px 24px rgb(15 23 42 / 7%);
  }

  .topic-icon {
    display: grid;
    width: 40px;
    height: 40px;
    margin-bottom: 0.9rem;
    place-items: center;
    border-radius: 0.75rem;
  }

  .topic-icon svg {
    width: 21px;
    height: 21px;
  }

  .topic-icon-blue {
    color: #2563eb;
    background: #eff6ff;
  }

  .topic-icon-rose {
    color: #e11d48;
    background: #fff1f2;
  }

  .topic-icon-violet {
    color: #7c3aed;
    background: #f5f3ff;
  }

  .topic-icon-orange {
    color: #ea580c;
    background: #fff7ed;
  }

  .topic-card h3 {
    margin: 0 0 0.4rem;
    color: #1e293b;
    font-size: 0.98rem;
  }

  .topic-card p {
    margin: 0;
    color: #64748b;
    font-size: 0.82rem;
    line-height: 1.55;
  }

  .content-card {
    padding: 1.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    background: #fff;
    box-shadow: 0 4px 12px rgb(15 23 42 / 4%);
  }

  .content-card h2 {
    margin-top: 0;
  }

  .auth-card {
    width: min(100%, 460px);
    margin: 2rem auto;
    padding: clamp(1.5rem, 4vw, 2.5rem);
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    background: #fff;
    box-shadow: 0 16px 40px rgb(15 23 42 / 8%);
    display: none; /* hidden by default */
  }

  .auth-card.is-visible {
    display: block;
  }

  .auth-heading {
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .auth-heading h2 {
    margin: 0 0 0.5rem;
    font-size: 1.6rem;
  }

  .auth-heading p {
    margin: 0;
    color: #64748b;
    line-height: 1.5;
  }

  .auth-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem;
    margin-bottom: 1.5rem;
    padding: 0.25rem;
    border-radius: 0.7rem;
    background: #f1f5f9;
  }

  .auth-tab {
    padding: 0.7rem;
    border: 0;
    border-radius: 0.5rem;
    color: #64748b;
    background: transparent;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .auth-tab[aria-selected="true"] {
    color: #1d4ed8;
    background: #fff;
    box-shadow: 0 1px 3px rgb(15 23 42 / 12%);
  }

  .auth-form {
    display: grid;
    gap: 1rem;
  }

  .auth-field {
    display: grid;
    gap: 0.45rem;
  }

  .auth-field[hidden] {
    display: none;
  }

  .auth-field label {
    color: #334155;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .auth-field input {
    width: 100%;
    min-height: 46px;
    padding: 0.75rem 0.85rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.55rem;
    color: #172033;
    background: #fff;
    font: inherit;
  }

  .auth-field input:focus {
    border-color: #3b82f6;
    outline: 3px solid rgb(59 130 246 / 18%);
  }

  .auth-submit {
    min-height: 48px;
    margin-top: 0.25rem;
    border: 0;
    border-radius: 0.6rem;
    color: #fff;
    background: #1d4ed8;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: background 150ms ease, transform 150ms ease;
  }

  .auth-submit:hover {
    background: #1e40af;
  }

  .auth-submit:active {
    transform: translateY(1px);
  }

  .auth-message {
    min-height: 1.25rem;
    margin: 0;
    color: #475569;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .footer {
    position: fixed;
    z-index: 20;
    bottom: 0;
    left: 50%;
    width: 60%;
    transform: translateX(-50%);
    padding: 1rem 1.5rem;
    color: #64748b;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 0.875rem;
  }

  .footer p {
    margin: 0;
  }

  @media (max-width: 900px) {
    .header,
    .layout,
    .footer {
      width: 100%;
    }
  }

  @media (max-width: 640px) {
    body {
      padding-top: 56px;
    }

    .header {
      gap: 0.6rem;
      min-height: 56px;
      padding: 0.4rem 0.75rem;
    }

    .header p {
      display: none;
    }

    .account-summary {
      gap: 0.3rem;
    }

    .account-name {
      max-width: 6rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .credits-badge {
      gap: 0.25rem;
      padding: 0.35rem 0.5rem;
    }

    .location-badge {
      width: 30px;
      height: 30px;
    }

    .layout {
      grid-template-columns: 1fr;
      min-height: calc(100vh - 112px);
    }

    .sidebar {
      position: fixed;
      z-index: 31;
      top: 56px;
      bottom: 56px;
      left: 0;
      width: min(82vw, 320px);
      padding: 1.5rem 1rem;
      overflow-y: auto;
      border: 0;
      box-shadow: 8px 0 24px rgb(15 23 42 / 14%);
      transform: translateX(-105%);
      visibility: hidden;
      transition: transform 220ms ease, visibility 220ms ease;
    }

    .sidebar.is-open {
      transform: translateX(0);
      visibility: visible;
    }

    .sidebar-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      color: inherit;
      background: transparent;
      font: inherit;
      cursor: pointer;
    }

    .menu-toggle {
      width: 36px;
      height: 36px;
      min-height: 36px;
      padding: 0;
    }

    .sidebar-close {
      margin: 0 0 1rem auto;
    }

    .sidebar-backdrop.is-visible {
      position: fixed;
      z-index: 30;
      inset: 56px 0 56px;
      display: block;
      border: 0;
      background: rgb(15 23 42 / 42%);
    }

    .sidebar nav {
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }

    main {
      padding: 1rem;
    }

    .home-hero {
      grid-template-columns: 1fr;
      gap: 0.5rem;
      min-height: auto;
      padding: 1.5rem;
    }

    .hero-title {
      font-size: clamp(2.25rem, 12vw, 3.2rem);
    }

    .hero-art {
      min-height: 190px;
      margin-top: 0.25rem;
    }

    .hero-orbit {
      width: 190px;
    }

    .hero-center {
      width: 82px;
      height: 82px;
      border-radius: 1.5rem;
    }

    .hero-center svg {
      width: 42px;
      height: 42px;
    }

    .hero-float-top {
      right: 3%;
    }

    .hero-float-bottom {
      left: 3%;
    }

    .topics-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .topic-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .auth-card {
      margin: 0.5rem auto;
    }
  }

  @media (max-width: 380px) {
    .topic-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sidebar {
      transition: none;
    }
  }
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.append(styleSheet);
document.title = "BENTOUL — Informatique, Amour, Langues & Partage";

document.body.innerHTML = `
  <header class="header">
    <button
      class="menu-toggle"
      type="button"
      aria-controls="sidebar"
      aria-expanded="false"
      aria-label="Ouvrir le menu"
    >
      <!-- hamburger icon -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="color:inherit">
        <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <h1 class="brand">BENTOUL</h1>
    <p>Bienvenue dans votre espace</p>
    <div class="account-summary" aria-label="Informations du compte">
      <span class="location-badge" aria-label="Localisation">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.8"/></svg>
      </span>
      <span class="account-name" id="header-username">Invité</span>
      <span class="credits-badge" aria-label="Crédits"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><ellipse cx="9" cy="7" rx="5.5" ry="2.5" fill="currentColor" fill-opacity=".22" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 7v3c0 1.38 2.46 2.5 5.5 2.5.76 0 1.48-.08 2.13-.23M3.5 10v3c0 1.38 2.46 2.5 5.5 2.5.77 0 1.49-.09 2.14-.24M14.5 12c0 1.38-2.46 2.5-5.5 2.5S3.5 13.38 3.5 12m11-3.5c3.04 0 5.5 1.12 5.5 2.5s-2.46 2.5-5.5 2.5-5.5-1.12-5.5-2.5 2.46-2.5 5.5-2.5Z" stroke="currentColor" stroke-width="1.7"/><path d="M9 14.5v2c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5v-3m-11 3v2c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5v-2" stroke="currentColor" stroke-width="1.7"/></svg><span id="user-credits">0</span></span>
    </div>
  </header>

  <button class="sidebar-backdrop" type="button" aria-label="Fermer le menu"></button>

  <div class="layout">
    <aside class="sidebar" id="sidebar" aria-label="Menu latéral">
      <button class="sidebar-close" type="button">Fermer</button>

      <div class="sidebar-user" id="sidebar-user">
        <img class="sidebar-avatar" id="sidebar-avatar" src="https://via.placeholder.com/48" alt="Avatar utilisateur" />
        <div class="sidebar-user-info">
          <div class="sidebar-user-name" id="sidebar-username">Invité</div>
          <div class="sidebar-user-email" id="sidebar-email">—</div>
        </div>
        <div class="sidebar-user-credits" id="sidebar-credits">0 crédits</div>
      </div>

      <h2>Navigation</h2>
      <nav>
        <a href="#accueil" aria-current="page">Accueil</a>
        <a href="#" data-catalog-nav>Boutique</a>
        <a href="#tableau-de-bord">Tableau de bord</a>
        <a href="#parametres">Paramètres</a>
      </nav>

      <div style="padding:1rem;">
        <button class="auth-action" id="sidebar-auth-action" type="button" aria-expanded="false" aria-controls="auth-card">Se connecter</button>
      </div>
    </aside>

    <main id="accueil" class="home-page">
      ${homeContent}
      <section class="auth-card" id="auth-card" aria-labelledby="auth-title" aria-hidden="true">
        <div class="auth-heading">
          <h2 id="auth-title">Ravi de vous revoir</h2>
          <p id="auth-description">Connectez-vous pour accéder à votre espace.</p>
        </div>

        <div class="auth-tabs" role="tablist" aria-label="Accès au compte">
          <button class="auth-tab" id="login-tab" type="button" role="tab" aria-selected="true" aria-controls="auth-form" data-mode="login">Connexion</button>
          <button class="auth-tab" id="register-tab" type="button" role="tab" aria-selected="false" aria-controls="auth-form" data-mode="register" tabindex="-1">Inscription</button>
        </div>

        <form class="auth-form" id="auth-form">
          <div class="auth-field" id="name-field" hidden>
            <label for="auth-name">Nom complet</label>
            <input id="auth-name" name="name" type="text" autocomplete="name" placeholder="Votre nom" />
          </div>

          <div class="auth-field">
            <label for="auth-email">Adresse e-mail</label>
            <input id="auth-email" name="email" type="email" autocomplete="email" placeholder="vous@exemple.com" required />
          </div>

          <div class="auth-field">
            <label for="auth-password">Mot de passe</label>
            <input id="auth-password" name="password" type="password" autocomplete="current-password" minlength="8" placeholder="8 caractères minimum" required />
          </div>

          <div class="auth-field" id="confirm-password-field" hidden>
            <label for="auth-confirm-password">Confirmer le mot de passe</label>
            <input id="auth-confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Saisissez à nouveau le mot de passe" />
          </div>

          <button class="auth-submit" id="auth-submit" type="submit">Se connecter</button>
          <p class="auth-message" id="auth-message" role="status" aria-live="polite"></p>
        </form>
      </section>
    </main>
  </div>

  <footer class="footer">
    <p>&copy; <span id="current-year"></span> BENTOUL. Tous droits réservés.</p>
  </footer>
`;

const catalogNavigationLink = document.querySelector("[data-catalog-nav]");
const isCatalogPage = window.location.pathname.toLowerCase().endsWith("/pages/bentoul.html");
catalogNavigationLink.href = new URL(
  isCatalogPage ? "./bentoul.html" : "./pages/bentoul.html",
  window.location.href
).href;

document.getElementById("current-year").textContent =
  new Date().getFullYear();

const menuToggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
const layout = document.querySelector(".layout");
const sidebarBackdrop = document.querySelector(".sidebar-backdrop");
const sidebarClose = document.querySelector(".sidebar-close");
const mobileViewport = window.matchMedia("(max-width: 640px)");

function setSidebarOpen(isOpen) {
  if (!mobileViewport.matches) {
    layout.classList.toggle("sidebar-collapsed", !isOpen);
  }
  sidebar.classList.toggle("is-open", isOpen);
  sidebarBackdrop.classList.toggle("is-visible", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
  sidebar.setAttribute("aria-hidden", String(mobileViewport.matches && !isOpen));
}

menuToggle.addEventListener("click", () => {
  setSidebarOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});
sidebarClose.addEventListener("click", () => setSidebarOpen(false));
sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
sidebar.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    if (mobileViewport.matches) setSidebarOpen(false);
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileViewport.matches) {
    setSidebarOpen(false);
  }
});
mobileViewport.addEventListener("change", (event) => setSidebarOpen(!event.matches));
setSidebarOpen(!mobileViewport.matches);

const authForm = document.querySelector("#auth-form");
const authCard = document.querySelector("#auth-card");
const authTabs = [...document.querySelectorAll(".auth-tab")];
const authTitle = document.querySelector("#auth-title");
const authDescription = document.querySelector("#auth-description");
const authSubmit = document.querySelector("#auth-submit");
const authMessage = document.querySelector("#auth-message");
const nameField = document.querySelector("#name-field");
const nameInput = document.querySelector("#auth-name");
const passwordInput = document.querySelector("#auth-password");
const confirmPasswordField = document.querySelector("#confirm-password-field");
const confirmPasswordInput = document.querySelector("#auth-confirm-password");
const sidebarAuthAction = document.querySelector("#sidebar-auth-action");
const headerUsername = document.querySelector("#header-username");
const headerCredits = document.querySelector("#user-credits");
const sidebarUsername = document.querySelector("#sidebar-username");
const sidebarEmail = document.querySelector("#sidebar-email");
const sidebarCredits = document.querySelector("#sidebar-credits");
const sidebarAvatar = document.querySelector("#sidebar-avatar");
let authMode = "login";

function updateUserDetails(user) {
  const name = user ? (user.nom || user.name || user.email) : "Invité";
  const email = user ? (user.email || "") : "—";
  const credits = user ? (Number(user.credits) || 0) : 0;

  headerUsername.textContent = name;
  headerCredits.textContent = String(credits);
  sidebarUsername.textContent = name;
  sidebarEmail.textContent = email;
  sidebarCredits.textContent = `${credits} crédits`;
  sidebarAvatar.src = user && user.avatar ? user.avatar : DEFAULT_AVATAR;
  sidebarAvatar.alt = user ? `Avatar de ${name}` : "Avatar utilisateur";
  sidebarAuthAction.textContent = user ? "Se déconnecter" : "Se connecter";
  authCard.classList.remove("is-visible");
  authCard.setAttribute("aria-hidden", "true");
  sidebarAuthAction.setAttribute("aria-expanded", "false");
}

function notifySessionChange() {
  window.dispatchEvent(new CustomEvent("bcreation-session-changed"));
}

function restoreUserSession() {
  try {
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (!savedSession) {
      updateUserDetails(null);
      return;
    }

    const session = JSON.parse(savedSession);
    if (!session || !session.user || !session.token) {
      sessionStorage.removeItem(SESSION_KEY);
      updateUserDetails(null);
      return;
    }
    updateUserDetails(session.user);
  } catch (error) {
    authMessage.textContent = "Impossible de restaurer votre session sur cet appareil.";
    updateUserDetails(null);
  }
}

async function sendAuthRequest(action, credentials) {
  if (!API_URL) {
    throw new Error("Configurez l’URL de déploiement Apps Script dans window.APP_CONFIG.apiUrl (index.html).");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...credentials })
  });
  if (response.status === 404) {
    throw new Error("Déploiement Apps Script introuvable (HTTP 404). Vérifiez l’URL /exec et publiez une nouvelle version de l’application Web.");
  }
  if (!response.ok) {
    throw new Error(`Le serveur a répondu avec le statut ${response.status}.`);
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error("La réponse du serveur est invalide.");
  }
  if (!result || typeof result.success !== "boolean") {
    throw new Error("La réponse du serveur ne contient pas de résultat valide.");
  }
  return result;
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegistering = mode === "register";

  authTabs.forEach((tab) => {
    const isSelected = tab.dataset.mode === mode;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  });

  nameField.hidden = !isRegistering;
  nameInput.required = isRegistering;
  nameInput.disabled = !isRegistering;
  confirmPasswordField.hidden = !isRegistering;
  confirmPasswordInput.required = isRegistering;
  confirmPasswordInput.disabled = !isRegistering;
  passwordInput.autocomplete = isRegistering ? "new-password" : "current-password";
  authTitle.textContent = isRegistering ? "Créez votre compte" : "Ravi de vous revoir";
  authDescription.textContent = isRegistering
    ? "Inscrivez-vous pour créer votre espace personnel."
    : "Connectez-vous pour accéder à votre espace.";
  authSubmit.textContent = isRegistering ? "Créer mon compte" : "Se connecter";
  authMessage.textContent = "";
}

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.mode));
  tab.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const nextMode = authMode === "login" ? "register" : "login";
      setAuthMode(nextMode);
      authTabs.find((item) => item.dataset.mode === nextMode).focus();
    }
  });
});

sidebarAuthAction.addEventListener("click", () => {
  const savedSession = sessionStorage.getItem(SESSION_KEY);
  if (savedSession) {
    sessionStorage.removeItem(SESSION_KEY);
    updateUserDetails(null);
    notifySessionChange();
    authMessage.textContent = "Vous êtes déconnecté.";
  } else {
    const isVisible = authCard.classList.toggle("is-visible");
    authCard.setAttribute("aria-hidden", String(!isVisible));
    sidebarAuthAction.setAttribute("aria-expanded", String(isVisible));
    if (isVisible) {
      authForm.elements.email.focus();
    }
  }
  setSidebarOpen(!mobileViewport.matches);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "";

  if (authMode === "register" && passwordInput.value !== confirmPasswordInput.value) {
    confirmPasswordInput.setCustomValidity("Les mots de passe ne correspondent pas.");
    confirmPasswordInput.reportValidity();
    confirmPasswordInput.setCustomValidity("");
    return;
  }

  const isRegistering = authMode === "register";
  const credentials = {
    email: authForm.elements.email.value.trim(),
    password: passwordInput.value
  };
  if (isRegistering) credentials.nom = nameInput.value.trim();

  authSubmit.disabled = true;
  authMessage.textContent = isRegistering ? "Création du compte…" : "Connexion en cours…";
  try {
    const result = await sendAuthRequest(isRegistering ? "register" : "login", credentials);
    if (!result.success) {
      authMessage.textContent = result.message || "La connexion a échoué.";
      return;
    }
    if (!result.user || !result.token) {
      throw new Error("La réponse du serveur ne contient pas les informations de session.");
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: result.user, token: result.token }));
    updateUserDetails(result.user);
    notifySessionChange();
    authMessage.textContent = result.message || "Votre compte est prêt.";
    authForm.reset();
    setAuthMode("login");
  } catch (error) {
    authMessage.textContent = error instanceof TypeError
      ? "Impossible de joindre Apps Script. Vérifiez l’URL du déploiement /exec, les accès de l’application Web et votre connexion Internet."
      : (error.message || "Une erreur est survenue pendant l’authentification.");
  } finally {
    authSubmit.disabled = false;
  }
});

restoreUserSession();
