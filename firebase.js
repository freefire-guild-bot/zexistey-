import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1c8emccEr0Vt6zBJVrbDMUNBZ3IZH9Vc",
  authDomain: "zexi-bot-20.firebaseapp.com",
  projectId: "zexi-bot-20",
  storageBucket: "zexi-bot-20.firebasestorage.app",
  messagingSenderId: "819439962932",
  appId: "1:819439962932:web:a33de3f49c7cdf94aff361"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
