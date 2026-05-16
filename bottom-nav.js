// bottom-nav.js — Budget Buddy
import { logoutUser } from "./auth.js";

export function initBottomNav() {
  // ── Active tab highlighting ──────────────────────────────────────
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

  const activeId  = map[page] || null;
  if (activeId) {
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add("bn-active");
  }

  // ── More sheet open / close ──────────────────────────────────────
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

  // Swipe down to close
  let touchStartY = 0;
  if (moreSheet) {
    moreSheet.addEventListener("touchstart", e => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    moreSheet.addEventListener("touchmove", e => {
      if (e.touches[0].clientY - touchStartY > 60) closeSheet();
    }, { passive: true });
  }

  // ── Logout — uses the same logoutUser as the rest of the app ─────
  const bnLogout = document.getElementById("bn-logout");
  if (bnLogout) {
    bnLogout.addEventListener("click", async e => {
      e.preventDefault();
      await logoutUser(); // signs out + redirects to login.html
    });
  }
}

// Auto-init when the DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBottomNav);
} else {
  initBottomNav();
}