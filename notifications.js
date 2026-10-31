// notifications.js
import { db } from "./firebase-config.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessagingInstance } from "./firebase-config.js";
import { state, getCurrency } from "./app.js";

const VAPID_KEY = "BJa2pH_pb5ANtPJnMwjHCy-JGoj_A5crbsis6w1yU41i43R14N24bNGt548ORzaMH2t0u-iMOtw51VuOFvDrVlk";

export async function initNotifications() {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;

    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.log("FCM not supported on this browser");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return;
    }

    const { getToken } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js");

    const swReg = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg
    });

    if (!token) return;

    console.log("FCM token:", token);

    if (!state.firebaseUser) {
      console.warn("firebaseUser not ready, retrying...");
      setTimeout(() => initNotifications(), 2000);
      return;
    }

    // Save token directly to Firestore using arrayUnion — this NEVER
    // wipes other tokens from other devices. Completely independent
    // of saveUser() which overwrites the whole document.
    // Get existing tokens, remove stale ones, keep only valid + new
    const existing = state.user?.fcmTokens || [];
    const updatedTokens = [...new Set([...existing, token])];

    await setDoc(
      doc(db, "users", state.firebaseUser.uid),
      { fcmTokens: updatedTokens },
      { merge: true }
    );

    // Also update in-memory state so current session has it
    if (state.user) {
       state.user.fcmTokens = updatedTokens;
    }
    console.log("FCM token saved to Firestore ✅");

  } catch (err) {
    console.error("Notification init failed:", err);
  }
}

let _syncingToken = false;
export async function autoSyncNotificationToken() {
  if (_syncingToken) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!state.firebaseUser) return;

  _syncingToken = true;
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    const { getToken } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js");
    const swReg = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg
    });

    if (!token) return;

    const existing = state.user?.fcmTokens || [];
    if (!existing.includes(token)) {
      const updatedTokens = [...new Set([...existing, token])];
      await setDoc(
        doc(db, "users", state.firebaseUser.uid),
        { fcmTokens: updatedTokens },
        { merge: true }
      );
      if (state.user) {
        state.user.fcmTokens = updatedTokens;
      }
      console.log("FCM token auto-synced ✅");
    }
  } catch (err) {
    console.warn("Silent token sync bypassed:", err.message);
  } finally {
    _syncingToken = false;
  }
}

export function checkBudgetAlert(remaining, effectiveBudget) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!effectiveBudget) return;

  const c = getCurrency();
  const percent = Math.round(((effectiveBudget - remaining) / effectiveBudget) * 100);

  if (remaining < 0) {
    showLocalNotification("🚨 Over Budget!", `You've exceeded your budget by ${c}${Math.abs(remaining).toLocaleString("en-IN")}.`);
  } else if (percent >= 90) {
    showLocalNotification("⚠️ 90% Budget Used", `Only ${c}${remaining.toLocaleString("en-IN")} left this month!`);
  } else if (percent >= 50) {
    showLocalNotification("📊 50% Budget Used", `You've used half your budget. ${c}${remaining.toLocaleString("en-IN")} remaining.`);
  }
}

function showLocalNotification(title, body) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        vibrate: [200, 100, 200]
      });
    }).catch(() => {});
  }
}