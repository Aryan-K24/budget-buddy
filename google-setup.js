// google-setup.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// If user is not logged in at all, send them to login
onAuthStateChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) {
    window.location.href = "login.html";
    return;
  }

  // If user already has a Firestore profile, skip setup
  const snap = await getDoc(doc(db, "users", firebaseUser.uid));
  if (snap.exists() && snap.data().salary > 0) {
    window.location.href = "dashboard.html";
    return;
  }

  // Show their name in the welcome message
  const name = firebaseUser.displayName?.split(" ")[0] || "there";
  const msg = document.getElementById("welcomeMsg");
  if (msg) msg.innerText = `Hey ${name}! Just set your budget to get started.`;
});

document.getElementById("setupForm").addEventListener("submit", async e => {
  e.preventDefault();

  const salary = Number(document.getElementById("salary").value);
  const savings = Number(document.getElementById("savings").value);
  const btn = e.target.querySelector("button");

  if (salary <= 0) { alert("Salary must be greater than 0"); return; }
  if (savings < 0) { alert("Savings cannot be negative"); return; }
  if (savings >= salary) { alert("Savings must be less than salary"); return; }

  btn.disabled = true;
  btn.innerText = "Setting up...";

  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) { window.location.href = "login.html"; return; }

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const budget = Math.max(salary - savings, 0);

    await setDoc(doc(db, "users", firebaseUser.uid), {
      email: firebaseUser.email,
      salary,
      savingsTarget: savings,
      payments: [],
      customCategories: [],
      currentMonth: currentMonthKey,
      months: {
        [currentMonthKey]: {
          salary, savingsTarget: savings, budget,
          expenses: [], extraFunds: [], carryForward: 0
        }
      }
    });

    window.location.href = "dashboard.html";
  } catch (err) {
    alert("Setup failed: " + err.message);
    btn.disabled = false;
    btn.innerText = "Get Started";
  }
});