import { registerUser } from "./auth.js";
import { showToast } from "./toast.js";

/* ─────────────────────────────────────────
   Comma formatter — same helper used across
   expense.js, settings.js, savings_planner.js
───────────────────────────────────────── */
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

// Attach formatters once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  attachCommaFormatter("salary");
  attachCommaFormatter("savings");
});

document.getElementById("registerForm").addEventListener("submit", async e => {
  e.preventDefault();

  const name     = document.getElementById("name").value.trim();
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  // Strip commas before converting — inputs now format with commas
  const salary   = Number(document.getElementById("salary").value.replace(/,/g, ""));
  const savings  = Number(document.getElementById("savings").value.replace(/,/g, ""));
  const currency = document.getElementById("currency").value;

  // Validation
  if (!name)                  {  showToast("Please enter your name","error");               return; }
  if (!email || !password)    {  showToast("Email and password are required","error");       return; }
  if (!currency)              {  showToast("Please select a currency","error");              return; }
  if (!salary || salary <= 0) { showToast("Salary must be greater than 0","error");        return; }
  if (isNaN(salary))          { showToast("Please enter a valid salary","error");           return; }
  if (savings < 0)            {  showToast("Savings cannot be negative","error");            return; }
  if (savings >= salary)      {  showToast("Savings must be less than salary","error");      return; }

  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled  = true;
  btn.innerText = "Creating account...";

  try {
    await registerUser({ name, email, password, salary, savingsTarget: savings, currency });
    window.location.href = "dashboard.html";
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
       showToast("An account with this email already exists. Please login.","error");
    } else if (err.code === "auth/weak-password") {
       showToast("Password must be at least 6 characters.","error");
    } else if (err.code === "auth/invalid-email") {
       showToast("Please enter a valid email address.","error");
    } else {
       showToast("Registration failed: " + err.message,"error");
    }
  } finally {
    btn.disabled  = false;
    btn.innerText = "Register";
  }
});