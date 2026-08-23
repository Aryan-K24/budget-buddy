const CACHE_NAME = "budget-buddy-v16"; 

const ASSETS = [
  "/", "/index.html", "/login.html", "/register.html",
  "/google-setup.html", "/dashboard.html", "/expense.html",
  "/history.html", "/payments.html", "/savings_planner.html",
  "/extra_funds.html", "/settings.html", "/offline.html",
  "/common.css", "/auth.css", "/dashboard.css", "/expense.css",
  "/history.css", "/payments.css", "/extra_funds.css",
  "/settings.css",
  "/firebase-config.js", "/app.js", "/auth.js",
  "/login.js", "/register.js", "/google-setup.js",
  "/dashboard.js", "/expense.js", "/history.js",
  "/payments.js", "/extra_funds.js", "/savings_planner.js","/icon-120x120.png",
  "/icon-152x152.png", "/icon-180x180.png", "/settings.js", "/logout.js", "/notifications.js", "/toast.js", "/navbar.js",
  "/icon-192x192.png", "/icon-512x512.png",  "/bottom-nav.js"
];

// ── Firebase Messaging (needed for iOS PWA push notifications) ──
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDg9uWb4nNgbn9dlnc9Or4nHVCa_S5eA0U",
  authDomain: "budget-buddy-e8fa5.firebaseapp.com",
  projectId: "budget-buddy-e8fa5",
  storageBucket: "budget-buddy-e8fa5.firebasestorage.app",
  messagingSenderId: "770514003150",
  appId: "1:770514003150:web:434b933a204f0dc7f11c9f"
});

const messaging = firebase.messaging();




// ── Notification click ──
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/dashboard.html")
  );
});

// ── Install ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(asset =>
          cache.add(asset).catch(err => {
            console.warn("Failed to cache:", asset, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ──
self.addEventListener("fetch", event => {
  if (
    event.request.url.includes("firestore.googleapis.com") ||
    event.request.url.includes("identitytoolkit.googleapis.com") ||
    event.request.url.includes("gstatic.com/firebasejs") ||
    event.request.url.includes("fcm.googleapis.com") ||
    event.request.url.includes("googleapis.com/mcp") ||
    event.request.url.includes("cdnjs.cloudflare.com")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("/offline.html");
        }
      });
    })
  );
});