import { state, initApp, syncUserFromStorage, getMonthlyBudget, getEffectiveBudget, getTotalSpent, getRemainingBalance, getSpentPercentage, getTopCategory, hasUserData, getCurrency } from "./app.js";
import { initNavbar } from "./navbar.js";
import { logoutUser } from "./auth.js";
import { initNotifications } from "./notifications.js";

let lastChartHash = "";
let lastSyncTime = 0;

// Listen for expense/payment changes broadcast from other pages or tabs.
// Same-tab changes update state.user in memory directly; other tabs need a sync.
const channel = new BroadcastChannel("budget_buddy_sync");
channel.addEventListener("message", async (e) => {
  if (e.data?.type === "expenses_updated") {
    updateDashboardUI();           // instant update from state
    renderUpcomingPayments();
    setTimeout(() => renderSpendingChart(), 100);
    await syncUserFromStorage();   // then sync in background
    updateDashboardUI();           // refresh again after sync
    renderUpcomingPayments();
    setTimeout(() => renderSpendingChart(), 100);
  }
});

initApp(async () => {
  updateDashboardUI();
  renderUpcomingPayments();
  setTimeout(() => renderSpendingChart(), 100);

  // Notifications — request with user gesture on iOS
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      await initNotifications();
    } else if (Notification.permission === "default") {
      const banner = document.getElementById("notifBanner");
      if (banner) banner.style.display = "flex";

      document.getElementById("enableNotifBtn")?.addEventListener("click", async () => {
        banner.style.display = "none";
        await initNotifications();
      });
    }
  }
});

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    const now = Date.now();
    if (now - lastSyncTime > 60000) {
      lastSyncTime = now;
      await syncUserFromStorage();
    }
    updateDashboardUI();
    renderUpcomingPayments();
    setTimeout(() => renderSpendingChart(), 100);
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

/* ─────────────────────────────────────────
   Advice copy per category
───────────────────────────────────────── */
function getMonthlyAdvice(category) {
  const advice = {
    "Food & Dining":      "🍱 Try avoiding outside meals to avoid overspending.",
    "Transport":          "🚌 Consider public transport or personal vehicle to reduce travel costs.",
    "Shopping":           "🛍️ Avoid impulse buying and unnecessary purchases.",
    "Bills":              "📃 Track recurring bills to avoid surprises at month end.",
    "Entertainment":      "🎬 Plan entertainment in a budget-friendly way.",
    "Health":             "💊 Great job prioritizing your health!",
    "Education":          "📚 Investing in yourself is always worth it!",
    "Investments (SIP)":  "📈 Great job investing! Consistency builds wealth.",
    "Loans / EMI":        "💳 Paying back promptly helps maintain financial stability.",
    "Other":              "📊 Review this category to align spending with your goals."
  };
  return advice[category] || "💡 Review this category and consider setting a spending limit.";
}

/* ─────────────────────────────────────────
   Update dashboard cards + summary
───────────────────────────────────────── */
function updateDashboardUI() {
  const user = state.user;
  if (!user) return;

  const c = getCurrency();

  const welcomeEl = document.getElementById("welcomeMsg");
  if (welcomeEl && user.name) {
    welcomeEl.innerText = `Welcome back, ${user.name.split(" ")[0]}! 👋`;
  }

  const cards         = document.querySelectorAll(".card .amount");
  const balanceEl     = cards[0];
  const spentEl       = document.querySelector(".amount.expense");
  const topCategoryEl = cards[2];
  const savingsGoalEl = document.querySelector(".savings-goal");
  const budgetAmountEl = document.querySelector(".budget-amount");
  const percentEl     = document.querySelector(".budget-text");
  const progressEl    = document.querySelector(".progress-fill");
  const summaryEl     = document.querySelector(".monthly-summary-text");

  if (!balanceEl || !spentEl || !summaryEl) return;

  if (!hasUserData()) {
    balanceEl.innerText = "—";
    spentEl.innerText   = "—";
    if (topCategoryEl)  topCategoryEl.innerText  = "—";
    if (savingsGoalEl)  savingsGoalEl.innerText  = "Add salary & savings";
    if (budgetAmountEl) budgetAmountEl.innerText = "";
    if (percentEl)      percentEl.innerText      = "";
    if (progressEl)     progressEl.style.width   = "0%";
    summaryEl.innerText = "Add your salary and start tracking expenses.";
    return;
  }

  const baseBudget      = getMonthlyBudget();
  const effectiveBudget = getEffectiveBudget();
  const spent           = getTotalSpent();
  const remaining       = getRemainingBalance();
  const percent         = getSpentPercentage();
  const topCategory     = getTopCategory();

  if (remaining < 0) {
    balanceEl.innerText    = `-${c}${Math.abs(remaining).toLocaleString("en-IN")}`;
    balanceEl.style.color  = "#ef4444";
    if (savingsGoalEl) savingsGoalEl.innerText = "⚠️ You are over budget!";
  } else {
    balanceEl.innerText   = `${c}${remaining.toLocaleString("en-IN")}`;
    balanceEl.style.color = "";
    if (savingsGoalEl) {
      savingsGoalEl.innerText = user.savingsTarget != null
        ? `Savings Goal: ${c}${user.savingsTarget.toLocaleString("en-IN")}`
        : "Savings goal not set";
    }
  }

  spentEl.innerText = `${c}${spent.toLocaleString("en-IN")}`;

  const month      = user.months[user.currentMonth];
  const extraTotal = month.extraFunds.reduce((sum, f) => sum + f.amount, 0);
  if (budgetAmountEl) {
    const carry = month.carryForward || 0;
    const carryText = carry > 0 ? ` + Carried: ${c}${carry.toLocaleString("en-IN")}` : "";
    budgetAmountEl.innerHTML = `
      Monthly Budget: ${c}${effectiveBudget.toLocaleString("en-IN")}<br>
      <span style="font-size:12px;color:#64748b;">
        (Base: ${c}${baseBudget.toLocaleString("en-IN")} + Extra: ${c}${extraTotal.toLocaleString("en-IN")}${carryText})
      </span>
    `;
  }

  if (percentEl)  percentEl.innerText      = `${percent}% of monthly budget used`;
  if (progressEl) {
    progressEl.style.width      = `${percent}%`;
    progressEl.style.background = percent < 60 ? "#22c55e" : percent < 85 ? "#f59e0b" : "#ef4444";
  }

  if (topCategoryEl) topCategoryEl.innerText = topCategory || "—";

  summaryEl.innerHTML = topCategory
    ? `💡 This month, your highest spending was on <strong>${topCategory}</strong>.<br><br>${getMonthlyAdvice(topCategory)}`
    : "💡 Add expenses to see insights.";
}

/* ─────────────────────────────────────────
   Upcoming payments widget
───────────────────────────────────────── */
function renderUpcomingPayments() {
  const user      = state.user;
  const container = document.getElementById("upcomingPayments");
  if (!container || !user) return;

  if (!user.payments.length) {
    container.innerHTML = `<p class="empty">No upcoming payments.</p>`;
    return;
  }

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcoming = user.payments.filter(p => {
    const [year, month, day] = p.dueDate.split("-");
    const due = new Date(year, month - 1, day);
    return (due - today) / (1000 * 60 * 60 * 24) <= 10;
  });

  if (!upcoming.length) {
    container.innerHTML = `<p class="empty">No upcoming payments.</p>`;
    return;
  }

  const c = getCurrency();

  // Build HTML string once — avoids O(n²) innerHTML += re-parsing
  const rows = upcoming
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .map(p => {
      const [year, month, day] = p.dueDate.split("-");
      const due      = new Date(year, month - 1, day);
      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));

      let status = "safe", label = "";
      if (diffDays < 0)       { status = "urgent";  label = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""}`; }
      else if (diffDays === 0){ status = "urgent";  label = "Due today"; }
      else if (diffDays === 1){ status = "warning"; label = "Tomorrow"; }
      else if (diffDays <= 3) { status = "urgent";  label = `In ${diffDays} days`; }
      else if (diffDays <= 7) { status = "warning"; label = `In ${diffDays} days`; }
      else                    {                      label = `In ${diffDays} days`; }

      return `<div class="payment ${status}">
        <span>${p.title}</span>
        <span class="due ${status}">${c}${p.amount.toLocaleString("en-IN")} · ${label}</span>
      </div>`;
    })
    .join("");

  container.innerHTML = rows;
}

/* ─────────────────────────────────────────
   Spending doughnut chart
───────────────────────────────────────── */
function renderSpendingChart() {
  const user = state.user;
  if (!user) return;

  const month = user.months[user.currentMonth];
  if (!month || !month.expenses.length) return;

  // Skip re-render if data hasn't changed
  const hash = JSON.stringify(month.expenses);
  if (hash === lastChartHash) return;
  lastChartHash = hash;

  const totals = Object.create(null);
  month.expenses.forEach(exp => {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = [
    "#7c3aed", "#484648", "#10b981", "#f59e0b", "#06b6d4",
    "#ef4444", "#f97316", "#a18705", "#ec4899", "#6366f1",
    "#14b8a6", "#84cc16", "#8b5cf6", "#fb7185", "#0ea5e9"
  ];

  if (window._spendingChart) window._spendingChart.destroy();

  const canvas = document.getElementById("spendingChart");
  if (!canvas) return;

  window._spendingChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: "#ffffff",
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: "65%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${getCurrency()}${ctx.parsed.toLocaleString("en-IN")} (${Math.round(ctx.parsed / data.reduce((a, b) => a + b, 0) * 100)}%)`
          },
          displayColors: false
        }
      }
    }
  });

  const legend = document.getElementById("chartLegend");
  if (!legend) return;

  const c     = getCurrency();
  const total = data.reduce((a, b) => a + b, 0);

  // Build legend HTML string once — avoids O(n²) innerHTML += re-parsing
  legend.innerHTML = labels.map((label, i) => {
    const pct = Math.round(data[i] / total * 100);
    return `
      <div class="chart-legend-row" style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0;">
        <span style="width:10px;height:10px;border-radius:2px;background:${colors[i]};display:inline-block;flex-shrink:0;"></span>
        <span class="chart-legend-label" style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);">${label}</span>
        <span class="chart-legend-value" style="font-weight:600;color:var(--text);">${c}${data[i].toLocaleString("en-IN")} (${pct}%)</span>
      </div>`;
  }).join("");
}