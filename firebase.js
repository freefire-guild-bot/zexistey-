import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvMVx_geWeeiNgw0ziSR80mvncHlOwKQY",
  authDomain: "zexi-bot.firebaseapp.com",
  projectId: "zexi-bot",
  storageBucket: "zexi-bot.firebasestorage.app",
  messagingSenderId: "245993811972",
  appId: "1:245993811972:web:e25ed7ef03d118a4fd8551"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };