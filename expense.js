// expense.js
import { initApp, saveUser, getCurrency } from "./app.js";
import { logoutUser } from "./auth.js";
import { initNavbar } from "./navbar.js";
import { showToast } from "./toast.js";

let user;
let listenersAttached = false;

// Prevents duplicate formatter listeners when edit is opened/closed repeatedly
const formatterAttached = new WeakSet();

const channel = new BroadcastChannel("budget_buddy_sync");

/************************
  NAVBAR
************************/
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutUser();
    });
  }
});

/************************
  COMMA FORMATTER
  Attaches once per element (WeakSet guard prevents
  duplicate listeners when edit rows are toggled).
  Formats integer part with en-IN grouping,
  preserves decimal point.
************************/
function attachCommaFormatter(el) {
  if (!el || formatterAttached.has(el)) return;
  formatterAttached.add(el);
  el.addEventListener("input", () => {
    let raw = el.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    if (!raw) return;
    const [integer, ...rest] = raw.split(".");
    const formatted = Number(integer).toLocaleString("en-IN");
    el.value = rest.length ? `${formatted}.${rest.join("")}` : formatted;
  });
}

/************************
  INIT
************************/
initApp((userData) => {
  user = userData;

  const amountEl = document.getElementById("expense-amount");
  if (amountEl) {
    amountEl.placeholder = `Amount (${getCurrency()})`;
    attachCommaFormatter(amountEl);
  }

  renderExpenses();
  populateCustomCategories();

  if (!listenersAttached) {
    listenersAttached = true;

    document.getElementById("expense-category")
      ?.addEventListener("change", function () {
        const customInput = document.getElementById("custom-category");
        if (this.value === "__custom__") {
          customInput.style.display = "block";
          customInput.required = true;
          customInput.focus();
        } else {
          customInput.style.display = "none";
          customInput.required = false;
          customInput.value = "";
        }
      });

    document.querySelector(".expense-form")
      ?.addEventListener("submit", handleAddExpense);

    document.getElementById("recentExpenses")
      ?.addEventListener("click", handleExpenseActions);
  }
});

/************************
  POPULATE CUSTOM CATEGORIES
************************/
function populateCustomCategories() {
  const select = document.getElementById("expense-category");
  if (!select) return;

  const saved = user.customCategories || [];
  document.querySelectorAll(".custom-category-option").forEach(el => el.remove());

  const addCustomOption = select.querySelector('option[value="__custom__"]');
  saved.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    option.className = "custom-category-option";
    select.insertBefore(option, addCustomOption);
  });
}

/************************
  ADD EXPENSE
************************/
async function handleAddExpense(e) {
  e.preventDefault();

  const amountEl = document.getElementById("expense-amount");
  const amount = Number(amountEl.value.replace(/,/g, ""));
  const categorySelect = document.getElementById("expense-category").value;
  const customInput = document.getElementById("custom-category").value.trim();
  const category = categorySelect === "__custom__" ? customInput : categorySelect;
  const note = document.getElementById("expense-note").value.trim();

  if (!amount || amount <= 0) {
    showToast("Enter a valid amount", "error");
    return;
  }
  if (!category) {
    showToast("Please select a category", "error");
    return;
  }

  if (categorySelect === "__custom__" && customInput) {
    const saved = user.customCategories || [];
    const isDuplicate = saved.some(cat => cat.toLowerCase() === customInput.toLowerCase());
    if (!isDuplicate) {
      saved.push(customInput);
      user.customCategories = saved;
      populateCustomCategories();
    }
  }

  const month = user.months[user.currentMonth];

  const spentBefore = month.expenses.reduce((s, e) => s + e.amount, 0) || 0;
  const extraTotal = month.extraFunds?.reduce((s, f) => s + f.amount, 0) || 0;
  const budget = (month.budget || 0) + extraTotal + (month.carryForward || 0);
  const spentAfter = spentBefore + amount;
  const percentBefore = Math.round((spentBefore / budget) * 100);
  const percentAfter = Math.round((spentAfter / budget) * 100);

  month.expenses.push({ amount, category, note, date: new Date().toISOString() });

  renderExpenses();

  e.target.reset();
  amountEl.placeholder = `Amount (${getCurrency()})`;
  document.getElementById("custom-category").style.display = "none";

  showToast("Expense saved ✓", "success");

  // FIX: await save first, then broadcast so dashboard gets fresh data
  try {
    await saveUser();
    channel.postMessage({ type: "expenses_updated" });
  } catch (err) {
    console.error("Save failed:", err);
    showToast("Couldn't save, check your connection", "warning");
  }

  if (budget > 0) {
    if (percentBefore < 100 && percentAfter >= 100) {
      showToast("🚨 You're over budget!", "error", "top");
    } else if (percentBefore < 90 && percentAfter >= 90) {
      showToast("⚠️ 90% of your budget used!", "warning", "top");
    } else if (percentBefore < 50 && percentAfter >= 50) {
      showToast("⚠️ 50% of your budget used!", "warning", "top");
    }
  }
}

/************************
  RENDER EXPENSES
************************/
function renderExpenses() {
  const list = document.getElementById("recentExpenses");
  if (!list) return;

  list.innerHTML = "";
  const month = user.months[user.currentMonth];

  if (!month.expenses.length) {
    list.innerHTML = `<p class="empty">No expenses added yet.</p>`;
    return;
  }

  const allCategories = [
    "Food & Dining", "Transport", "Shopping", "Bills",
    "Entertainment", "Health", "Education",
    "Investments (SIP)", "Loans / EMI", "Other",
    ...(user.customCategories || [])
  ];

  month.expenses.slice().reverse().forEach((exp, reverseIndex) => {
    const realIndex = month.expenses.length - 1 - reverseIndex;
    const item = document.createElement("div");
    item.className = "expense-item";
    item.dataset.index = realIndex;
    item.innerHTML = `
      <div class="expense-view">
        <div class="expense-left">
          <p class="expense-category">${exp.category}</p>
          <p class="expense-date">${formatDate(exp.date)}</p>
          ${exp.note ? `<p class="expense-note">${exp.note}</p>` : ""}
        </div>
        <div class="expense-actions">
          <p class="expense-amount">${getCurrency()}${exp.amount.toLocaleString("en-IN")}</p>
          <button type="button" data-action="edit">✏️</button>
          <button type="button" data-action="delete">🗑️</button>
        </div>
      </div>
      <div class="expense-edit hidden">
        <select class="edit-category">
          ${allCategories.map(c => `<option ${c === exp.category ? "selected" : ""}>${c}</option>`).join("")}
        </select>
        <input type="text" inputmode="decimal" class="edit-amount" value="${exp.amount.toLocaleString("en-IN")}" />
        <input type="text" class="edit-note" value="${exp.note || ""}" />
        <div style="display:flex;gap:8px;">
          <button type="button" data-action="save" style="flex:1;padding:8px;background:#7c3aed;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.875rem;font-weight:500;">✔ Save</button>
          <button type="button" data-action="cancel" style="flex:1;padding:8px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;cursor:pointer;font-size:0.875rem;font-weight:500;">✖ Cancel</button>
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

/************************
  ACTION HANDLER
************************/
async function handleExpenseActions(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const item = btn.closest(".expense-item");
  const index = Number(item.dataset.index);
  const month = user.months[user.currentMonth];

  if (action === "delete") {
    if (!confirm("Delete this expense?")) return;
    month.expenses.splice(index, 1);
    renderExpenses();
    showToast("Expense deleted", "success");
    // FIX: await save first, then broadcast
    try {
      await saveUser();
      channel.postMessage({ type: "expenses_updated" });
    } catch (err) {
      console.error("Save failed:", err);
    }
  }

  if (action === "edit") {
    closeAllEdits();
    item.querySelector(".expense-view").classList.add("hidden");
    const editSection = item.querySelector(".expense-edit");
    editSection.classList.remove("hidden");
    // WeakSet guard means this is safe to call every time — no duplicate listeners
    const editAmountEl = editSection.querySelector(".edit-amount");
    attachCommaFormatter(editAmountEl);
  }

  if (action === "cancel") {
    item.querySelector(".expense-edit").classList.add("hidden");
    item.querySelector(".expense-view").classList.remove("hidden");
  }

  if (action === "save") {
    const amount = Number(item.querySelector(".edit-amount").value.replace(/,/g, ""));
    const category = item.querySelector(".edit-category").value;
    const note = item.querySelector(".edit-note").value.trim();

    if (!amount || amount <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }

    month.expenses[index] = { ...month.expenses[index], amount, category, note };
    renderExpenses();
    showToast("Expense updated ✓", "success");
    // FIX: await save first, then broadcast
    try {
      await saveUser();
      channel.postMessage({ type: "expenses_updated" });
    } catch (err) {
      console.error("Save failed:", err);
    }
  }
}

/************************
  HELPERS
************************/
function closeAllEdits() {
  document.querySelectorAll(".expense-edit").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".expense-view").forEach(el => el.classList.remove("hidden"));
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}