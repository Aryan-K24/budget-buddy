/**
 * settings.js — Budget Buddy
 */

import { state, initApp, saveUser, getCurrency } from "./app.js";
import { logoutUser, deleteAccount } from "./auth.js";
import { initNavbar } from "./navbar.js";
import { showToast } from "./toast.js";

function attachCommaFormatter(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("input", () => {
    const raw = input.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    if (!raw) return;
    const [integer, ...rest] = raw.split(".");
    const formatted = Number(integer).toLocaleString("en-IN");
    input.value = rest.length ? `${formatted}.${rest.join("")}` : formatted;
  });
}

function getEmoji(name) {
  const map = {
    pet: "🐾", care: "🐾",
    gym: "💪", sports: "⚽",
    freelance: "💼",
    food: "🍔",
    travel: "✈️",
    health: "💊", medical: "🏥",
    education: "📚",
    rent: "🏠",
    shopping: "🛍️",
    entertainment: "🎬", movie: "🎬",
    fuel: "⛽", petrol: "⛽",
  };
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(map)) {
    if (lower.includes(key)) return emoji;
  }
  return "🏷️";
}

function initCurrencyDropdown() {
  const trigger = document.getElementById("currencyTrigger");
  const list    = document.getElementById("currencyOptions");
  const hidden  = document.getElementById("currencyInput");

  if (!trigger || !list || !hidden) return;

  function open() {
    list.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
    const first = list.querySelector("li");
    if (first) first.focus();
  }

  function close() {
    list.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function selectOption(li) {
    hidden.value = li.dataset.value;
    trigger.textContent = li.textContent;
    list.querySelectorAll("li").forEach(el => el.removeAttribute("aria-selected"));
    li.setAttribute("aria-selected", "true");
    close();
    trigger.focus();
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    list.classList.contains("open") ? close() : open();
  });

  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    if (e.key === "Escape") close();
  });

  list.querySelectorAll("li").forEach((li) => {
    li.setAttribute("tabindex", "-1");
    li.addEventListener("click", (e) => { e.stopPropagation(); selectOption(li); });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectOption(li); }
      if (e.key === "Escape") { close(); trigger.focus(); }
      if (e.key === "ArrowDown") { e.preventDefault(); const next = li.nextElementSibling; if (next) next.focus(); }
      if (e.key === "ArrowUp")   { e.preventDefault(); const prev = li.previousElementSibling; if (prev) prev.focus(); else trigger.focus(); }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".custom-select-wrapper")) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

function initSettingsForm() {
  const salaryInput   = document.getElementById("salaryInput");
  const savingsInput  = document.getElementById("savingsInput");
  const nameInput     = document.getElementById("nameInput");
  const currencyInput = document.getElementById("currencyInput");
  const btn           = document.querySelector(".finance-save-btn");

  const displaySalary   = document.getElementById("displaySalary");
  const displaySavings  = document.getElementById("displaySavings");
  const displayName     = document.getElementById("displayName");
  const displayCurrCard = document.getElementById("displayCurrencyCard");
  const currencyTrigger = document.getElementById("currencyTrigger");

  attachCommaFormatter("salaryInput");
  attachCommaFormatter("savingsInput");

  function refreshDisplay() {
    const u = state.user;
    const c = getCurrency();
    if (displaySalary) {
      displaySalary.textContent = u.salary != null && u.salary > 0 ? `${c}${u.salary.toLocaleString("en-IN")}` : "—";
    }
    if (displaySavings) {
      displaySavings.textContent = u.savingsTarget != null ? `${c}${u.savingsTarget.toLocaleString("en-IN")}` : "—";
    }
    if (displayName)     displayName.textContent     = u.name || "—";
    if (displayCurrCard) displayCurrCard.textContent = c;
    if (currencyTrigger) currencyTrigger.textContent = "Keep current";
  }

  refreshDisplay();

  let isSaving = false;

  document.getElementById("settingsForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const rawSalary  = salaryInput.value.replace(/,/g, "");
    const rawSavings = savingsInput.value.replace(/,/g, "");
    const salary     = rawSalary  ? Number(rawSalary)  : null;
    const savings    = rawSavings ? Number(rawSavings) : null;
    const name       = nameInput.value.trim();
    const currency   = currencyInput.value;

    if (salary  !== null && (isNaN(salary)  || salary  <= 0)) { showToast("Enter a valid salary", "error"); return; }
    if (savings !== null && (isNaN(savings) || savings < 0))  { showToast("Savings cannot be negative", "error"); return; }

    const effectiveSalary  = salary  ?? state.user.salary;
    const effectiveSavings = savings ?? state.user.savingsTarget;
    if (effectiveSalary != null && effectiveSavings != null && effectiveSavings >= effectiveSalary) {
      showToast("Savings must be less than salary", "error"); return;
    }

    const month = state.user?.months?.[state.user.currentMonth];

    if (salary !== null) {
      state.user.salary = salary;
      if (month) { month.salary = salary; month.budget = Math.max(salary - (savings ?? state.user.savingsTarget ?? 0), 0); }
    }
    if (savings !== null) {
      state.user.savingsTarget = savings;
      if (month) { month.savingsTarget = savings; month.budget = Math.max((salary ?? state.user.salary ?? 0) - savings, 0); }
    }
    if (name)     state.user.name     = name;
    if (currency) state.user.currency = currency;

    isSaving = true;
    btn.disabled = true;

    refreshDisplay();
    salaryInput.value   = "";
    savingsInput.value  = "";
    nameInput.value     = "";
    currencyInput.value = "";
    btn.disabled = false;
    btn.textContent = "Saved ✓";
    showToast("Settings updated ✓", "success");
    setTimeout(() => { btn.textContent = "Save Changes"; }, 1400);

    saveUser(false).catch(() => {
      showToast("Couldn't sync to cloud. Changes may not persist.", "error");
    });

    isSaving = false;
  });
}

function renderCustomCategories() {
  const container = document.getElementById("customCategoriesList");
  const badge     = document.getElementById("categoriesBadge");
  if (!container) return;

  const cats = state.user.customCategories || [];
  if (badge) badge.textContent = `${cats.length} active`;

  if (!cats.length) {
    container.innerHTML = `<p class="empty-categories">No custom categories added yet.</p>`;
    return;
  }

  container.innerHTML = cats.map((cat, i) => `
    <div class="category-row" id="cat-row-${i}">
      <div class="category-row-left">
        <div class="category-icon">${getEmoji(cat)}</div>
        <span class="category-name" id="cat-name-${i}">${cat}</span>
        <input type="text" id="cat-input-${i}" value="${cat}" class="category-edit-input" aria-label="Edit category name" />
      </div>
      <div class="category-actions">
        <button class="edit-cat-btn"  data-index="${i}" type="button">Edit</button>
        <button class="save-cat-btn"  data-index="${i}" type="button" style="display:none">Save</button>
        <button class="remove-btn"    data-index="${i}" type="button">Remove</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".edit-cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = btn.dataset.index;
      document.getElementById(`cat-name-${i}`).style.display = "none";
      const inp = document.getElementById(`cat-input-${i}`);
      inp.style.display = "inline-block";
      inp.focus();
      btn.style.display = "none";
      container.querySelector(`.save-cat-btn[data-index="${i}"]`).style.display = "inline-block";
    });
  });

  container.querySelectorAll(".save-cat-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const i       = Number(btn.dataset.index);
      const newName = document.getElementById(`cat-input-${i}`).value.trim();
      if (!newName) { showToast("Category cannot be empty", "error"); return; }
      const list    = state.user.customCategories || [];
      const oldName = list[i];
      if (newName === oldName) { renderCustomCategories(); return; }
      const isDuplicate = list.some((c, idx) => idx !== i && c.toLowerCase() === newName.toLowerCase());
      if (isDuplicate) { showToast("Category already exists", "error"); return; }
      list[i] = newName;
      state.user.customCategories = list;
      const updatePast = confirm(`Rename "${oldName}" to "${newName}"?\n\nOK = also update all past expenses\nCancel = only update dropdown`);
      if (updatePast) {
        Object.values(state.user.months || {}).forEach((month) => {
          (month.expenses || []).forEach((exp) => { if (exp.category === oldName) exp.category = newName; });
        });
      }
      await saveUser(false);
      showToast("Category updated ✓", "success");
      renderCustomCategories();
    });
  });

  container.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteCategory(Number(btn.dataset.index)));
  });
}

async function deleteCategory(index) {
  const list    = state.user.customCategories || [];
  const catName = list[index];
  if (!confirm(`Remove "${catName}" from dropdown?\n\nPast expenses won't be affected.`)) return;
  list.splice(index, 1);
  state.user.customCategories = list;
  await saveUser(false);
  showToast("Category removed", "success");
  renderCustomCategories();
}

/* ─────────────────────────────────────────
   Delete Account
───────────────────────────────────────── */
function initDeleteAccount() {
  const deleteBtn    = document.getElementById("deleteAccountBtn");
  const modal        = document.getElementById("deleteModal");
  const cancelBtn    = document.getElementById("cancelDeleteBtn");
  const confirmBtn   = document.getElementById("confirmDeleteBtn");
  const confirmInput = document.getElementById("deleteConfirmInput");
  const deleteError  = document.getElementById("deleteError");

  if (!deleteBtn || !modal) return;

  deleteBtn.addEventListener("click", () => {
    modal.classList.add("active");
    confirmInput.value = "";
    deleteError.style.display = "none";
  });

  cancelBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  confirmBtn.addEventListener("click", async () => {
    if (confirmInput.value.trim() !== "DELETE") {
      deleteError.textContent = "Please type DELETE exactly to confirm.";
      deleteError.style.display = "block";
      return;
    }
    confirmBtn.textContent = "Deleting...";
    confirmBtn.disabled = true;
    try {
      await deleteAccount();
      showToast("Account deleted successfully", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } catch (err) {
      deleteError.textContent = err.message || "Failed to delete. Please log out and log back in, then try again.";
      deleteError.style.display = "block";
      confirmBtn.textContent = "Delete";
      confirmBtn.disabled = false;
    }
  });
}

/* ─────────────────────────────────────────
   Bootstrap
───────────────────────────────────────── */
initApp(() => {
  initSettingsForm();
  renderCustomCategories();
  initNotifSettings();
  initDeleteAccount();
  initAppearanceSettings();
});

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initCurrencyDropdown();
  initAppearanceSettings();

  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await logoutUser();
  });
});

async function initNotifSettings() {
  const btn   = document.getElementById("enableNotifSettingsBtn");
  const badge = document.getElementById("notifStatus");
  if (!btn || !badge) return;

  await new Promise(resolve => setTimeout(resolve, 500));

  if (!("Notification" in window)) {
    badge.textContent = "Not supported";
    btn.textContent = "🔔 Not supported on this browser";
    return;
  }

  const permission = Notification.permission;

  if (permission === "granted") {
    badge.textContent = "✅ Enabled";
    badge.style.background = "rgba(34,197,94,0.1)";
    badge.style.color = "#16a34a";
    btn.textContent = "🔔 Re-register This Device";
  } else if (permission === "denied") {
    badge.textContent = "❌ Blocked";
    badge.style.background = "rgba(239,68,68,0.1)";
    badge.style.color = "#ef4444";
    btn.textContent = "🔔 Enable in Phone Settings";
    btn.addEventListener("click", () => {
      showToast("Go to phone Settings → Notifications → Browser → Budget Buddy", "info");
    });
    return;
  } else {
    badge.textContent = "Not enabled";
    btn.textContent = "🔔 Enable Notifications";
  }

  btn.addEventListener("click", async () => {
    const { initNotifications } = await import("./notifications.js");
    await initNotifications();
    showToast("Notifications enabled for this device!", "success");
    badge.textContent = "✅ Enabled";
    badge.style.background = "rgba(34,197,94,0.1)";
    badge.style.color = "#16a34a";
  });
}
function initAppearanceSettings() {
  const toggle = document.getElementById("darkModeToggle");
  const label  = document.getElementById("appearanceMode");
  if (!toggle) return;

  const currentTheme = localStorage.getItem("bb-theme");
  const isDark = currentTheme === "dark" || document.documentElement.getAttribute("data-theme") === "dark";
  toggle.checked = isDark;
  if (label) label.textContent = isDark ? "Dark mode (Midnight Blue)" : "Light mode";

  toggle.addEventListener("change", () => {
    if (toggle.checked) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bb-theme", "dark");
      if (label) label.textContent = "Dark mode (Midnight Blue)";
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("bb-theme", "light");
      if (label) label.textContent = "Light mode";
    }
    try {
      if (typeof window.__bbUpdateThemeIcons === "function") window.__bbUpdateThemeIcons();
    } catch(e) {}
  });
}
