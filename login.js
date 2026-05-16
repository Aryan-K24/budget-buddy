// login.js
import { loginUser } from "./auth.js";
import { auth, db } from "./firebase-config.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from "./toast.js";
// Email login
document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const btn = e.target.querySelector("button[type=submit]");

  if (!email || !password) {  showToast("Email and password are required","error"); return; }

  btn.disabled = true;
  btn.innerText = "Signing in...";

  try {
    await loginUser({ email, password });
    window.location.href = "dashboard.html";
  } catch (err) {
    let msg = "Login failed. Please try again.";
    if (err.code === "auth/user-not-found") msg = "No account found with this email.";
    if (err.code === "auth/wrong-password") msg = "Incorrect password.";
    if (err.code === "auth/invalid-email") msg = "Invalid email address.";
    if (err.code === "auth/invalid-credential") msg = "Invalid email or password.";
    showToast(msg, "error");
  } finally {
    btn.disabled = false;
    btn.innerText = "Continue";
  }
});

// Google login
document.getElementById("googleBtn").addEventListener("click", async () => {
  const btn = document.getElementById("googleBtn");
  btn.disabled = true;
  btn.innerHTML = `<span style="opacity:0.6">Signing in...</span>`;

  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const uid = cred.user.uid;

    // Check if this Google user already has a profile
    const snap = await getDoc(doc(db, "users", uid));

    if (snap.exists() && snap.data().salary > 0) {
      // Existing user → go straight to dashboard
      window.location.href = "dashboard.html";
    } else {
      // New Google user → go to setup page to enter salary/savings
      window.location.href = "google-setup.html";
    }
  } catch (err) {
    showToast("Google sign-in failed: " + err.message,"error");
    btn.disabled = false;
    btn.innerHTML = `
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" />
      Continue with Google
    `;
  }
});

// Forgot password
document.getElementById('forgotPassword')?.addEventListener('click', e => {
  e.preventDefault();
  // Modal is opened by inline script in login.html
});

document.getElementById('fpSend')?.addEventListener('click', async () => {
  const email = document.getElementById('fpEmail').value.trim();
  if (!email) { showToast("Enter your email address", "error"); return; }

  const btn = document.getElementById('fpSend');
  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    await sendPasswordResetEmail(auth, email);
    document.getElementById('fpOverlay').classList.remove('open');
    showToast("Reset link sent! Check your inbox/Spam.", "success");
  } catch (err) {
    showToast("Could not send reset email: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send Link";
  }
});