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
        milestonesHTML += `<div style="display:flex;align-items:center;gap:6px;font-size:12px;background:${bg};padding:5px 12px;border-radius:100px;color:${color};font-weight:${weight};"><span style="width:8px;height:8px;border-radius:50%;background:${dot};display:inline-block;flex-shrink:0;"></span>${label} · ${c}${saved.toLocaleString("en-IN")} saved</div>`;
      });

      const resultContent = document.getElementById("resultContent");

      // Build result HTML — resetBtn is rendered inline as HTML, not appended
      // as a DOM node, so it is never orphaned across multiple submissions
      resultContent.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:1.25rem;">
          <div style="background:#f8f7ff;border-radius:10px;padding:0.9rem 1rem;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">Monthly saving</div>
            <div style="font-size:1.3rem;font-weight:600;color:#7c3aed;">${c}${fmtItemSaving}</div>
          </div>
          <div style="background:#f8f7ff;border-radius:10px;padding:0.9rem 1rem;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">Item price</div>
            <div style="font-size:1.3rem;font-weight:600;color:#1e1b4b;">${c}${fmtPrice}</div>
          </div>
          <div style="background:#f8f7ff;border-radius:10px;padding:0.9rem 1rem;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">Time needed</div>
            <div style="font-size:1.3rem;font-weight:600;color:#7c3aed;">${timeString}</div>
          </div>
        </div>

        <div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">Progress timeline</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:0.5rem;">${milestonesHTML}</div>

        <div style="margin-bottom:1.25rem;">
          <button type="button" id="toggleTimeline" style="background:none;border:1px solid rgba(124,58,237,0.2);color:#7c3aed;font-size:12px;padding:5px 14px;border-radius:100px;cursor:pointer;width:auto;margin-top:6px;">▼ Show full timeline</button>
          <div id="fullTimeline" style="display:none;margin-top:10px;"></div>
        </div>

        <div style="background:#f0f4ff;border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <div>
            <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">You can buy</div>
            <div style="font-size:1.1rem;font-weight:600;color:#1e1b4b;">${itemName}</div>
            <div style="font-size:1rem;font-weight:600;color:#7c3aed;margin-top:2px;">by ${targetMonth}</div>
          </div>
          <div style="background:#7c3aed;color:white;font-size:12px;font-weight:600;padding:6px 14px;border-radius:100px;">${timeString} away</div>
        </div>

        <button type="button" id="resetBtn" style="margin-top:4px;padding:10px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;display:block;">Reset</button>
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
          const bg     = isLast ? "#f0f4ff"  : isHalf ? "#eff6ff"  : "#f8f7ff";
          const color  = isLast ? "#7c3aed"  : isHalf ? "#3b82f6"  : "#4b5563";
          const weight = (isLast || isHalf) ? "600" : "400";
          allPills += `<div style="display:flex;align-items:center;gap:5px;font-size:11px;background:${bg};padding:4px 10px;border-radius:100px;color:${color};font-weight:${weight};"><span style="width:7px;height:7px;border-radius:50%;background:${dot};display:inline-block;flex-shrink:0;"></span>Month ${m} · ${c}${saved.toLocaleString("en-IN")}${isHalf ? " · 50%" : ""}${isLast ? " 🎉" : ""}</div>`;
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