(() => {
  const iconMap = {
    home: "house",
    local_library: "book-open",
    account_balance_wallet: "wallet",
    history: "clock-rotate-left",
    person: "user",
    admin_panel_settings: "user-shield",
    menu: "bars",
    monetization_on: "coins",
    dark_mode: "moon",
    favorite: "heart",
    translate: "language",
    language: "globe",
    design_services: "pen-ruler",
    arrow_forward: "arrow-right",
    arrow_back: "arrow-left",
    share: "share-nodes",
    check_circle: "circle-check",
    account_circle: "circle-user",
    sms: "comment-sms",
    auto_stories: "book-open-reader",
    lightbulb: "lightbulb",
    help: "circle-question",
    volunteer_activism: "hand-holding-heart",
    psychology: "brain",
    support_agent: "headset",
    chat: "comment-dots",
    chat_bubble: "comment",
    send: "paper-plane",
    content_copy: "copy",
    visibility: "eye",
    apps: "table-cells-large",
    forum: "comments",
    menu_book: "book-open",
    record_voice_over: "microphone-lines",
    school: "graduation-cap",
    search: "magnifying-glass",
    close: "xmark",
    cloud_off: "cloud-bolt",
    search_off: "magnifying-glass-minus",
    play_arrow: "play",
    stop: "stop",
    format_align_left: "align-left",
    format_align_center: "align-center",
    format_align_right: "align-right",
    format_align_justify: "align-justify",
    image: "image",
    open_in_new: "arrow-up-right-from-square",
    download: "download",
    folder_open: "folder-open",
    verified: "circle-check",
    lock_open: "lock-open",
    link: "link",
    volume_up: "volume-high",
    info: "circle-info",
    cancel: "circle-xmark",
    check: "check",
    arrow_upward: "arrow-up",
    arrow_downward: "arrow-down",
    refresh: "rotate",
    settings: "gear",
    edit: "pen-to-square",
    delete: "trash",
    add: "plus",
    remove: "minus"
  };

  const brandIcons = new Set(["whatsapp", "facebook", "instagram", "youtube", "tiktok", "google", "google-drive", "x-twitter"]);

  function convertIcon(element) {
    if (!element || !element.classList || !element.classList.contains("material-symbols-outlined")) return;
    const symbol = (element.textContent || "").trim().toLowerCase();
    if (!symbol) return;

    const iconName = iconMap[symbol];
    const iconClass = iconName ? `fa-${iconName}` : (brandIcons.has(symbol) ? `fa-${symbol}` : "");
    if (!iconClass) return;

    const previousClass = element.dataset.faLocalClass;
    if (previousClass === iconClass) {
      element.textContent = "";
      return;
    }
    if (previousClass) element.classList.remove(previousClass);

    const family = brandIcons.has(symbol) ? "fa-brands" : "fa-solid";
    element.classList.add(family, iconClass);
    element.dataset.faLocalClass = iconClass;
    element.setAttribute("aria-hidden", "true");
    element.textContent = "";
  }

  function convertTree(root) {
    if (root.nodeType === Node.ELEMENT_NODE) {
      convertIcon(root);
      root.querySelectorAll?.(".material-symbols-outlined").forEach(convertIcon);
    } else if (root.nodeType === Node.TEXT_NODE) {
      convertIcon(root.parentElement);
    }
  }

  function start() {
    convertTree(document.documentElement);
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === "characterData") convertIcon(record.target.parentElement);
        if (record.type === "childList") {
          convertIcon(record.target);
          record.addedNodes.forEach(convertTree);
        }
      });
    });
    observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
