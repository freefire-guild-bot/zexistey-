importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB1c8emccEr0Vt6zBJVrbDMUNBZ3IZH9Vc",
  authDomain: "zexi-bot-20.firebaseapp.com",
  projectId: "zexi-bot-20",
  storageBucket: "zexi-bot-20.firebasestorage.app",
  messagingSenderId: "819439962932",
  appId: "1:819439962932:web:a33de3f49c7cdf94aff361"
});

const messaging = firebase.messaging();
