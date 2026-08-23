import { db } from "./firebase-config.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { requireAuth } from "./auth.js";
import { showToast } from "./toast.js";

export const state = {
  user: null,
  firebaseUser: null,
  appReady: false
};

export function getCurrency() {
  return state.user?.currency || "₹";
}

function initApp(onReady) {
  requireAuth(async (fbUser, userData) => {
    state.firebaseUser = fbUser;
    state.user = userData;
    state.appReady = true;
    normalizeUser();
    migrateCategories();
    await checkForNewMonth();
    onReady(state.user);
  });
}

// ── Debounce helper ──────────────────────────────────────────────
// Prevents multiple rapid saves (e.g. currency picker) from firing
// multiple Firestore writes. Only the last call within `wait` ms fires.
let _saveTimer = null;

function debouncedSave(showMessage = false, wait = 600) {
  return new Promise((resolve, reject) => {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async () => {
      try {
        await _doSave(showMessage);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, wait);
  });
}

async function _doSave(showMessage = false) {
  if (!state.appReady || !state.firebaseUser) return;
  try {
    await setDoc(doc(db, "users", state.firebaseUser.uid), state.user, { merge: true });
    if (showMessage) showToast("Saved successfully", "success");
  } catch (err) {
    console.error("Save failed:", err);
    showToast("Failed to save. Try again.", "error");
    throw err;
  }
}

// ── saveUser ────────────────────────────────────────────────────
// Pass `debounce: true` for fast UI interactions like currency changes.
// Pass nothing (or debounce: false) for critical saves that must fire immediately.
async function saveUser(showMessage = false, { debounce = false } = {}) {
  if (debounce) {
    return debouncedSave(showMessage);
  }
  return _doSave(showMessage);
}

async function syncUserFromStorage() {
  if (!state.firebaseUser) return;
  if (!navigator.onLine) {
    console.log("Offline — skipping sync, using cached state.");
    return;
  }
  try {
    const snap = await getDoc(doc(db, "users", state.firebaseUser.uid));
    if (snap.exists()) {
      state.user = snap.data();
      normalizeUser();
    }
  } catch (err) {
    console.warn("Sync failed, keeping current state:", err.message);
  }
}

function normalizeUser() {
  if (!state.user) return;
  state.user.salary = typeof state.user.salary === "number" && state.user.salary > 0 ? state.user.salary : 0;
  state.user.savingsTarget = typeof state.user.savingsTarget === "number" ? state.user.savingsTarget : 0;
  state.user.payments = Array.isArray(state.user.payments) ? state.user.payments : [];
  state.user.months = state.user.months && typeof state.user.months === "object" ? state.user.months : {};
  state.user.customCategories = Array.isArray(state.user.customCategories) ? state.user.customCategories : [];
  state.user.currency = state.user.currency || "₹";
  state.user.name = state.user.name || "";

  // Always preserve FCM tokens — never let normalizeUser wipe them
  state.user.fcmTokens = Array.isArray(state.user.fcmTokens) ? state.user.fcmTokens : [];

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  if (!state.user.currentMonth) state.user.currentMonth = currentMonthKey;

  if (!state.user.months[state.user.currentMonth]) {
    state.user.months[state.user.currentMonth] = {
      salary: state.user.salary,
      savingsTarget: state.user.savingsTarget,
      budget: Math.max(state.user.salary - state.user.savingsTarget, 0),
      expenses: [], extraFunds: [], carryForward: 0
    };
  }

  const month = state.user.months[state.user.currentMonth];
  month.expenses   = Array.isArray(month.expenses)   ? month.expenses   : [];
  month.extraFunds = Array.isArray(month.extraFunds) ? month.extraFunds : [];
  if (typeof month.carryForward !== "number") month.carryForward = 0;
}

function migrateCategories() {
  if (!state.user) return;
  Object.keys(state.user.months).forEach(monthKey => {
    state.user.months[monthKey].expenses.forEach(exp => {
      if (exp.category === "Food" || exp.category === "Food & Dinning") exp.category = "Food & Dining";
      if (exp.category === "SIP")     exp.category = "Investments (SIP)";
      if (exp.category === "Payback") exp.category = "Loans / EMI";
      if (exp.category === "Others")  exp.category = "Other";
    });
  });
}

async function checkForNewMonth() {
  if (!state.user) return;
  const newMonth = new Date().toISOString().slice(0, 7);
  if (state.user.currentMonth === newMonth) return;

  const previousMonth = state.user.currentMonth;
  const prevData      = state.user.months[previousMonth];

  if (!prevData) {
    state.user.currentMonth = newMonth;
    await saveUser();
    return;
  }

  const baseBudget        = prevData.budget || Math.max(state.user.salary - state.user.savingsTarget, 0);
  const extraTotal        = prevData.extraFunds.reduce((sum, f) => sum + f.amount, 0);
  const totalSpent        = prevData.expenses.reduce((sum, e) => sum + e.amount, 0);
  const previousRemaining = baseBudget + extraTotal + (prevData.carryForward || 0) - totalSpent;

  state.user.currentMonth = newMonth;
  if (!state.user.months[newMonth]) {
    state.user.months[newMonth] = {
      salary:        state.user.salary,
      savingsTarget: state.user.savingsTarget,
      budget:        Math.max(state.user.salary - state.user.savingsTarget, 0),
      expenses:      [],
      extraFunds:    [],
      carryForward:  previousRemaining > 0 ? Math.round(previousRemaining * 100) / 100 : 0
    };
  }
  await saveUser();
}

function getMonthlyBudget(monthKey = state.user.currentMonth) {
  if (!state.user) return 0;
  return state.user.months[monthKey]?.budget || 0;
}

function getEffectiveBudget(monthKey = state.user.currentMonth) {
  const baseBudget = getMonthlyBudget(monthKey);
  const month = state.user.months[monthKey] || { expenses: [], extraFunds: [], carryForward: 0 };
  const extraTotal = month.extraFunds.reduce((sum, f) => sum + f.amount, 0);
  return Math.round((baseBudget + extraTotal + (month.carryForward || 0)) * 100) / 100;
}

function getTotalSpent(monthKey = state.user.currentMonth) {
  const month = state.user.months[monthKey] || { expenses: [] };
  return Math.round(month.expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
}

function getRemainingBalance(monthKey = state.user.currentMonth) {
  return Math.round((getEffectiveBudget(monthKey) - getTotalSpent(monthKey)) * 100) / 100;
}

function getSpentPercentage(monthKey = state.user.currentMonth) {
  const budget = getEffectiveBudget(monthKey);
  if (!budget) return 0;
  return Math.min(Math.round((getTotalSpent(monthKey) / budget) * 100), 100);
}

function getTopCategory() {
  const month = state.user.months[state.user.currentMonth];
  if (!month.expenses.length) return null;
  const totals = {};
  month.expenses.forEach(exp => {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
  });
  return Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b);
}

function hasUserData() {
  if (!state.appReady) return false;
  const month = state.user.months[state.user.currentMonth];
  return state.user.salary > 0 || month.expenses.length > 0 || month.extraFunds.length > 0;
}

export {
  initApp, saveUser, syncUserFromStorage, normalizeUser,
  getMonthlyBudget, getEffectiveBudget, getTotalSpent,
  getRemainingBalance, getSpentPercentage, getTopCategory, hasUserData
};