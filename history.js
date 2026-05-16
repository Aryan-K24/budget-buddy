// history.js
import { initApp, getCurrency } from "./app.js";
import { logoutUser } from "./auth.js";
import { initNavbar } from "./navbar.js";

let user;

initApp((userData) => {
  user = userData;
  populateCustomCategories();
  renderHistory();

  document.getElementById("monthFilter")
    ?.addEventListener("change", renderHistory);
  document.getElementById("categoryFilter")
    ?.addEventListener("change", renderHistory);
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
  POPULATE CUSTOM CATEGORIES
  Adds any user-defined categories to the filter dropdown
************************/
function populateCustomCategories() {
  const select = document.getElementById("categoryFilter");
  if (!select) return;

  const saved = user.customCategories || [];
  saved.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/************************
  RENDER HISTORY
************************/
function renderHistory() {
  if (!user) return;

  const list        = document.getElementById("historyList");
  const summaryBox  = document.getElementById("monthlyReview");
  const selectedMonth    = document.getElementById("monthFilter")?.value;
  const selectedCategory = document.getElementById("categoryFilter")?.value;

  // Collect all expenses across all months
  let expenses = Object.values(user.months).flatMap(m => m.expenses || []);

  if (selectedMonth)    expenses = expenses.filter(e => e.date?.startsWith(selectedMonth));
  if (selectedCategory && selectedCategory !== "all") {
    expenses = expenses.filter(e => e.category === selectedCategory);
  }

  list.innerHTML = "";
  summaryBox.classList.add("hidden");

  if (!expenses.length) {
    list.innerHTML = `<p class="empty">No expenses found.</p>`;
    return;
  }

  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Build the entire HTML string first, then set innerHTML once.
  // Using innerHTML += inside a loop re-parses the entire DOM on every
  // iteration — O(n²) and causes layout thrashing on large lists.
  const c = getCurrency();
  const rows = expenses.map(e => `
    <div class="history-item">
      <div>
        <p class="category">${e.category}</p>
        <p class="date">${formatDate(e.date)}</p>
      </div>
      <p class="amount">${c}${e.amount.toLocaleString("en-IN")}</p>
    </div>
  `).join("");

  list.innerHTML = rows;

  renderSummary(expenses, selectedMonth, selectedCategory, summaryBox);
}

/************************
  RENDER SUMMARY
************************/
function renderSummary(expenses, month, category, box) {
  const c = getCurrency();
  const totalSpent = Math.round(
    expenses.reduce((sum, e) => sum + e.amount, 0) * 100
  ) / 100;

  // Category-only filter — just show total for that category
  if (category && category !== "all") {
    box.innerHTML = `
      <strong>${category} Summary</strong><br><br>
      Total ${category} Spent:
      <strong style="color:#dc2626">${c}${totalSpent.toLocaleString("en-IN")}</strong>
    `;
    box.classList.remove("hidden");
    return;
  }

  // Month filter — show full monthly overview
  if (month) {
    const extraFundsAdded = Math.round(
      Object.values(user.months)
        .flatMap(m => m.extraFunds || [])
        .filter(f => f.date?.startsWith(month))
        .reduce((sum, f) => sum + f.amount, 0) * 100
    ) / 100;

    // Build category totals
    const categoryTotals = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    let topCategory      = "—";
    let topCategoryValue = 0;
    if (Object.keys(categoryTotals).length) {
      topCategory = Object.keys(categoryTotals).reduce(
        (a, b) => categoryTotals[a] > categoryTotals[b] ? a : b
      );
      topCategoryValue = Math.round(categoryTotals[topCategory] * 100) / 100;
    }

    const baseBudget      = user.months[month]?.budget || 0;
    const carryForward    = user.months[month]?.carryForward || 0;
    const effectiveBudget = Math.round((baseBudget + extraFundsAdded + carryForward) * 100) / 100;
    const remaining       = Math.round((effectiveBudget - totalSpent) * 100) / 100;
    const target          = user.months[month]?.savingsTarget ?? user.savingsTarget ?? 0;

    let savingsResult = "";
    if (target > 0) {
      const extraSaved  = remaining > 0 ? Math.round(remaining * 100) / 100 : 0;
      const totalSaved  = Math.round((target + extraSaved) * 100) / 100;
      savingsResult = `
        Total Savings This Month:
        <strong style="color:#16a34a">${c}${totalSaved.toLocaleString("en-IN")}</strong><br>
        (Target: ${c}${target.toLocaleString("en-IN")} + Extra: ${c}${extraSaved.toLocaleString("en-IN")})
      `;
    }

    // Only show carry-forward row if it's non-zero
    const carryRow = carryForward
      ? `Carry Forward: ${c}${carryForward.toLocaleString("en-IN")}<br>` : "";

    box.innerHTML = `
      <strong>Monthly Overview (${month})</strong><br><br>
      Base Budget: ${c}${baseBudget.toLocaleString("en-IN")}<br>
      ${carryRow}
      Extra Funds Added: ${c}${extraFundsAdded.toLocaleString("en-IN")}<br>
      Effective Budget: ${c}${effectiveBudget.toLocaleString("en-IN")}<br><br>
      Total Spent: ${c}${totalSpent.toLocaleString("en-IN")}<br>
      Remaining Balance:
      <strong style="color:${remaining >= 0 ? "#16a34a" : "#dc2626"}">
        ${c}${remaining.toLocaleString("en-IN")}
      </strong><br><br>
      Top Category: <strong>${topCategory} (${c}${topCategoryValue.toLocaleString("en-IN")})</strong><br><br>
      Savings Target: ${c}${target.toLocaleString("en-IN")}<br>
      ${savingsResult}
    `;
    box.classList.remove("hidden");
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