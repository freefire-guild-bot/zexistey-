// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB1c8emccEr0Vt6zBJVrbDMUNBZ3IZH9Vc",
    authDomain: "zexi-bot-20.firebaseapp.com",
    projectId: "zexi-bot-20",
    storageBucket: "zexi-bot-20.appspot.com", // FIXED BUCKET
    messagingSenderId: "819439962932",
    appId: "1:819439962932:web:a33de3f49c7cdf94aff361"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const userEmailDisplay = document.getElementById('userEmailDisplay'); 
const walletAmountEl = document.getElementById('walletAmount'); 
const logoutBtn = document.getElementById('logoutBtn'); 

// State Variables
let currentUser = null;
let unsubscribeUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (userEmailDisplay) {
            userEmailDisplay.innerText = user.email;
        }
        setupRealtimeData(user.uid); // FIXED: Passing UID here
    } else {
        if (unsubscribeUser) {
            unsubscribeUser();
            unsubscribeUser = null;
        }
        window.location.href = "index.html";
    }
});

function setupRealtimeData(uid) {
    if (unsubscribeUser) {
        unsubscribeUser();
    }

    // FIXED: Using consistent 'uid' to fetch document
    unsubscribeUser = onSnapshot(doc(db, "users", uid), (docSnap) => {
        requestAnimationFrame(() => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                if (data.status === 'banned') {
                    document.body.innerHTML = `<h1 style="color:#ff0033; text-align:center; font-family:sans-serif; margin-top:50px;">YOUR ACCOUNT IS BANNED</h1>`;
                    return;
                }
                
                if (walletAmountEl) {
                    walletAmountEl.innerText = `₹${data.wallet || 0}`;
                }
            }
        });
    }, (error) => {
        console.error("Error fetching real-time data:", error);
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error("Error signing out:", error);
        }
    });
}
