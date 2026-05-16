// firebase-messaging-sw.js
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
// sw.js handles all notifications — nothing here 