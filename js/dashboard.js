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

let basePlanPrice = 350; 
let finalPrice = 350; 
let currentDiscountPercent = 0;
let appliedPromoCode = "";

let isUidValid = false;
let isUtrValid = false;

// NEW API STATE VARIABLES
let apiPlayerData = null;
let apiClanData = null;
let apiMembersList = null;
let isPlayerUidValid = false;
let isCheckingApi = false;

let isUserInitialLoad = true, isTxInitialLoad = true, isOrderInitialLoad = true, isChatInitialLoad = true;
let unsubAdmin = null, unsubUser = null, unsubTx = null, unsubChat = null, unsubOrders = null, unsubNotifs = null, unsubPlans = null;

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

const playerUidInput = el('playerUid');
const playerUidError = el('playerUidError');

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

function calculateFinalPrice(basePrice, discountPercent) { 
    return Math.floor(basePrice - (basePrice * discountPercent / 100)); 
}

function syncPricesGlobally() {
    finalPrice = calculateFinalPrice(basePlanPrice, currentDiscountPercent);
    const method = paymentMethodSelect ? paymentMethodSelect.value : 'upi';

    if (method === 'upi') {
        const upiLink = `upi://pay?pa=BHARATPE.8Y0B1Q2W4G55700@fbpe&pn=ZEXI%20TOOL&am=${finalPrice}&cu=INR`;
        if (qrImage) qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}&color=000000&bgcolor=FFFFFF`;
        if (qrWrapper) qrWrapper.onclick = () => window.location.href = upiLink;
    } else if (method === 'binance') {
        if (qrImage) qrImage.src = `https://i.ibb.co/q38hkp9w/Screenshot-20260415-171421-Binance.jpg`; 
        if (qrWrapper) qrWrapper.onclick = null; 
    }

    if (qrAmount) qrAmount.innerText = `₹${finalPrice}`;
    if (paymentPlanSelect) paymentPlanSelect.value = basePlanPrice.toString();
    if (confirmPriceEl) confirmPriceEl.innerText = `₹${finalPrice}`;

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
        try { await signInWithEmailAndPassword(auth, localGuest, pwd); } 
        catch(e) {
            try { await createUserWithEmailAndPassword(auth, localGuest, pwd); } 
            catch(err) {
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
        } catch (err) { console.error("Logout Error:", err); showToast("Logout failed"); }
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
    const statusEl = el('supportStatus'), dotEl = el('supportDot');
    if (statusEl && dotEl) {
        statusEl.innerText = 'CHECKING'; dotEl.className = 'status-dot status-offline';
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
                    cleanupListeners(); return;
                }
                if (!isUserInitialLoad && walletBalance < (data.wallet || 0)) {
                    sounds.success(); showToast("Wallet Credited", true);
                    if (walletBox) { walletBox.classList.remove('wallet-pulse'); void walletBox.offsetWidth; walletBox.classList.add('wallet-pulse'); }
                }
                walletBalance = data.wallet || 0;
                if (walletAmountEl) walletAmountEl.innerText = `₹${walletBalance}`;
                isUserInitialLoad = false;
            } else { setDoc(doc(db, "users", authUid), { email: userEmail, uid: authUid, wallet: 0, status: "active" }).catch(console.error); }
        });
    });

    // Subscriptions
    unsubTx = onSnapshot(query(collection(db, "transactions"), where("uid", "==", authUid)), (snap) => {
        if (!isTxInitialLoad) snap.docChanges().forEach(change => {
            if (change.type === "modified") {
                if(change.doc.data().status === 'Verified') { showToast("Payment Verified", true); sounds.success(); }
                if(change.doc.data().status === 'Rejected') { showToast("Payment Rejected"); sounds.error(); }
            }
        });
        isTxInitialLoad = false;
        let txs = []; snap.forEach(d => txs.push({id: d.id, ...d.data()}));
        txs.sort((a, b) => new Date(b.time) - new Date(a.time));
        requestAnimationFrame(() => renderTransactions(txs));
    });

    unsubOrders = onSnapshot(query(collection(db, "orders"), where("uid", "==", authUid)), (snap) => {
        if (!isOrderInitialLoad) snap.docChanges().forEach(change => { if (change.type === "added") { showToast("Order Active", true); sounds.success(); } });
        isOrderInitialLoad = false;
        let ords = []; snap.forEach(d => ords.push(d.data()));
        ords.sort((a, b) => new Date(b.time) - new Date(a.time));
        requestAnimationFrame(() => renderOrders(ords));
    });

    unsubChat = onSnapshot(query(collection(db, "chats"), where("uid", "==", authUid)), (snap) => {
        if (!isChatInitialLoad) snap.docChanges().forEach(change => { if (change.type === "added" && change.doc.data().sender === 'ZEXI') sounds.notification(); });
        isChatInitialLoad = false;
        let msgs = []; snap.forEach(d => msgs.push(d.data()));
        msgs.sort((a, b) => new Date(a.time) - new Date(b.time));
        requestAnimationFrame(() => renderChat(msgs));
    });

    unsubNotifs = onSnapshot(query(collection(db, "notifications"), where("email", "in", [userEmail, "all"])), (snap) => {
        let notifs = []; snap.forEach(d => notifs.push({id: d.id, ...d.data()}));
        notifs.sort((a, b) => new Date(b.time) - new Date(a.time)); notifs = notifs.slice(0, 10);
        let newCount = 0; const lastSeen = parseInt(localStorage.getItem('zexi_last_seen_notifs') || '0');
        if (notifs.length === 0) {
            if (notifList) notifList.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No notifications</div>';
        } else {
            if (notifList) notifList.innerHTML = notifs.map(n => {
                const notifTime = new Date(n.time); if (notifTime.getTime() > lastSeen) newCount++;
                const timeStr = notifTime.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                return `<div class="notif-item"><div class="notif-message">${n.message}</div><div class="notif-time">${timeStr}</div></div>`;
            }).join('');
        }
        unreadNotifsCount = newCount;
        if (notifBadge) {
            if (unreadNotifsCount > 0 && (!notifDropdown || notifDropdown.style.display !== 'flex')) {
                notifBadge.innerText = unreadNotifsCount > 9 ? '9+' : unreadNotifsCount; notifBadge.style.display = 'flex'; sounds.notification();
            } else notifBadge.style.display = 'none';
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
                        newPlanCards.forEach(c => c.classList.remove('active')); card.classList.add('active');
                        basePlanPrice = parseInt(card.getAttribute('data-price'));
                        validateForm(); syncPricesGlobally();
                    });
                });
                if (newPlanCards.length > 0) { basePlanPrice = parseInt(newPlanCards[0].getAttribute('data-price')); syncPricesGlobally(); }
            }
            if (paymentPlanSelect) paymentPlanSelect.innerHTML = plansData.map(p => `<option value="${p.price}">${p.name} - ₹${p.price}</option>`).join('');
        }
    });
    syncPricesGlobally();
}

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

// --------------------------------------------------------------------------------------
// UPGRADED PANEL: 15 MINUTE DELAY GLORY LOGIC INCLUDED
// --------------------------------------------------------------------------------------
function renderOrders(ords) {
    const list = el('ordersList'); if (!list) return;
    if (ords.length === 0) { list.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 0.85rem; margin-top: 20px;">No active orders.</p>'; return; }

    list.innerHTML = ords.map(o => {
        if (o.status !== 'Active') {
            const date = new Date(o.time).toLocaleDateString('en-US');
            return `<div class="tx-card">
                <div class="tx-row"><span class="tx-email" style="font-family: 'Inter', monospace; font-weight: 600;">ID#${Math.floor(10000 + Math.random() * 90000)}</span> <span class="tx-status rejected">${o.status}</span></div>
                <div class="tx-row tx-details"><span>Game UID: ${o.gameUid || 'N/A'}</span><span style="color: var(--text-main); font-weight: 500;">₹${o.plan}</span></div>
                <div class="tx-row tx-details" style="margin-bottom: 0;"><span>${date}</span></div>
            </div>`;
        }

        const cd = o.clanData || {};
        const cName = cd.clanName || 'Unknown';
        const cLvl = cd.clanLevel || 0;
        const cId = cd.clanId || o.gameUid;
        const cMem = cd.currentMembers || 0;
        const mMem = cd.maxMembers || 50;
        const capId = cd.captainId || 'N/A';

        // Using standard Date to milliseconds to safely allow pause/resume math later
        const startTimeMs = new Date(o.time).getTime();

        return `
        <div class="active-bot-panel" data-starttime="${startTimeMs}" data-status="active" style="background:#131316; border:1px solid #27272a; border-radius:12px; padding:16px; margin-bottom:16px; position:relative; overflow:hidden;">
            <div style="text-align:center; color:#fff; font-family:'Orbitron',sans-serif; font-size:1.1rem; font-weight:700; margin-bottom:16px; letter-spacing: 1px;">
                <span style="color:var(--primary-orange);">🎉</span> CONGRATULATIONS
            </div>
            
            <div style="background:#09090b; border:1px solid #27272a; border-radius:8px; padding:12px; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                    <div style="width:46px; height:46px; background:#18181b; border-radius:8px; display:flex; align-items:center; justify-content:center; border:1px solid #fbbf24; position:relative;">
                        <img src="https://i.ibb.co/gLMDrPRk/image.jpg" style="width:28px; border-radius: 4px; object-fit: cover;" alt="logo" onerror="this.style.display='none'">
                        <div style="position:absolute; bottom:-8px; background:#fbbf24; color:#000; font-size:0.6rem; padding:2px 6px; border-radius:4px; font-weight:800;">LV.${cLvl}</div>
                    </div>
                    <div>
                        <div style="color:#fbbf24; font-weight:700; font-size:1.15rem; letter-spacing:0.5px;">${cName}</div>
                        <div style="color:#71717a; font-size:0.65rem; font-family: monospace;">ID: ${cId} | IND | <span style="color:#3b82f6;">BOTS ACTIVE</span></div>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                    <div style="text-align:center;">
                        <div style="color:#71717a; margin-bottom:4px; font-weight:600;"><i class="fas fa-users"></i> MEMBERS</div>
                        <div style="color:#fff; font-weight:700;">${cMem}/${mMem}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="color:#71717a; margin-bottom:4px; font-weight:600;"><i class="fas fa-plane"></i> CAPTAIN</div>
                        <div style="color:#fbbf24; font-weight:700;">${capId}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="color:#71717a; margin-bottom:4px; font-weight:600;"><i class="fas fa-crown"></i> TOTAL GLORY</div>
                        <div class="total-glory-counter" style="color:#10b981; font-weight:700;">0</div>
                    </div>
                </div>
            </div>

            <div style="background:#09090b; border:1px solid #27272a; border-radius:8px; padding:12px;">
                <div style="color:#10b981; font-size:0.65rem; text-align:right; margin-bottom:12px; font-family: monospace; font-weight:bold; letter-spacing: 1px;">[ LIVE SYNC ENABLED ]</div>
                
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <div style="width:24px; text-align:center;"><i class="fas fa-shield-alt" style="color:#71717a;"></i></div>
                    <span style="color:#71717a; font-size:0.8rem; font-family: monospace;">ID: <span style="color:#fff;">${cId}</span></span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <div style="width:24px; text-align:center;"><i class="fas fa-user" style="color:#71717a;"></i></div>
                    <span style="color:#71717a; font-size:0.8rem;">Clan: <span style="color:#fff;">${cName}</span> <i class="fas fa-map-marker-alt" style="color:#ef4444; margin-left:6px;"></i> IND</span>
                </div>
                
                <div class="status-badge" style="background:rgba(16,185,129,0.1); color:#10b981; padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; margin-bottom:20px; letter-spacing: 0.5px; transition: all 0.3s;">
                    <span class="status-dot-indicator" style="display:inline-block; width:6px; height:6px; background:#10b981; border-radius:50%; margin-right:6px; box-shadow:0 0 6px #10b981; transition: all 0.3s;"></span> <span class="status-text">RUNNING</span>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-bottom:12px; border-bottom: 1px solid #27272a; padding-bottom:12px;">
                    <div style="color:#fff; font-size:0.75rem;"><i class="far fa-clock" style="color:#71717a;"></i> Uptime <span class="uptime-timer" style="font-weight:700; margin-left:4px; font-family: monospace;">0h 0m 0s</span></div>
                    <div style="color:#fff; font-size:0.75rem;"><i class="fas fa-star" style="color:#fbbf24;"></i> Glory <span class="glory-counter" style="font-weight:700; margin-left:4px;">0</span></div>
                    <div style="color:#10b981; font-weight:800; font-size:0.8rem;">+2L/8h</div>
                </div>

                <div style="display:flex; gap:12px; margin-top:8px;">
                    <button class="stop-btn" style="flex:1; background:transparent; border:1px solid #ef4444; color:#ef4444; padding:12px; border-radius:8px; font-weight:700; font-size: 0.85rem; display:flex; justify-content:center; align-items:center; gap:8px; cursor:pointer; transition: all 0.3s;">
                        <span style="display:inline-block; width:10px; height:10px; background:#ef4444; border-radius: 2px;"></span> STOP
                    </button>
                    <button class="details-btn" style="flex:1; background:#f4f4f5; border:none; color:#18181b; padding:12px; border-radius:8px; font-weight:700; font-size: 0.85rem; display:flex; justify-content:center; align-items:center; gap:8px; cursor:pointer;">
                        <i class="fas fa-info-circle"></i> DETAILS
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Logic Binding After Render
    setTimeout(() => {
        
        // 1. Details Button: Opens Wait Modal
        document.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                showWaitMessageModal();
            });
        });

        // 2. Play/Stop Toggle Logic
        document.querySelectorAll('.stop-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const panel = this.closest('.active-bot-panel');
                if(!panel || panel.dataset.status === 'completed') return;

                const badge = panel.querySelector('.status-badge');
                const dot = badge.querySelector('.status-dot-indicator');
                const text = badge.querySelector('.status-text');

                // If currently running, stop it
                if (panel.dataset.status === 'active') {
                    panel.dataset.status = 'stopped';
                    panel.dataset.pausedat = Date.now(); // Note down exact pause time
                    
                    // Update Status Badge UI to Red STOPPED
                    badge.style.background = 'rgba(239, 68, 68, 0.1)';
                    badge.style.color = '#ef4444';
                    dot.style.background = '#ef4444';
                    dot.style.boxShadow = '0 0 6px #ef4444';
                    text.innerText = 'STOPPED';

                    // Update Button to Green PLAY
                    this.innerHTML = '<i class="fas fa-play" style="color:#10b981;"></i> PLAY';
                    this.style.color = '#10b981';
                    this.style.borderColor = '#10b981';
                    
                    showToast("Bots Stopped", true);
                    sounds.error(); 
                } 
                // If currently stopped, resume/play it
                else if (panel.dataset.status === 'stopped') {
                    panel.dataset.status = 'active';
                    
                    // Adjust startTime so timer doesn't jump forward unexpectedly
                    const pausedAt = parseInt(panel.dataset.pausedat || Date.now());
                    const pauseDuration = Date.now() - pausedAt;
                    const oldStartTime = parseInt(panel.dataset.starttime);
                    panel.dataset.starttime = oldStartTime + pauseDuration; 

                    // Update Status Badge UI back to Green RUNNING
                    badge.style.background = 'rgba(16,185,129,0.1)';
                    badge.style.color = '#10b981';
                    dot.style.background = '#10b981';
                    dot.style.boxShadow = '0 0 6px #10b981';
                    text.innerText = 'RUNNING';

                    // Update Button back to Red STOP
                    this.innerHTML = '<span style="display:inline-block; width:10px; height:10px; background:#ef4444; border-radius: 2px;"></span> STOP';
                    this.style.color = '#ef4444';
                    this.style.borderColor = '#ef4444';

                    showToast("Bots Resumed", true);
                    sounds.success();
                }
            });
        });
        
        // 3. Real-time Glory & Uptime Engine (15 Min Delay Logic Added)
        if (window.uptimeInterval) clearInterval(window.uptimeInterval);
        
        window.uptimeInterval = setInterval(() => {
            const panels = document.querySelectorAll('.active-bot-panel');
            
            panels.forEach(panel => {
                // If stopped or already completed, do nothing
                if (panel.dataset.status === 'stopped' || panel.dataset.status === 'completed') return;

                const startTimeStr = panel.dataset.starttime;
                if(!startTimeStr) return;
                
                const startTime = parseInt(startTimeStr);
                const now = Date.now();
                let elapsedSec = Math.floor((now - startTime) / 1000);
                
                // ORDER COMPLETE LOGIC: 8 Hours = 28,800 seconds
                if (elapsedSec >= 28800) {
                    elapsedSec = 28800; // Cap it exactly at 8 hours
                    panel.dataset.status = 'completed'; // Lock the status
                    
                    // Update Status Badge to Blue ORDER COMPLETE
                    const badge = panel.querySelector('.status-badge');
                    if(badge) {
                        badge.style.background = 'rgba(59, 130, 246, 0.1)'; // Blue background
                        badge.style.color = '#3b82f6';
                        badge.querySelector('.status-dot-indicator').style.background = '#3b82f6';
                        badge.querySelector('.status-dot-indicator').style.boxShadow = '0 0 6px #3b82f6';
                        badge.querySelector('.status-text').innerText = 'ORDER COMPLETE';
                    }

                    // Hide the Stop/Play Button entirely
                    const stopBtn = panel.querySelector('.stop-btn');
                    if(stopBtn) stopBtn.style.display = 'none';
                    
                    showToast("Guild Order Completed!", true);
                    sounds.success();
                }

                if (elapsedSec < 0) elapsedSec = 0;

                // NEW GLORY MATH: 15 Min (900 seconds) delay
                let currentGlory = 0;
                
                if (elapsedSec > 900) { 
                    const activeSeconds = elapsedSec - 900;
                    const totalActiveSeconds = 28800 - 900; 
                    // Start at 200, scale up to 200,000
                    currentGlory = 200 + Math.floor(activeSeconds * ((200000 - 200) / totalActiveSeconds));
                }
                
                if (currentGlory > 200000) currentGlory = 200000;

                // Format Time to 0h 0m 0s
                const h = Math.floor(elapsedSec / 3600);
                const m = Math.floor((elapsedSec % 3600) / 60);
                const s = elapsedSec % 60;

                // Update UI elements securely
                const timerEl = panel.querySelector('.uptime-timer');
                if (timerEl) timerEl.innerText = `${h}h ${m}m ${s}s`;

                const gloryEl = panel.querySelector('.glory-counter');
                if (gloryEl) gloryEl.innerText = currentGlory.toLocaleString('en-IN'); 

                const totalGloryEl = panel.querySelector('.total-glory-counter');
                if (totalGloryEl) totalGloryEl.innerText = currentGlory.toLocaleString('en-IN');
            });
        }, 1000); // Loops every 1 second
        
    }, 100);
}

// Function triggered by the 'Details' Button now
function showWaitMessageModal() {
    const mContainer = el('memberListContainer');
    if (!mContainer) return;

    mContainer.innerHTML = `
        <div style="text-align:center; padding: 20px 10px;">
            <i class="fas fa-robot" style="font-size: 3rem; color: var(--primary-orange); margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 12px; font-weight: 700; letter-spacing: 0.5px;">SYSTEM ACTIVE</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">
                Please wait! Aapke bots server par successfully activate ho gaye hain.<br><br>
                <span style="color: var(--success-color); font-weight: 700; background: rgba(16,185,129,0.1); padding: 4px 8px; border-radius: 4px;">Kripya 8 ghante (8 Hours) wait karein.</span><br><br>
                Glory real-time mein update ho rahi hai.
            </p>
        </div>
    `;
    const modal = el('detailsModal');
    if (modal) modal.classList.add('active');
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

async function validatePlayerUidApi() {
    if (!playerUidInput || !guildUidInput) return;
    const pUid = playerUidInput.value.replace(/\D/g, ''); playerUidInput.value = pUid;
    
    if (pUid.length < 5) {
        isPlayerUidValid = false;
        playerUidError.style.display = 'none';
        validateForm(); return;
    }

    playerUidError.style.display = 'block';
    playerUidError.style.color = 'var(--text-main)';
    playerUidError.innerText = 'Verifying Real Data API...';
    isCheckingApi = true;
    validateForm();

    try {
        const res = await fetch(`https://info-api-ten-xi.vercel.app/api/proxy?uid=${pUid}&region=IND&t=${Date.now()}`);
        if (!res.ok) throw new Error("API Server Connection Failed");
        const data = await res.json();

        const basicInfo = data?.basicInfo;
        const clanBasicInfo = data?.clanBasicInfo;
        const clanMemberInfo = data?.clanMemberInfo;

        if (!basicInfo || basicInfo.accountId !== pUid) throw new Error("Invalid UID / Fake Cache Detected");
        if (!clanBasicInfo || !clanBasicInfo.clanId) throw new Error("No Clan Associated with this UID");

        apiPlayerData = basicInfo;
        apiClanData = clanBasicInfo;
        apiMembersList = clanMemberInfo || [];
        isPlayerUidValid = true;

        playerUidError.style.color = 'var(--success-color)';
        playerUidError.innerText = `Verified: ${clanBasicInfo.clanName} (Lv.${clanBasicInfo.clanLevel})`;

    } catch (err) {
        isPlayerUidValid = false;
        apiPlayerData = apiClanData = apiMembersList = null;
        playerUidError.style.color = 'var(--error-color)';
        playerUidError.innerText = err.message;
    }
    isCheckingApi = false;
    validateForm();
}

if (playerUidInput) {
    playerUidInput.addEventListener('input', debounce(validatePlayerUidApi, 600));
}

const navItems = document.querySelectorAll('.nav-item'), pageSections = document.querySelectorAll('.page-section');
navItems.forEach(item => {
    item.addEventListener('click', () => {
        requestAnimationFrame(() => {
            navItems.forEach(nav => nav.classList.remove('active')); pageSections.forEach(sec => sec.classList.remove('active'));
            item.classList.add('active'); const targetId = item.getAttribute('data-target'); const targetSec = el(targetId);
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
    
    const canContinue = isUidValid && isPlayerUidValid && !isCheckingApi;
    
    if (continueBtn) {
        continueBtn.disabled = !canContinue;
        canContinue ? continueBtn.classList.add('enabled') : continueBtn.classList.remove('enabled');
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

if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return;
        const code = promoInput.value.trim().toUpperCase(); if (!code) return;
        applyPromoBtn.innerText = "..."; applyPromoBtn.disabled = true;
        try {
            const q = query(collection(db, "promo_codes"), where("code", "==", code), where("isActive", "==", true));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                promoMsg.innerText = "Invalid or Expired Code"; promoMsg.style.color = "var(--error-color)"; promoMsg.style.display = "block";
                currentDiscountPercent = 0; appliedPromoCode = ""; sounds.error();
            } else {
                querySnapshot.forEach((doc) => {
                    const data = doc.data(); currentDiscountPercent = data.discount; appliedPromoCode = code;
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

if (submitPaymentBtn) {
    submitPaymentBtn.addEventListener('click', async () => {
        if (!auth.currentUser || !isUtrValid) return;
        submitPaymentBtn.disabled = true; submitPaymentBtn.innerText = "Submitting...";

        try {
            const txQ = query(collection(db, "transactions"), where("utr", "==", utrInput.value));
            const txSnap = await getDocs(txQ);
            if(!txSnap.empty) throw new Error("Duplicate UTR");

            const enteredGameUid = guildUidInput ? guildUidInput.value : 'N/A';
            const method = paymentMethodSelect ? paymentMethodSelect.value.toUpperCase() : 'UPI';

            await addDoc(collection(db, "transactions"), {
                uid: auth.currentUser.uid, gameUid: enteredGameUid, 
                playerUid: playerUidInput ? playerUidInput.value : null, 
                plan: finalPrice, basePlan: basePlanPrice, promoCode: appliedPromoCode, 
                utr: utrInput.value, method: method, email: auth.currentUser.email, status: "Pending", time: new Date().toISOString()
            });
            
            await addDoc(collection(db, "chats"), { 
                uid: auth.currentUser.uid, email: auth.currentUser.email, sender: 'USER', 
                text: `Payment submitted (${method}): ₹${finalPrice}\nID/TxID: ${utrInput.value}\nUID: ${enteredGameUid}${appliedPromoCode ? `\nPromo: ${appliedPromoCode}` : ''}\n\nWaiting for verification.`, 
                img: null, time: new Date().toISOString() 
            });

            showToast("Payment Submitted", true);
            utrInput.value = ''; isUtrValid = false;
            promoInput.value = ''; appliedPromoCode = ''; currentDiscountPercent = 0; promoMsg.style.display = 'none'; 
            syncPricesGlobally(); submitPaymentBtn.classList.remove('enabled');
            document.querySelector('.nav-item[data-target="section-transactions"]')?.click();
        } catch (err) {
            console.error("Tx Error:", err);
            showToast(err.message.includes("Duplicate") ? "ID already submitted." : "Failed to submit payment.");
            submitPaymentBtn.classList.add('enabled');
        } finally { submitPaymentBtn.disabled = false; submitPaymentBtn.innerText = "Submit Payment"; }
    });
}

if (continueBtn) {
    continueBtn.addEventListener('click', () => {
        if (!auth.currentUser || !isUidValid || !isPlayerUidValid) return;
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
        if (!auth.currentUser || !apiClanData) return;
        
        if (modalStepConfirm) modalStepConfirm.style.display = 'none'; 
        if (modalStepProcess) modalStepProcess.style.display = 'flex';
        if (modalSpinner) { modalSpinner.style.display = 'block'; modalSpinner.style.borderTopColor = 'var(--primary-orange)'; }
        if (modalStatusMsg) { modalStatusMsg.className = 'status-msg text-main'; modalStatusMsg.innerText = "Processing System..."; }
        
        try {
            const enteredGameUid = guildUidInput ? guildUidInput.value : 'N/A';
            const userDocRef = doc(db, "users", auth.currentUser.uid); 
            const userSnap = await getDoc(userDocRef);
            const realWalletBalance = userSnap.exists() ? (userSnap.data().wallet || 0) : 0;
            
            if (realWalletBalance < finalPrice) throw new Error("Insufficient Balance in Database");
            const orderSnap = await getDocs(query(collection(db, "orders"), where("gameUid", "==", enteredGameUid)));
            if (!orderSnap.empty) throw new Error("Order exists");

            const batch = writeBatch(db);
            batch.update(userDocRef, { wallet: realWalletBalance - finalPrice });

            batch.set(doc(collection(db, "orders")), {
                uid: auth.currentUser.uid, 
                email: auth.currentUser.email,
                gameUid: enteredGameUid, 
                
                playerUid: playerUidInput.value,
                clanData: {
                    clanId: apiClanData.clanId,
                    clanName: apiClanData.clanName,
                    clanLevel: apiClanData.clanLevel,
                    currentMembers: apiClanData.currentMembers || apiMembersList.length || 0,
                    maxMembers: apiClanData.maxMembers || 50,
                    captainId: apiClanData.captainId
                },
                membersList: apiMembersList || [],

                plan: finalPrice, basePlan: basePlanPrice, promoCode: appliedPromoCode, 
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
                            setTimeout(() => { 
                                if (guildUidInput) guildUidInput.value = ''; 
                                if (playerUidInput) playerUidInput.value = ''; 
                                playerUidError.style.display = 'none';
                                isPlayerUidValid = false;
                                validateForm(); 
                                document.querySelector('.nav-item[data-target="section-history"]')?.click(); 
                            }, 500); 
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

const chatInput = el('chatInput'), chatSendBtn = el('chatSendBtn'), chatFile = el('chatFile'), chatPreviewContainer = el('chatPreviewContainer'), removeImgBtn = el('removeImgBtn');

const updateSendBtnState = () => { if (chatSendBtn) chatSendBtn.disabled = !((chatInput && chatInput.value.trim() !== '') || (chatFile && chatFile.files.length > 0)); };

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

let initialHeight = window.innerHeight;
window.addEventListener("resize", debounce(() => { document.body.classList.toggle("keyboard-open", window.innerHeight < initialHeight - 120); }, 150));
