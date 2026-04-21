import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, setDoc, collection, onSnapshot, query, where, addDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB1c8emccEr0Vt6zBJVrbDMUNBZ3IZH9Vc",
    authDomain: "zexi-bot-20.firebaseapp.com",
    projectId: "zexi-bot-20",
    storageBucket: "zexi-bot-20.appspot.com",
    messagingSenderId: "819439962932",
    appId: "1:819439962932:web:a33de3f49c7cdf94aff361"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// State Variables
let userEmail = "";
let authUid = ""; 
let walletBalance = 0;

// Centralized Price Variables (Single Source of Truth)
let basePlanPrice = 350; 
let finalPrice = 350; // Replaces selectedPlanPrice globally
let currentDiscountPercent = 0;
let appliedPromoCode = "";

let isUidValid = false;
let isUtrValid = false;

let isUserInitialLoad = true;
let isTxInitialLoad = true;
let isOrderInitialLoad = true;
let isChatInitialLoad = true;

let unsubAdmin = null, unsubUser = null, unsubTx = null;
let unsubChat = null, unsubOrders = null, unsubNotifs = null, unsubPlans = null;

// DOM Elements
const el = (id) => document.getElementById(id);
const walletAmountEl = el('walletAmount');
const walletBox = el('walletBox');
const userEmailDisplay = el('userEmailDisplay');
const toastEl = el('toast');
const toastMsg = el('toast-msg');

const notificationBell = el('notificationBell');
const notifDropdown = el('notifDropdown');
const notifBadge = el('notifBadge');
const notifList = el('notifList');
let unreadNotifsCount = 0;

const guildUidInput = el('guildUid');
const uidError = el('uidError');
const continueBtn = el('continueBtn');
const utrInput = el('utrInput');
const utrErrorMsg = el('utrErrorMsg');
const submitPaymentBtn = el('submitPaymentBtn');

const promoInput = el('promoInput');
const applyPromoBtn = el('applyPromoBtn');
const promoMsg = el('promoMsg');

const paymentPlanSelect = el('paymentPlanSelect');
const paymentMethodSelect = el('paymentMethodSelect'); 
const qrImage = el('qrImage');
const qrAmount = el('qrAmount');
const qrWrapper = el('qrWrapper');

const modalOverlay = el('paymentModal');
const modalStepConfirm = el('modalStepConfirm');
const modalStepProcess = el('modalStepProcess');
const confirmPriceEl = el('confirmPrice');
const modalSpinner = el('modalSpinner');
const modalStatusMsg = el('modalStatusMsg');

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol = 0.01) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
    click: () => playTone(300, 'sine', 0.05, 0.005),
    success: () => { playTone(500, 'sine', 0.08, 0.01); setTimeout(() => playTone(700, 'sine', 0.1, 0.01), 80); },
    error: () => { playTone(200, 'triangle', 0.1, 0.01); setTimeout(() => playTone(150, 'triangle', 0.15, 0.01), 100); },
    notification: () => playTone(400, 'sine', 0.1, 0.01)
};

// Math Logic Core - Formula
function calculateFinalPrice(basePrice, discountPercent) { 
    return Math.floor(basePrice - (basePrice * discountPercent / 100)); 
}

// Global UI Updater for Prices
// Global UI Updater for Prices
function syncPricesGlobally() {
    finalPrice = calculateFinalPrice(basePlanPrice, currentDiscountPercent);
    const method = paymentMethodSelect ? paymentMethodSelect.value : 'upi';

    // Sync QR 
    if (method === 'upi') {
        const upiLink = `upi://pay?pa=BHARATPE.8Y0B1Q2W4G55700@fbpe&pn=ZEXI%20TOOL&am=${finalPrice}&cu=INR`;
        if (qrImage) qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}&color=000000&bgcolor=FFFFFF`;
        if (qrWrapper) qrWrapper.onclick = () => window.location.href = upiLink;
    } else if (method === 'binance') {
        if (qrImage) qrImage.src = `https://i.ibb.co/q38hkp9w/Screenshot-20260415-171421-Binance.jpg`; 
        if (qrWrapper) qrWrapper.onclick = null; 
    }

    // Sync Text Displays
    if (qrAmount) qrAmount.innerText = `₹${finalPrice}`;
    if (paymentPlanSelect) paymentPlanSelect.value = basePlanPrice.toString(); // Keeps dropdown locked to base price tracking
    if (confirmPriceEl) confirmPriceEl.innerText = `₹${finalPrice}`; // Impacts modal

    // Dynamically update UI for all Plan Cards without re-rendering the grid
    const allPlanCards = document.querySelectorAll('.plan-card');
    allPlanCards.forEach(card => {
        const cardBasePrice = parseInt(card.getAttribute('data-price'));
        const priceEl = card.querySelector('.plan-price');
        
        if (priceEl) {
            if (currentDiscountPercent > 0) {
                const cardFinalPrice = calculateFinalPrice(cardBasePrice, currentDiscountPercent);
                priceEl.innerHTML = `<span style="text-decoration: line-through; font-size: 0.7em; color: var(--text-muted); margin-right: 6px;">₹${cardBasePrice}</span>₹${cardFinalPrice}`;
            } else {
                priceEl.innerHTML = `₹${cardBasePrice}`;
            }
        }
    });
}


function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function showToast(msg, isSuccess = false) {
    if (!toastEl || !toastMsg) return;
    toastMsg.innerText = msg;
    toastEl.style.borderColor = isSuccess ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)";
    toastEl.classList.add('show');
    if (isSuccess) sounds.success(); else sounds.notification();
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// Document Listeners
document.addEventListener('click', (e) => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    const t = e.target;
    if (t.tagName === 'BUTTON' || t.closest('.nav-item') || t.closest('.plan-card') || t.closest('.country-card') || t.closest('#qrWrapper') || t.closest('.chat-msg img') || t.closest('.notification-bell')) {
        sounds.click();
    }
    
    if (notificationBell && notifDropdown) {
        if (notificationBell.contains(e.target)) {
            const isShowing = notifDropdown.style.display === 'flex';
            notifDropdown.style.display = isShowing ? 'none' : 'flex';
            if (!isShowing) {
                if (notifBadge) notifBadge.style.display = 'none';
                unreadNotifsCount = 0;
                localStorage.setItem('zexi_last_seen_notifs', Date.now());
            }
        } else if (!notifDropdown.contains(e.target)) {
            notifDropdown.style.display = 'none';
        }
    }
});

// Auth & Setup
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userEmail = user.email;
        authUid = user.uid; 
        if (userEmailDisplay) userEmailDisplay.innerText = userEmail;
        initApp();
    } else {
        cleanupListeners();
        let localGuest = localStorage.getItem("zexi_guest_email");
        if (!localGuest) {
            localGuest = "guest_" + Math.random().toString(36).substring(2, 10) + "@zexi.com";
            localStorage.setItem("zexi_guest_email", localGuest);
        }
        const pwd = "zexi_user_secure_123";
        try {
            await signInWithEmailAndPassword(auth, localGuest, pwd);
        } catch(e) {
            try {
                await createUserWithEmailAndPassword(auth, localGuest, pwd);
            } catch(err) {
                console.error("Auto login failed", err);
                showToast("System connecting...");
                setTimeout(() => window.location.reload(), 2000);
            }
        }
    }
});

if (el('logoutBtn')) {
    el('logoutBtn').addEventListener('click', async () => {
        try {
            localStorage.removeItem("zexi_guest_email");
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (err) {
            console.error("Logout Error:", err);
            showToast("Logout failed");
        }
    });
}

function cleanupListeners() {
    [unsubAdmin, unsubUser, unsubTx, unsubChat, unsubOrders, unsubNotifs, unsubPlans].forEach(u => u && u());
    unsubAdmin = unsubUser = unsubTx = unsubChat = unsubOrders = unsubNotifs = unsubPlans = null;
}

function initApp() {
    cleanupListeners();
    isUserInitialLoad = isTxInitialLoad = isOrderInitialLoad = isChatInitialLoad = true;

    // Admin Status
    const statusEl = el('supportStatus');
    const dotEl = el('supportDot');
    if (statusEl && dotEl) {
        statusEl.innerText = 'CHECKING';
        dotEl.className = 'status-dot status-offline';
        unsubAdmin = onSnapshot(doc(db, "admin_status", "status"), (docSnap) => {
            requestAnimationFrame(() => {
                let isOnline = docSnap.exists() && docSnap.data()?.online === true;
                statusEl.innerText = isOnline ? 'ONLINE' : 'OFFLINE';
                statusEl.style.color = isOnline ? 'var(--text-main)' : 'var(--text-muted)';
                dotEl.className = isOnline ? 'status-dot status-live' : 'status-dot status-offline';
            });
        });
    }

    // User Wallet
    unsubUser = onSnapshot(doc(db, "users", authUid), (docSnap) => {
        requestAnimationFrame(() => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'banned') {
                    document.body.innerHTML = `<h1 style="color:var(--error-color); text-align:center; font-family:'Inter'; margin-top:50px; font-weight:600;">ACCOUNT RESTRICTED</h1>`;
                    cleanupListeners();
                    return;
                }
                if (!isUserInitialLoad && walletBalance < (data.wallet || 0)) {
                    sounds.success();
                    showToast("Wallet Credited", true);
                    if (walletBox) {
                        walletBox.classList.remove('wallet-pulse');
                        void walletBox.offsetWidth;
                        walletBox.classList.add('wallet-pulse');
                    }
                }
                walletBalance = data.wallet || 0;
                if (walletAmountEl) walletAmountEl.innerText = `₹${walletBalance}`;
                isUserInitialLoad = false;
            } else {
                setDoc(doc(db, "users", authUid), { email: userEmail, uid: authUid, wallet: 0, status: "active" }).catch(console.error);
            }
        });
    });

    // Subscriptions
    unsubTx = onSnapshot(query(collection(db, "transactions"), where("uid", "==", authUid)), (snap) => {
        if (!isTxInitialLoad) {
            snap.docChanges().forEach(change => {
                if (change.type === "modified") {
                    if(change.doc.data().status === 'Verified') { showToast("Payment Verified", true); sounds.success(); }
                    if(change.doc.data().status === 'Rejected') { showToast("Payment Rejected"); sounds.error(); }
                }
            });
        }
        isTxInitialLoad = false;
        let txs = []; snap.forEach(d => txs.push({id: d.id, ...d.data()}));
        txs.sort((a, b) => new Date(b.time) - new Date(a.time));
        requestAnimationFrame(() => renderTransactions(txs));
    });

    unsubOrders = onSnapshot(query(collection(db, "orders"), where("uid", "==", authUid)), (snap) => {
        if (!isOrderInitialLoad) {
            snap.docChanges().forEach(change => { if (change.type === "added") { showToast("Order Active", true); sounds.success(); } });
        }
        isOrderInitialLoad = false;
        let ords = []; snap.forEach(d => ords.push(d.data()));
        ords.sort((a, b) => new Date(b.time) - new Date(a.time));
        requestAnimationFrame(() => renderOrders(ords));
    });

    unsubChat = onSnapshot(query(collection(db, "chats"), where("uid", "==", authUid)), (snap) => {
        if (!isChatInitialLoad) {
            snap.docChanges().forEach(change => { if (change.type === "added" && change.doc.data().sender === 'ZEXI') sounds.notification(); });
        }
        isChatInitialLoad = false;
        let msgs = []; snap.forEach(d => msgs.push(d.data()));
        msgs.sort((a, b) => new Date(a.time) - new Date(b.time));
        requestAnimationFrame(() => renderChat(msgs));
    });

    unsubNotifs = onSnapshot(query(collection(db, "notifications"), where("email", "in", [userEmail, "all"])), (snap) => {
        let notifs = []; snap.forEach(d => notifs.push({id: d.id, ...d.data()}));
        notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
        notifs = notifs.slice(0, 10);
        
        let newCount = 0; const lastSeen = parseInt(localStorage.getItem('zexi_last_seen_notifs') || '0');
        
        if (notifs.length === 0) {
            if (notifList) notifList.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No notifications</div>';
        } else {
            if (notifList) {
                notifList.innerHTML = notifs.map(n => {
                    const notifTime = new Date(n.time);
                    if (notifTime.getTime() > lastSeen) newCount++;
                    const timeStr = notifTime.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                    return `<div class="notif-item"><div class="notif-message">${n.message}</div><div class="notif-time">${timeStr}</div></div>`;
                }).join('');
            }
        }
        unreadNotifsCount = newCount;
        if (notifBadge) {
            if (unreadNotifsCount > 0 && (!notifDropdown || notifDropdown.style.display !== 'flex')) {
                notifBadge.innerText = unreadNotifsCount > 9 ? '9+' : unreadNotifsCount;
                notifBadge.style.display = 'flex';
                sounds.notification();
            } else { notifBadge.style.display = 'none'; }
        }
    });

    unsubPlans = onSnapshot(collection(db, "plans"), (snap) => {
        let plansData = []; snap.forEach(doc => { let d = doc.data(); if (d.active !== false) plansData.push({id: doc.id, ...d}); });
        
        if (plansData.length > 0) {
            plansData.sort((a, b) => (a.order || 0) - (b.order || 0));
            const plansGrid = el('plansGrid');
            if (plansGrid) {
                plansGrid.innerHTML = plansData.map((p, index) => `
                    <div class="plan-card ${index === 0 ? 'active' : ''}" data-plan="${p.id}" data-price="${p.price}">
                        <div class="plan-title"><i class="fas fa-bolt"></i> ${p.name}</div>
                        <div class="plan-price">₹${p.price}</div>
                        <div class="plan-details">${p.bots} • ${p.glory}</div>
                    </div>`).join('');
                
                const newPlanCards = plansGrid.querySelectorAll('.plan-card');
                newPlanCards.forEach(card => {
                    card.addEventListener('click', () => {
                        newPlanCards.forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        basePlanPrice = parseInt(card.getAttribute('data-price'));
                        validateForm(); 
                        syncPricesGlobally();
                    });
                });
                if (newPlanCards.length > 0) {
                    basePlanPrice = parseInt(newPlanCards[0].getAttribute('data-price'));
                    syncPricesGlobally();
                }
            }

            if (paymentPlanSelect) {
                paymentPlanSelect.innerHTML = plansData.map(p => `<option value="${p.price}">${p.name} - ₹${p.price}</option>`).join('');
            }
        }
    });

    syncPricesGlobally();
}

// Renders
function renderTransactions(txList) {
    const list = el('transactionList'); if (!list) return;
    if (txList.length === 0) { list.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 0.85rem; margin-top: 20px;">No recent transactions.</p>'; return; }
    
    list.innerHTML = txList.map(tx => {
        const statusClass = tx.status === 'Verified' ? 'verified' : (tx.status === 'Rejected' ? 'rejected' : 'pending');
        const date = new Date(tx.time).toLocaleString('en-US', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
        return `<div class="tx-card">
            <div class="tx-row"><span class="tx-email">${tx.email}</span><span class="tx-status ${statusClass}">${tx.status}</span></div>
            <div class="tx-row tx-details"><span>Plan: <span class="tx-highlight">₹${tx.plan}</span> ${tx.promoCode ? `<span style="color:var(--success-color); font-size: 0.7rem;">(PROMO)</span>` : ''}</span><span>UID: ${tx.gameUid || 'N/A'}</span></div>
            <div class="tx-row tx-details" style="margin-bottom: 0;"><span>UTR/TxID: <span style="color: var(--text-main); font-family: 'Inter', monospace; word-break: break-all;">${tx.utr}</span></span><span style="font-size:0.75rem;">${date}</span></div>
        </div>`;
    }).join('');
}

function renderOrders(ords) {
    const list = el('ordersList'); if (!list) return;
    if (ords.length === 0) { list.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 0.85rem; margin-top: 20px;">No active orders.</p>'; return; }

    list.innerHTML = ords.map(o => {
        const date = new Date(o.time).toLocaleDateString('en-US');
        return `<div class="tx-card">
            <div class="tx-row"><span class="tx-email" style="font-family: 'Inter', monospace; font-weight: 600;">ID#${Math.floor(10000 + Math.random() * 90000)}</span> <span class="tx-status ${o.status==='Active'?'verified':'rejected'}">${o.status}</span></div>
            <div class="tx-row tx-details"><span>Game UID: ${o.gameUid || 'N/A'}</span><span style="color: var(--text-main); font-weight: 500;">₹${o.plan}</span></div>
            <div class="tx-row tx-details" style="margin-bottom: 0;"><span>${date}</span></div>
        </div>`;
    }).join('');
}

function renderChat(messages) {
    const chatBox = el('chatBox'); if (!chatBox) return;
    if (messages.length === 0) { chatBox.innerHTML = `<p style="text-align:center; color: #52525b; margin-top: 64px; font-size: 0.85rem; font-weight: 400;">Start a conversation with Support</p>`; return; }
    
    const isScrolledToBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 50;
    chatBox.innerHTML = messages.map(msg => {
        let content = `<div class="sender">${msg.sender === 'USER' ? 'You' : msg.sender} • ${new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
        if (msg.text) content += `<div>${msg.text}</div>`;
        if (msg.img) content += `<img src="${msg.img}" alt="Attachment" loading="lazy">`;
        return `<div class="chat-msg ${msg.sender === 'USER' ? 'user' : 'zexi'}">${content}</div>`;
    }).join('');
    
    if (isScrolledToBottom) requestAnimationFrame(() => { chatBox.scrollTop = chatBox.scrollHeight; });
}

// UI Interaction Listeners
const navItems = document.querySelectorAll('.nav-item');
const pageSections = document.querySelectorAll('.page-section');
navItems.forEach(item => {
    item.addEventListener('click', () => {
        requestAnimationFrame(() => {
            navItems.forEach(nav => nav.classList.remove('active'));
            pageSections.forEach(sec => sec.classList.remove('active'));
            item.classList.add('active');
            
            const targetId = item.getAttribute('data-target');
            const targetSec = el(targetId);
            if (targetSec) targetSec.classList.add('active');
            
            if (targetId === 'section-help' && el('chatBox')) el('chatBox').scrollTop = el('chatBox').scrollHeight; 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
});

const validateForm = () => {
    if (!guildUidInput) return;
    const val = guildUidInput.value.replace(/\D/g, ''); guildUidInput.value = val;
    isUidValid = val.length >= 8;
    if (uidError) uidError.style.display = isUidValid || val.length === 0 ? 'none' : 'block';
    if (continueBtn) {
        continueBtn.disabled = !isUidValid;
        isUidValid ? continueBtn.classList.add('enabled') : continueBtn.classList.remove('enabled');
    }
};

if (guildUidInput) guildUidInput.addEventListener('input', debounce(validateForm, 200));

if (utrInput) {
    utrInput.addEventListener('input', debounce((e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); e.target.value = val;
        isUtrValid = val.length >= 12;
        if (utrErrorMsg) utrErrorMsg.style.display = isUtrValid || val.length === 0 ? 'none' : 'block';
        if (submitPaymentBtn) {
            submitPaymentBtn.disabled = !isUtrValid;
            isUtrValid ? submitPaymentBtn.classList.add('enabled') : submitPaymentBtn.classList.remove('enabled');
        }
    }, 200));
}

// Promo System Logic
if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return;
        const code = promoInput.value.trim().toUpperCase();
        if (!code) return;

        applyPromoBtn.innerText = "..."; applyPromoBtn.disabled = true;
        try {
            const q = query(collection(db, "promo_codes"), where("code", "==", code), where("isActive", "==", true));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                promoMsg.innerText = "Invalid or Expired Code"; promoMsg.style.color = "var(--error-color)"; promoMsg.style.display = "block";
                currentDiscountPercent = 0; appliedPromoCode = ""; sounds.error();
            } else {
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    currentDiscountPercent = data.discount; appliedPromoCode = code;
                    promoMsg.innerText = `${data.discount}% Discount Applied!`; promoMsg.style.color = "var(--success-color)"; promoMsg.style.display = "block";
                    sounds.success();
                });
            }
        } catch (error) { console.error("Promo error:", error); showToast("Failed to check code"); } 
        finally { applyPromoBtn.innerText = "Apply"; applyPromoBtn.disabled = false; syncPricesGlobally(); }
    });
}

if (paymentPlanSelect) paymentPlanSelect.addEventListener('change', (e) => { basePlanPrice = parseInt(e.target.value); syncPricesGlobally(); });
if (paymentMethodSelect) paymentMethodSelect.addEventListener('change', syncPricesGlobally);

document.querySelectorAll('.country-card').forEach(card => {
    card.addEventListener('click', () => { document.querySelectorAll('.country-card').forEach(c => c.classList.remove('active')); card.classList.add('active'); });
});

// Transactions & Orders (Connected to finalPrice)
if (submitPaymentBtn) {
    submitPaymentBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return;
        if (!isUtrValid) return;
        
        submitPaymentBtn.disabled = true; submitPaymentBtn.innerText = "Submitting...";

        try {
            const txQ = query(collection(db, "transactions"), where("utr", "==", utrInput.value));
            const txSnap = await getDocs(txQ);
            if(!txSnap.empty) throw new Error("Duplicate UTR");

            const enteredGameUid = guildUidInput && guildUidInput.value ? guildUidInput.value : 'N/A';
            const method = paymentMethodSelect ? paymentMethodSelect.value.toUpperCase() : 'UPI';

            await addDoc(collection(db, "transactions"), {
                uid: auth.currentUser.uid, gameUid: enteredGameUid, 
                plan: finalPrice, basePlan: basePlanPrice, promoCode: appliedPromoCode, // USING FINALPRICE
                utr: utrInput.value, method: method, email: auth.currentUser.email, status: "Pending", time: new Date().toISOString()
            });
            
            await addDoc(collection(db, "chats"), { 
                uid: auth.currentUser.uid, email: auth.currentUser.email, sender: 'USER', 
                text: `Payment submitted (${method}): ₹${finalPrice}\nID/TxID: ${utrInput.value}\nUID: ${enteredGameUid}${appliedPromoCode ? `\nPromo: ${appliedPromoCode}` : ''}\n\nWaiting for verification.`, 
                img: null, time: new Date().toISOString() 
            });

            showToast("Payment Submitted", true);
            utrInput.value = ''; isUtrValid = false;
            promoInput.value = ''; appliedPromoCode = ''; currentDiscountPercent = 0; promoMsg.style.display = 'none'; // Reset Promo
            syncPricesGlobally(); submitPaymentBtn.classList.remove('enabled');
            document.querySelector('.nav-item[data-target="section-transactions"]')?.click();
        } catch (err) {
            console.error("Tx Error:", err);
            showToast(err.message.includes("Duplicate") ? "ID already submitted." : "Failed to submit payment.");
            submitPaymentBtn.classList.add('enabled');
        } finally { submitPaymentBtn.disabled = false; submitPaymentBtn.innerText = "Submit Payment"; }
    });
}

// Wallet logic deduction
if (continueBtn) {
    continueBtn.addEventListener('click', () => {
        if (!auth.currentUser || !isUidValid) return;
        
        // Strict Validation against FINALPRICE
        if (walletBalance < finalPrice) { showToast("Insufficient Balance"); return; }
        
        if (confirmPriceEl) confirmPriceEl.innerText = `₹${finalPrice}`;
        if (modalStepConfirm) modalStepConfirm.style.display = 'block'; 
        if (modalStepProcess) modalStepProcess.style.display = 'none';
        if (modalOverlay) modalOverlay.classList.add('active');
    });
}

if (el('btnCancel')) el('btnCancel').addEventListener('click', () => modalOverlay && modalOverlay.classList.remove('active'));

if (el('btnProceed')) {
    el('btnProceed').addEventListener('click', async () => {
        if (!auth.currentUser) return;
        
        if (modalStepConfirm) modalStepConfirm.style.display = 'none'; 
        if (modalStepProcess) modalStepProcess.style.display = 'flex';
        if (modalSpinner) { modalSpinner.style.display = 'block'; modalSpinner.style.borderTopColor = 'var(--primary-orange)'; }
        if (modalStatusMsg) { modalStatusMsg.className = 'status-msg text-main'; modalStatusMsg.innerText = "Processing System..."; }
        
        try {
            const enteredGameUid = guildUidInput ? guildUidInput.value : 'N/A';
            const userDocRef = doc(db, "users", auth.currentUser.uid); 
            const userSnap = await getDoc(userDocRef);
            const realWalletBalance = userSnap.exists() ? (userSnap.data().wallet || 0) : 0;
            
            // Check real DB wallet against FINALPRICE
            if (realWalletBalance < finalPrice) throw new Error("Insufficient Balance in Database");
            
            const orderSnap = await getDocs(query(collection(db, "orders"), where("gameUid", "==", enteredGameUid)));
            if (!orderSnap.empty) throw new Error("Order exists");

            const batch = writeBatch(db);
            batch.update(userDocRef, { wallet: realWalletBalance - finalPrice }); // Deducting exact FINALPRICE

            batch.set(doc(collection(db, "orders")), {
                uid: auth.currentUser.uid, email: auth.currentUser.email,
                gameUid: enteredGameUid, plan: finalPrice, basePlan: basePlanPrice, promoCode: appliedPromoCode, // Tracking exact price + promo used
                status: "Active", time: new Date().toISOString()
            });
            await batch.commit();

            setTimeout(() => {
                if (modalStatusMsg) { modalStatusMsg.className = 'status-msg text-success'; modalStatusMsg.innerText = "Payment Successful"; }
                if (modalSpinner) modalSpinner.style.borderTopColor = 'var(--success-color)';
                sounds.success();
                setTimeout(() => {
                    if (modalStatusMsg) { modalStatusMsg.className = 'status-msg text-main'; modalStatusMsg.innerText = "Starting Service..."; }
                    if (modalSpinner) modalSpinner.style.borderTopColor = 'var(--primary-orange)';
                    setTimeout(() => {
                        if (modalSpinner) modalSpinner.style.display = 'none';
                        if (modalStatusMsg) { modalStatusMsg.className = 'status-msg text-success'; modalStatusMsg.innerHTML = "System Activated"; }
                        sounds.success();
                        setTimeout(() => {
                            if (modalOverlay) modalOverlay.classList.remove('active');
                            setTimeout(() => { if (guildUidInput) guildUidInput.value = ''; validateForm(); document.querySelector('.nav-item[data-target="section-history"]')?.click(); }, 500); 
                        }, 2000);
                    }, 1200);
                }, 800);
            }, 600);
        } catch(error) {
            console.error("Wallet Purchase Error:", error);
            if (modalOverlay) modalOverlay.classList.remove('active');
            showToast(error.message.includes("exists") ? "Order for this UID already exists." : (error.message.includes("Balance") ? "Insufficient Balance." : "Transaction failed. Try again."));
            sounds.error();
        }
    });
}

// Chat system
const chatInput = el('chatInput'), chatSendBtn = el('chatSendBtn'), chatFile = el('chatFile'), chatPreviewContainer = el('chatPreviewContainer'), removeImgBtn = el('removeImgBtn');

const updateSendBtnState = () => {
    if (chatSendBtn) chatSendBtn.disabled = !((chatInput && chatInput.value.trim() !== '') || (chatFile && chatFile.files.length > 0));
};

if (chatInput) {
    chatInput.addEventListener('input', debounce(updateSendBtnState, 150));
    chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter' && !chatSendBtn.disabled) chatSendBtn.click(); });
}
if (chatFile) chatFile.addEventListener('change', () => { if (chatPreviewContainer) chatPreviewContainer.style.display = chatFile.files.length > 0 ? 'inline-flex' : 'none'; updateSendBtnState(); });
if (removeImgBtn) removeImgBtn.addEventListener('click', () => { if (chatFile) chatFile.value = ''; if (chatPreviewContainer) chatPreviewContainer.style.display = 'none'; updateSendBtnState(); });

if (chatSendBtn) {
    chatSendBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return;
        const text = chatInput ? chatInput.value.trim() : ""; const file = chatFile && chatFile.files.length > 0 ? chatFile.files[0] : null;
        if (!text && !file) return;

        chatSendBtn.disabled = true; chatSendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; if (chatInput) chatInput.disabled = true;

        try {
            let downloadUrl = null;
            if (file) {
                const uploadTask = await uploadBytesResumable(ref(storage, `chat_images/${auth.currentUser.uid}_${Date.now()}_${file.name}`), file);
                downloadUrl = await getDownloadURL(uploadTask.ref);
            }
            await addDoc(collection(db, "chats"), { uid: auth.currentUser.uid, email: auth.currentUser.email, sender: 'USER', text: text, img: downloadUrl, time: new Date().toISOString() });
            if (chatFile) chatFile.value = ''; if (chatInput) chatInput.value = ''; if (chatPreviewContainer) chatPreviewContainer.style.display = 'none'; sounds.click();
        } catch (err) { console.error("Chat Send Error:", err); showToast("Failed to send message."); } 
        finally { if (chatInput) chatInput.disabled = false; chatSendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'; updateSendBtnState(); if (chatInput) chatInput.focus(); el('chatBox')?.scrollTo(0, el('chatBox').scrollHeight); }
    });
}

// Window resize handling
let initialHeight = window.innerHeight;
window.addEventListener("resize", debounce(() => {
    document.body.classList.toggle("keyboard-open", window.innerHeight < initialHeight - 120);
}, 150));
