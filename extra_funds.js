import { initApp, saveUser, getCurrency } from "./app.js";
import { logoutUser } from "./auth.js";
import { initNavbar } from "./navbar.js";
import { showToast } from "./toast.js";

let user;
let listenersAttached = false;

const channel = new BroadcastChannel("budget_buddy_sync");

// Prevents duplicate formatter listeners (same pattern as expense.js)
const formatterAttached = new WeakSet();

/************************
  COMMA FORMATTER
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

  const amountEl = document.getElementById("extra-amount");
  if (amountEl) {
    amountEl.placeholder = `Amount (${getCurrency()})`;
    attachCommaFormatter(amountEl);
  }

  renderExtraFunds();

  if (!listenersAttached) {
    listenersAttached = true;
    document.querySelector(".extra-form")
      ?.addEventListener("submit", handleAddExtraFunds);
    document.getElementById("extraFundsList")
      ?.addEventListener("click", handleExtraFundActions);
  }
});

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
  ADD EXTRA FUNDS
************************/
async function handleAddExtraFunds(e) {
  e.preventDefault();

  const amountEl = document.getElementById("extra-amount");
  const amount = Number(amountEl.value.replace(/,/g, ""));
  const note = document.getElementById("extra-note").value.trim();

  if (!amount || amount <= 0) {
    showToast("Enter a valid amount", "error");
    return;
  }

  user.months[user.currentMonth].extraFunds.push({
    amount, note, date: new Date().toISOString()
  });

  renderExtraFunds();

  // Reset manually so we can restore the dynamic placeholder
  e.target.reset();
  amountEl.placeholder = `Amount (${getCurrency()})`;

  showToast("Extra funds added ✓", "success");
  channel.postMessage({ type: "expenses_updated" });

  saveUser().catch(err => {
    console.error("Save failed:", err);
    showToast("Failed to save", "error");
  });
}

/************************
  RENDER EXTRA FUNDS
************************/
function renderExtraFunds() {
  const list = document.getElementById("extraFundsList");
  if (!list) return;
  list.innerHTML = "";

  const month = user.months[user.currentMonth];
  if (!month.extraFunds.length) {
    list.innerHTML = `<p class="empty">No extra funds added yet.</p>`;
    return;
  }

  month.extraFunds.slice().reverse().forEach((fund, reverseIndex) => {
    const realIndex = month.extraFunds.length - 1 - reverseIndex;
    const item = document.createElement("div");
    item.className = "extra-item";
    item.dataset.index = realIndex;
    item.innerHTML = `
      <div class="extra-card">
        <div class="extra-left">
          <p class="extra-date">${formatDate(fund.date)}</p>
          ${fund.note ? `<p class="extra-note">${fund.note}</p>` : ""}
        </div>
        <div class="extra-right">
          <p class="extra-amount">+ ${getCurrency()}${fund.amount.toLocaleString("en-IN")}</p>
          <div class="extra-actions">
            <button type="button" data-action="edit">✏️</button>
            <button type="button" data-action="delete">🗑️</button>
          </div>
        </div>
      </div>
      <div class="extra-edit hidden">
        <input
          type="text"
          inputmode="decimal"
          class="edit-amount"
          value="${fund.amount.toLocaleString("en-IN")}"
        />
        <input type="text" class="edit-note" value="${fund.note || ""}" />
        <button type="button" data-action="save">✔</button>
        <button type="button" data-action="cancel">✖</button>
      </div>
    `;
    list.appendChild(item);
  });
}

/************************
  ACTION HANDLER
************************/
async function handleExtraFundActions(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const item = btn.closest(".extra-item");
  const index = Number(item.dataset.index);
  const month = user.months[user.currentMonth];

  if (action === "delete") {
    if (!confirm("Delete this entry?")) return;
    month.extraFunds.splice(index, 1);
    renderExtraFunds();
    showToast("Entry deleted ✓", "success");
    channel.postMessage({ type: "expenses_updated" });
    saveUser().catch(err => console.error("Save failed:", err));
  }

  if (action === "edit") {
    item.querySelector(".extra-card").classList.add("hidden");
    const editSection = item.querySelector(".extra-edit");
    editSection.classList.remove("hidden");
    // Attach comma formatter to edit input — WeakSet prevents duplicates
    attachCommaFormatter(editSection.querySelector(".edit-amount"));
  }

  if (action === "cancel") {
    item.querySelector(".extra-edit").classList.add("hidden");
    item.querySelector(".extra-card").classList.remove("hidden");
  }

  if (action === "save") {
    // Strip commas before parsing — input now formats with commas
    const amount = Number(
      item.querySelector(".edit-amount").value.replace(/,/g, "")
    );
    const note = item.querySelector(".edit-note").value.trim();

    if (!amount || amount <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }

    month.extraFunds[index] = { ...month.extraFunds[index], amount, note };
    renderExtraFunds();
    showToast("Entry updated ✓", "success");
    channel.postMessage({ type: "expenses_updated" });
    saveUser().catch(err => console.error("Save failed:", err));
  }
}

/************************
  HELPERS
************************/
function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}