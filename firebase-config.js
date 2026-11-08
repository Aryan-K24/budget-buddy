import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, setPersistence, indexedDBLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDg9uWb4nNgbn9dlnc9Or4nHVCa_S5eA0U",
  authDomain: "budget-buddy-e8fa5.firebaseapp.com",
  projectId: "budget-buddy-e8fa5",
  storageBucket: "budget-buddy-e8fa5.firebasestorage.app",
  messagingSenderId: "770514003150",
  appId: "1:770514003150:web:434b933a204f0dc7f11c9f",
  measurementId: "G-R6MQ4K2N0Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Firebase Analytics safely
export let analytics = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log("Firebase Analytics initialized ✅");
  }
}).catch(err => {
  console.warn("Analytics not supported:", err);
});

// indexedDB works properly on iOS PWA unlike browserLocalPersistence
setPersistence(auth, indexedDBLocalPersistence).catch(() => {});

if ('serviceWorker' in navigator) {
  // Unregister firebase-messaging-sw.js if still active — prevents double notifications
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const reg of registrations) {
      if (reg.active?.scriptURL.includes('firebase-messaging-sw.js')) {
        reg.unregister();
        console.log('Unregistered old firebase-messaging-sw.js ✅');
      }
    }
  });

  navigator.serviceWorker.register('/sw.js').catch(err => {
    console.error('SW registration failed:', err);
  });
}

export async function getMessagingInstance() {
  try {
    const { getMessaging, isSupported } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js");
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch (e) {
    console.log("Messaging not supported:", e.message);
    return null;
  }
}

window.addEventListener("offline", () => {
  window.location.href = "/offline.html";
});
