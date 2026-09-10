// savings_planner.js
import { initApp, getCurrency } from "./app.js";
import { logoutUser } from "./auth.js";
import { initNavbar } from "./navbar.js";
import { showToast } from "./toast.js";

/************************
  COMMA FORMATTER
  Same helper used in settings.js and expense.js.
  Formats integer part with en-IN grouping,
  preserves decimal point.
************************/
function attachCommaFormatter(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("input", () => {
    let raw = input.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    if (!raw) return;
    const [integer, ...rest] = raw.split(".");
    const formatted = Number(integer).toLocaleString("en-IN");
    input.value = rest.length ? `${formatted}.${rest.join("")}` : formatted;
  });
}

/************************
  PLACEHOLDERS
  Called once auth resolves (so currency symbol is known)
  AND on visibility change (tab switching).
************************/
function updatePlaceholders() {
  const c = getCurrency();
  const salary  = document.getElementById("monthly-salary");
  const savings = document.getElementById("monthly-savings");
  const price   = document.getElementById("item-price");
  if (salary)  salary.placeholder  = `Monthly Salary (${c})`;
  if (savings) savings.placeholder = `General Savings Goal (${c})`;
  if (price)   price.placeholder   = `Item Price (${c})`;
}

// Auth-gated: runs after user data is loaded
initApp(() => {
  updatePlaceholders();
});

/************************
  NAVBAR + MAIN LOGIC
  Both wired inside DOMContentLoaded so the DOM is
  guaranteed to exist before we query elements.
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

  // Re-apply placeholders if user switches tabs and comes back
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") updatePlaceholders();
  });

  // Attach comma formatters — inputs exist in DOM at DOMContentLoaded
  attachCommaFormatter("monthly-salary");
  attachCommaFormatter("monthly-savings");
  attachCommaFormatter("item-price");


  const plannerForm  = document.getElementById("plannerForm");
  const resultBox    = document.getElementById("resultBox");
  const calculateBtn = document.getElementById("calculateBtn");
  const percentInput = document.getElementById("save-percent");

  function formatTime(totalMonths) {
    if (totalMonths < 12) return `${totalMonths} ${totalMonths === 1 ? "month" : "months"}`;
    const years = Math.floor(totalMonths / 12);
    const rem   = totalMonths % 12;
    return `${years} ${years === 1 ? "year" : "years"}${rem > 0 ? ` and ${rem} ${rem === 1 ? "month" : "months"}` : ""}`;
  }

  plannerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    calculateBtn.disabled = true;
    calculateBtn.style.opacity = "0.7";
    calculateBtn.innerText = "Calculating... ⏳";
    resultBox.classList.add("hidden");

    const c = getCurrency();

    setTimeout(() => {
      // Strip commas before parsing
      const salary = Number(
        document.getElementById("monthly-salary").value.replace(/,/g, "")
      );
      const genSavings = Number(
        document.getElementById("monthly-savings").value.replace(/,/g, "")
      );
      const itemName = document.getElementById("item-name").value.trim();
      const price = Number(
        document.getElementById("item-price").value.replace(/,/g, "")
      );

      let percent = parseFloat(percentInput.value);
      if (isNaN(percent) || percent <= 0) { percent = 20; percentInput.value = 20; }
      if (percent > 100) { percent = 100; percentInput.value = 100; }

      // ── Validation — guard against NaN / zero / Infinity ──
      if (!salary || salary <= 0) {
        showToast("Please enter a valid monthly salary.", "error");
        calculateBtn.disabled = false;
        calculateBtn.style.opacity = "1";
        calculateBtn.innerText = "Calculate Plan";
        return;
      }
      if (!genSavings || genSavings <= 0) {
        showToast("Savings goal must be greater than 0.","error");
        calculateBtn.disabled = false;
        calculateBtn.style.opacity = "1";
        calculateBtn.innerText = "Calculate Plan";
        return;
      }
      if (!price || price <= 0) {
        showToast("Please enter a valid item price.","error");
        calculateBtn.disabled = false;
        calculateBtn.style.opacity = "1";
        calculateBtn.innerText = "Calculate Plan";
        return;
      }
      if (!itemName) {
        showToast("Please enter what you want to buy.","error");
        calculateBtn.disabled = false;
        calculateBtn.style.opacity = "1";
        calculateBtn.innerText = "Calculate Plan";
        return;
      }

      const itemSavingPerMonth = genSavings * (percent / 100);

      // Guard: if saving per month is 0 or tiny, totalMonths would be Infinity
      // and the full-timeline loop would freeze the tab
      if (itemSavingPerMonth <= 0) {
        showToast("Saving amount per month is too low. Increase your savings goal or percentage.", "error");
        calculateBtn.disabled = false;
        calculateBtn.style.opacity = "1";
        calculateBtn.innerText = "Calculate Plan";
        return;
      }

      const totalMonths = Math.ceil(price / itemSavingPerMonth);

      // Safety cap: refuse to render a timeline longer than 600 months (50 years)
      if (!isFinite(totalMonths) || totalMonths > 600) {
        showToast("This goal would take over 50 years. Try adjusting your savings amount or percentage.", "error");
        calculateBtn.disabled = false;
        calculateBtn.style.opacity = "1";
        calculateBtn.innerText = "Calculate Plan";
        return;
      }

      const timeString    = formatTime(totalMonths);
      const fmtPrice      = new Intl.NumberFormat("en-IN").format(price);
      const fmtItemSaving = new Intl.NumberFormat("en-IN").format(itemSavingPerMonth);

      const today       = new Date();
      const targetDate  = new Date(today.getFullYear(), today.getMonth() + totalMonths, 1);
      const targetMonth = targetDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
      const halfwayMonths = Math.ceil(totalMonths / 2);

      // Deduplicated milestone pills
      const milestoneMonths = [...new Set([1, halfwayMonths, totalMonths])];
      let milestonesHTML = "";
      milestoneMonths.forEach(m => {
        const saved  = Math.min(Math.round(itemSavingPerMonth * m), price);
        const isLast = m === totalMonths;
        const isHalf = m === halfwayMonths && m !== totalMonths;
        const dot    = isLast ? "#7c3aed" : isHalf ? "#3b82f6" : "#9ca3af";
        const bg     = isLast ? "#f0f4ff" : "#f8f7ff";
        const color  = isLast ? "#7c3aed" : "#4b5563";
        const weight = isLast ? "600" : "400";
        const label  = isLast
          ? `Goal reached 🎉 — ${formatTime(m)}`
          : isHalf
            ? `50% there — ${formatTime(m)}`
            : `Start — Month 1`;
        milestonesHTML += `<div class="planner-milestone-pill ${isLast ? 'is-last' : isHalf ? 'is-half' : ''}"><span class="planner-dot" style="background:${dot};"></span>${label} · ${c}${saved.toLocaleString("en-IN")} saved</div>`;
      });

      const resultContent = document.getElementById("resultContent");

      // Build result HTML — resetBtn is rendered inline as HTML, not appended
      // as a DOM node, so it is never orphaned across multiple submissions
      resultContent.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:1.25rem;">
          <div class="planner-stat-card">
            <div class="planner-stat-label">Monthly saving</div>
            <div class="planner-stat-value purple">${c}${fmtItemSaving}</div>
          </div>
          <div class="planner-stat-card">
            <div class="planner-stat-label">Item price</div>
            <div class="planner-stat-value">${c}${fmtPrice}</div>
          </div>
          <div class="planner-stat-card">
            <div class="planner-stat-label">Time needed</div>
            <div class="planner-stat-value purple">${timeString}</div>
          </div>
        </div>

        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Progress timeline</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:0.5rem;">${milestonesHTML}</div>

        <div style="margin-bottom:1.25rem;">
          <button type="button" id="toggleTimeline" class="planner-timeline-btn">▼ Show full timeline</button>
          <div id="fullTimeline" style="display:none;margin-top:10px;"></div>
        </div>

        <div class="planner-goal-box">
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">You can buy</div>
            <div class="planner-goal-title">${itemName}</div>
            <div class="planner-goal-target">by ${targetMonth}</div>
          </div>
          <div class="planner-goal-badge">${timeString} away</div>
        </div>

        <button type="button" id="resetBtn" class="planner-reset-btn">Reset</button>
      `;

      // Wire up reset — button is now in the DOM after innerHTML
      document.getElementById("resetBtn")?.addEventListener("click", () => {
        plannerForm.reset();
        percentInput.value = "";
        resultBox.classList.add("hidden");
      });

      // Wire up full timeline toggle
      const toggleBtn    = document.getElementById("toggleTimeline");
      const fullTimeline = document.getElementById("fullTimeline");
      if (toggleBtn && fullTimeline) {
        let allPills = '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
        for (let m = 1; m <= totalMonths; m++) {
          const saved  = Math.min(Math.round(itemSavingPerMonth * m), price);
          const isLast = m === totalMonths;
          const isHalf = m === halfwayMonths;
          const dot    = isLast ? "#7c3aed" : isHalf ? "#3b82f6" : "#9ca3af";
          allPills += `<div class="planner-milestone-pill ${isLast ? 'is-last' : isHalf ? 'is-half' : ''}"><span class="planner-dot" style="background:${dot};"></span>Month ${m} · ${c}${saved.toLocaleString("en-IN")}${isHalf ? " · 50%" : ""}${isLast ? " 🎉" : ""}</div>`;
        }
        allPills += "</div>";
        fullTimeline.innerHTML = allPills;

        toggleBtn.addEventListener("click", () => {
          const isHidden = fullTimeline.style.display === "none";
          fullTimeline.style.display = isHidden ? "block" : "none";
          toggleBtn.textContent = isHidden ? "▲ Hide full timeline" : "▼ Show full timeline";
        });
      }

      resultBox.classList.remove("hidden");
      calculateBtn.disabled = false;
      calculateBtn.style.opacity = "1";
      calculateBtn.innerText = "Calculate Plan";
    }, 3000);
  });
});