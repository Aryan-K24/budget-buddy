// bottom-nav.js — Budget Buddy
import { logoutUser } from "./auth.js";

// SVG icons for Dark Mode (matches user's reference designs)
const DARK_ICONS = {
  home: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5a1.5 1.5 0 0 0-.96.35l-7.8 6.5A1.5 1.5 0 0 0 3 10.5V20a2 2 0 0 0 2 2h4a1 1 0 0 0 1-1v-4.5a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5V21a1 1 0 0 0 1 1h4a2 2 0 0 0 2-2v-9.5a1.5 1.5 0 0 0-.24-1.65l-7.8-6.5A1.5 1.5 0 0 0 12 2.5z"/></svg>`,
  expenses: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5.5 5.5C4.2 3.8 5 2 6.8 2.2c1.3.1 2.6 1.4 3 2.8" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M9.8 4.8C9.5 3.2 10.7 1.8 12.5 2c1.3.1 2 1.4 1.8 2.8" stroke-width="1.8" stroke-linecap="round" fill="none"/><rect x="2.5" y="6.5" width="19" height="13.5" rx="3.5" fill="currentColor"/><rect x="14" y="10.5" width="7.5" height="5" rx="1.5" fill="#0b0710" stroke="none"/><circle cx="16.5" cy="13" r="0.9" fill="currentColor"/></svg>`,
  history: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><polyline points="12 6.8 12 12 8 12"/></svg>`,
  payments: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3.5"/><line x1="2" y1="9.5" x2="22" y2="9.5"/><rect x="16" y="13.5" width="3" height="2.5" rx="0.8" fill="currentColor"/></svg>`,
  more: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>`,
};

// Sheet icons for Dark Mode
const DARK_SHEET_ICONS = {
  planner: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><circle cx="11" cy="13" r="1" fill="#c4b5fd"/><path d="M15.5 8.5L20 4"/><path d="M17.5 4H20v2.5"/></svg>`,
  extra: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#c4b5fd"><path d="M20 7V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2h-8a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h8zm-6 4h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1zm3 2.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>`,
  settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

// Light mode icons (original app emojis / SVG preserved 100%)
const LIGHT_ICONS = {
  home: "🏠",
  expenses: "💸",
  history: "🕐",
  payments: "💳",
  more: "•••",
};

const LIGHT_SHEET_ICONS = {
  planner: "📊",
  extra: "💰",
  settings: "⚙️",
  logout: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 17l5-5-5-5"/><line x1="21" y1="12" x2="9" y2="12"/><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/></svg>`,
};

export function updateThemeIcons() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  // Bottom nav icons
  const navMap = {
    "bn-home":     isDark ? DARK_ICONS.home     : LIGHT_ICONS.home,
    "bn-expenses": isDark ? DARK_ICONS.expenses : LIGHT_ICONS.expenses,
    "bn-history":  isDark ? DARK_ICONS.history  : LIGHT_ICONS.history,
    "bn-payments": isDark ? DARK_ICONS.payments : LIGHT_ICONS.payments,
    "bn-more":     isDark ? DARK_ICONS.more     : LIGHT_ICONS.more,
  };

  for (const [id, iconHtml] of Object.entries(navMap)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    const iconSpan = btn.querySelector(".bn-icon");
    if (iconSpan) iconSpan.innerHTML = iconHtml;
  }

  // More sheet icons
  const moreSheet = document.getElementById("bn-more-sheet");
  if (moreSheet) {
    const plannerIcon = moreSheet.querySelector("a[href*='savings_planner'] .bn-sheet-icon");
    if (plannerIcon) plannerIcon.innerHTML = isDark ? DARK_SHEET_ICONS.planner : LIGHT_SHEET_ICONS.planner;

    const extraIcon = moreSheet.querySelector("a[href*='extra_funds'] .bn-sheet-icon");
    if (extraIcon) extraIcon.innerHTML = isDark ? DARK_SHEET_ICONS.extra : LIGHT_SHEET_ICONS.extra;

    const settingsIcon = moreSheet.querySelector("a[href*='settings'] .bn-sheet-icon");
    if (settingsIcon) settingsIcon.innerHTML = isDark ? DARK_SHEET_ICONS.settings : LIGHT_SHEET_ICONS.settings;

    const logoutIcon = moreSheet.querySelector("#bn-logout .bn-sheet-icon");
    if (logoutIcon) logoutIcon.innerHTML = isDark ? DARK_SHEET_ICONS.logout : LIGHT_SHEET_ICONS.logout;

    // Add right chevron arrows to sheet items if not present
    moreSheet.querySelectorAll(".bn-sheet-item").forEach(item => {
      if (!item.querySelector(".bn-sheet-arrow")) {
        const arrow = document.createElement("span");
        arrow.className = "bn-sheet-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
        item.appendChild(arrow);
      }
    });
  }
}

export function initBottomNav() {
  const page = window.location.pathname.split("/").pop() || "dashboard.html";

  const map = {
    "dashboard.html":       "bn-home",
    "expense.html":         "bn-expenses",
    "history.html":         "bn-history",
    "payments.html":        "bn-payments",
    "savings_planner.html": "bn-more",
    "extra_funds.html":     "bn-more",
    "settings.html":        "bn-more",
  };

  const activeId = map[page] || null;
  if (activeId) {
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add("bn-active");
  }

  // More sheet open / close
  const moreBtn     = document.getElementById("bn-more");
  const moreSheet   = document.getElementById("bn-more-sheet");
  const moreOverlay = document.getElementById("bn-overlay");

  function openSheet() {
    if (!moreSheet || !moreOverlay) return;
    moreSheet.classList.add("open");
    moreOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeSheet() {
    if (!moreSheet || !moreOverlay) return;
    moreSheet.classList.remove("open");
    moreOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (moreBtn)     moreBtn.addEventListener("click", openSheet);
  if (moreOverlay) moreOverlay.addEventListener("click", closeSheet);

  let touchStartY = 0;
  if (moreSheet) {
    moreSheet.addEventListener("touchstart", e => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    moreSheet.addEventListener("touchmove", e => {
      if (e.touches[0].clientY - touchStartY > 60) closeSheet();
    }, { passive: true });
  }

  const bnLogout = document.getElementById("bn-logout");
  if (bnLogout) {
    bnLogout.addEventListener("click", async e => {
      e.preventDefault();
      await logoutUser();
    });
  }

  // Apply icons based on active theme
  updateThemeIcons();

  // Watch for dynamic theme changes
  if (window.MutationObserver) {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.attributeName === "data-theme") {
          updateThemeIcons();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  window.addEventListener("storage", e => {
    if (e.key === "bb-theme") updateThemeIcons();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBottomNav);
} else {
  initBottomNav();
}
