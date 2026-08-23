import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function registerUser({ name, email, password, salary, savingsTarget, currency }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const budget = Math.max(salary - savingsTarget, 0);

  await setDoc(doc(db, "users", uid), {
    name, email, salary, savingsTarget,
    currency: currency || "₹",
    payments: [],
    customCategories: [],
    currentMonth: currentMonthKey,
    months: {
      [currentMonthKey]: {
        salary, savingsTarget, budget,
        expenses: [], extraFunds: [], carryForward: 0
      }
    }
  });

  return uid;
}

async function loginUser({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

async function logoutUser() {
  await signOut(auth);
  window.location.href = "login.html";
}

async function fetchUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * requireAuth — called on every protected page.
 *
 * Root cause of the offline-page bug:
 * Firebase's onAuthStateChanged fires once with `null` on iOS/Safari PWA
 * while the SDK is still resolving the persisted session from IndexedDB —
 * even when the user IS logged in and has full network. Acting on that
 * first null immediately redirected to login → offline.html.
 *
 * Fix: auth.authStateReady() is a Promise that resolves only after Firebase
 * has finished reading the persisted auth state. We await it first, then
 * read auth.currentUser directly — which is guaranteed to be accurate.
 * No setTimeout, no race condition, no false null.
 */
function requireAuth(onReady) {
  auth.authStateReady().then(async () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      // Auth state is fully resolved and there is genuinely no user
      window.location.href = "login.html";
      return;
    }

    try {
      const userData = await fetchUserData(firebaseUser.uid);

      if (!userData) {
        // Auth account exists but no Firestore doc — corrupted state
        console.error("No user data found for uid:", firebaseUser.uid);
        window.location.href = "login.html";
        return;
      }

      onReady(firebaseUser, userData);
    } catch (err) {
      console.error("Failed to load user data:", err);
      if (!navigator.onLine) {
        window.location.href = "/offline.html";
      } else {
        // Online but Firestore failed (permissions, quota, etc.)
        document.body.innerHTML = `
          <div style="
            display:flex;flex-direction:column;align-items:center;
            justify-content:center;min-height:100vh;font-family:sans-serif;
            gap:16px;padding:2rem;text-align:center;
          ">
            <p style="font-size:1.1rem;color:#1e293b;font-weight:600;">
              Failed to load your data
            </p>
            <p style="font-size:0.9rem;color:#64748b;">
              There was a problem connecting to the database. Please try again.
            </p>
            <button onclick="window.location.reload()" style="
              padding:10px 24px;background:#7c3aed;color:white;border:none;
              border-radius:10px;font-size:0.9rem;cursor:pointer;
            ">Retry</button>
            <a href="login.html" style="font-size:0.85rem;color:#7c3aed;">Back to login</a>
          </div>`;
      }
    }
  });
}

async function deleteAccount() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("No user logged in.");
  // Delete Firestore data first
  await deleteDoc(doc(db, "users", firebaseUser.uid));
  // Then delete the Firebase Auth account
  await deleteUser(firebaseUser);
  await signOut(auth);
}

export { registerUser, loginUser, logoutUser, fetchUserData, requireAuth, deleteAccount };