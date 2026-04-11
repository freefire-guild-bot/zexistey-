// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, collection, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB1c8emccEr0Vt6zBJVrbDMUNBZ3IZH9Vc",
    authDomain: "zexi-bot-20.firebaseapp.com",
    projectId: "zexi-bot-20",
    storageBucket: "zexi-bot-20.firebasestorage.app",
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
const transactionListEl = document.getElementById('transactionList');

// Listeners
let unsubscribeUser = null;
let unsubscribeTx = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (userEmailDisplay) userEmailDisplay.innerText = user.email;
        setupRealtimeData(user);
    } else {
        window.location.href = "index.html";
    }
});

function setupRealtimeData(user) {
    // 1. Clear previous listeners
    if (unsubscribeUser) unsubscribeUser();
    if (unsubscribeTx) unsubscribeTx();

    // 2. REAL-TIME WALLET & STATUS LISTENER (Fixed: Now correctly uses user.uid)
    unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Handle Admin Bans
            if (data.status === 'banned') {
                document.body.innerHTML = `<h1 style="color:var(--error-color); text-align:center; font-family:'Orbitron'; margin-top:50px;">YOUR ACCOUNT IS BANNED</h1>`;
                return;
            }
            
            // Update Wallet
            if (walletAmountEl) walletAmountEl.innerText = `₹${data.wallet || 0}`;
        }
    }, (error) => console.error("Error fetching wallet data:", error));

    // 3. REAL-TIME TRANSACTIONS LISTENER
    const txQuery = query(collection(db, "transactions"), where("email", "==", user.email));
    unsubscribeTx = onSnapshot(txQuery, (snap) => {
        let txs = [];
        snap.forEach(d => txs.push({id: d.id, ...d.data()}));
        
        // Sort newest first client-side
        txs.sort((a, b) => new Date(b.time) - new Date(a.time));
        renderTransactions(txs);
    }, (error) => console.error("Error fetching transactions:", error));
}

function renderTransactions(txList) {
    if (!transactionListEl) return;
    
    if (txList.length === 0) { 
        transactionListEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No recent transactions.</p>'; 
        return; 
    }
    
    let html = '';
    txList.forEach(tx => {
        const isVerified = tx.status === 'Verified';
        const isRejected = tx.status === 'Rejected';
        const statusClass = isVerified ? 'verified' : (isRejected ? 'rejected' : 'pending');
        const date = new Date(tx.time).toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
        
        html += `<div class="tx-card">
            <div class="tx-row"><span class="tx-email">${tx.email}</span><span class="tx-status ${statusClass}">${tx.status}</span></div>
            <div class="tx-row tx-details"><span>Plan: <span class="tx-highlight">₹${tx.plan}</span></span><span>UID: ${tx.uid}</span></div>
            <div class="tx-row tx-details" style="margin-bottom: 0;"><span>UTR: <span style="color:#fff;">${tx.utr}</span></span><span style="font-size:0.75rem;">${date}</span></div>
        </div>`;
    });
    
    transactionListEl.innerHTML = html;
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    });
}
