import { initApp, saveUser, getCurrency } from "./app.js";
import { logoutUser } from "./auth.js";
import { initNavbar } from "./navbar.js";
import { showToast } from "./toast.js";

let user;
let editingPaymentId = null;

const channel = new BroadcastChannel("budget_buddy_sync");

function attachCommaFormatter(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("input", () => {
    let raw = input.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    if (raw === "") return;
    const parts = raw.split(".");
    parts[0] = Number(parts[0]).toLocaleString("en-IN");
    input.value = parts.join(".");
  });
}

initApp((userData) => {
  user = userData;
  renderPayments();
  attachCommaFormatter("paymentAmount");

  document.getElementById("openModal").onclick  = () => openAddModal();
  document.getElementById("closeModal").onclick = closePaymentModal;
  document.getElementById("paymentForm").onsubmit = savePayment;
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

/* ─────────────────────────────────────────
   Modal helpers
───────────────────────────────────────── */
function openAddModal() {
  editingPaymentId = null;
  document.getElementById("paymentForm").reset();
  document.querySelector(".modal-content h3").innerText = "Add Payment";
  document.getElementById("paymentModal").classList.add("open");
}

function openEditModal(payment) {
  editingPaymentId = payment.id;
  document.getElementById("paymentTitle").value     = payment.title;
  document.getElementById("paymentAmount").value    = payment.amount.toLocaleString("en-IN");
  document.getElementById("paymentDueDate").value   = payment.dueDate;
  document.getElementById("paymentRecurring").value = payment.recurring;
  document.querySelector(".modal-content h3").innerText = "Edit Payment";
  document.getElementById("paymentModal").classList.add("open");
}

function closePaymentModal() {
  document.getElementById("paymentModal").classList.remove("open");
  editingPaymentId = null;
}

// Close modal when clicking the backdrop
document.getElementById("paymentModal")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("paymentModal")) closePaymentModal();
});

/* ─────────────────────────────────────────
   Save payment
───────────────────────────────────────── */
async function savePayment(e) {
  e.preventDefault();

  const title   = document.getElementById("paymentTitle").value.trim();
  const amount  = Number(document.getElementById("paymentAmount").value.replace(/,/g, ""));
  const dueDate = document.getElementById("paymentDueDate").value;

  // Validate with toast feedback instead of silently doing nothing
  if (!title)            { showToast("Enter a payment title", "error");  return; }
  if (!amount || amount <= 0) { showToast("Enter a valid amount", "error"); return; }
  if (!dueDate)          { showToast("Select a due date", "error");      return; }

  const data = {
    id:        editingPaymentId || Date.now().toString(),
    title,
    amount,
    dueDate,
    recurring: document.getElementById("paymentRecurring").value
  };

  const isEditing = !!editingPaymentId;
  if (isEditing) {
    user.payments = user.payments.map(p => p.id === editingPaymentId ? data : p);
  } else {
    user.payments.push(data);
  }

  renderPayments();
  closePaymentModal();
  showToast(isEditing ? "Payment updated ✓" : "Payment saved ✓", "success");

  try {
    await saveUser();
    channel.postMessage({ type: "expenses_updated" });
  } catch (err) {
    console.error("Save failed:", err);
    showToast("Failed to save", "error");
  }
}

/* ─────────────────────────────────────────
   Render payments list
───────────────────────────────────────── */
function renderPayments() {
  const list = document.getElementById("paymentsList");
  if (!list) return;

  if (!user.payments.length) {
    list.innerHTML = `<p class="empty">No upcoming payments.</p>`;
    list.onclick = null;
    return;
  }

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const c     = getCurrency();

  // Build HTML string once — avoids O(n²) innerHTML += re-parsing
  const rows = user.payments.map(p => {
    const [year, month, day] = p.dueDate.split("-");
    const due  = new Date(year, month - 1, day);
    const days = Math.floor((due - today) / 86400000);

    let urgency = "safe", statusText = "";
    if (days < 0)       { urgency = "danger";  statusText = `Overdue by ${Math.abs(days)} day${Math.abs(days) > 1 ? "s" : ""}`; }
    else if (days === 0){ urgency = "danger";  statusText = "Due Today"; }
    else if (days === 1){ urgency = "warning"; statusText = "Tomorrow"; }
    else if (days <= 3) { urgency = "danger";  statusText = `In ${days} days`; }
    else if (days <= 7) { urgency = "warning"; statusText = `In ${days} days`; }
    else                {                       statusText = `In ${days} days`; }

    return `
      <div class="payment-card ${urgency}" data-id="${p.id}">
        <div>
          <p class="title">${p.title}</p>
          <p class="meta">${c}${p.amount.toLocaleString("en-IN")} · ${statusText}</p>
        </div>
        <div class="actions">
          <button class="done" type="button">✔</button>
          <button class="edit" type="button">✏️</button>
          <button class="delete" type="button">🗑️</button>
        </div>
      </div>`;
  }).join("");

  list.innerHTML = rows;

  // Single delegated listener — reassigned fresh after each render
  list.onclick = handlePaymentActions;
}

/* ─────────────────────────────────────────
   Payment action handler (delegated)
───────────────────────────────────────── */
async function handlePaymentActions(e) {
  const card = e.target.closest(".payment-card");
  if (!card) return;

  const id      = card.dataset.id;
  const payment = user.payments.find(p => p.id === id);
  if (!payment) return;

  if (e.target.classList.contains("edit")) {
    openEditModal(payment);
    return; // early return — no save needed
  }

  if (e.target.classList.contains("delete")) {
    if (!confirm("Delete this payment?")) return;
    user.payments = user.payments.filter(p => p.id !== id);
    showToast("Payment deleted", "success");
  }

  if (e.target.classList.contains("done")) {
    if (payment.recurring === "monthly") {
      const d = new Date(payment.dueDate);
      d.setMonth(d.getMonth() + 1);
      payment.dueDate = d.toISOString().split("T")[0];
      showToast("Payment marked done ✓", "success");
    } else {
      user.payments = user.payments.filter(p => p.id !== id);
      showToast("Payment completed ✓", "success");
    }
  }

  renderPayments();

  try {
    await saveUser();
    channel.postMessage({ type: "expenses_updated" });
  } catch (err) {
    console.error("Save failed:", err);
    showToast("Failed to save", "error");
  }
}