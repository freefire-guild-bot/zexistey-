import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "dashboard.html";
    }
});

const formLogin = document.getElementById('form-login');
const formSignup = document.getElementById('form-signup');
const btnTabLogin = document.getElementById('btn-tab-login');
const btnTabSignup = document.getElementById('btn-tab-signup');
const goToSignupBtn = document.getElementById('go-to-signup');
const goToLoginBtn = document.getElementById('go-to-login');

/**
 * ========================================================
 * 🚀 SMART TAB SWITCHING & NOTIFICATION LOGIC
 * ========================================================
 */
function switchTab(tab) {
    if (tab === 'login') {
        // Prevent toast if already on login tab
        if(!formLogin.classList.contains('active')) {
            showToast('info', 'AUTHENTICATION MODE', 'Switched to operator login terminal.');
        }
        btnTabLogin.className = 'tab-btn active';
        btnTabSignup.className = 'tab-btn inactive';
        formSignup.classList.remove('active');
        formLogin.classList.add('active');
    } else {
        // Prevent toast if already on signup tab
        if(!formSignup.classList.contains('active')) {
            showToast('info', 'REGISTRATION MODE', 'Initialize a new operator account.');
        }
        btnTabSignup.className = 'tab-btn active';
        btnTabLogin.className = 'tab-btn inactive';
        formLogin.classList.remove('active');
        formSignup.classList.add('active');
    }
}

btnTabLogin.addEventListener('click', () => switchTab('login'));
btnTabSignup.addEventListener('click', () => switchTab('signup'));
goToSignupBtn.addEventListener('click', () => switchTab('signup'));
goToLoginBtn.addEventListener('click', () => switchTab('login'));

// Password Toggle Logic
const toggleIcons = document.querySelectorAll('.toggle-password');
toggleIcons.forEach(icon => {
    icon.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const pwdInput = document.getElementById(targetId);
        
        if (pwdInput.type === 'password') {
            pwdInput.type = 'text';
            this.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            pwdInput.type = 'password';
            this.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

/**
 * ========================================================
 * 🔔 ZEXI ELITE TOAST NOTIFICATION SYSTEM
 * ========================================================
 */
function showToast(type, title, message) {
    let container = document.getElementById('toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`; 

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-shield-check'; 
    if (type === 'error') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        setTimeout(() => toast.classList.add('show'), 10);
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Button State Manager
function setButtonState(btnId, state, originalText, originalIcon) {
    const btn = document.getElementById(btnId);
    
    if (state === 'loading') {
        btn.classList.add('loading');
        btn.style.pointerEvents = 'none';
    } 
    else if (state === 'success') {
        btn.classList.remove('loading');
        btn.style.background = '#00E676'; 
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-text').innerText = 'ACCESS GRANTED';
        btn.querySelector('i').className = 'fa-solid fa-shield-check';
        btn.querySelector('i').style.display = 'inline';
    } 
    else if (state === 'reset') {
        btn.classList.remove('loading');
        btn.style.background = '';
        btn.style.pointerEvents = 'all';
        btn.querySelector('.btn-text').innerText = originalText;
        btn.querySelector('i').className = originalIcon;
    }
}

// ========================================================
// 🔐 LOGIN LOGIC (Backend Untouched)
// ========================================================
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pwd').value;
    const btnId = 'submit-login';
    
    const cfResponse = document.querySelector('#login-form [name="cf-turnstile-response"]')?.value;

    if(!email || !password) return showToast('error', 'INPUT ERROR', 'Please fill in all required fields.');
    if(!cfResponse) return showToast('error', 'SECURITY ALERT', 'Please complete the Cloudflare security check.');

    setButtonState(btnId, 'loading');
    showToast('info', 'AUTHENTICATING', 'Verifying 256-bit encryption tunnel...');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        setButtonState(btnId, 'success');
        showToast('success', 'SYSTEM OVERRIDE', 'Secure connection established. Redirecting...');
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1200);
    } catch (error) {
        setButtonState(btnId, 'reset', 'INITIALIZE SESSION', 'fa-solid fa-arrow-right-to-bracket');
        
        if (window.turnstile) turnstile.reset();

        const errorCode = error.code;
        if(errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
            showToast('error', 'ACCESS DENIED', 'Invalid operator email or security clearance.');
        } else {
            showToast('error', 'SYSTEM ERROR', error.message);
        }
    }
});

// ========================================================
// 📝 SIGNUP LOGIC (Backend Untouched)
// ========================================================
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-pwd').value;
    const confirmPassword = document.getElementById('signup-pwd-confirm').value;
    const btnId = 'submit-signup';
    
    const cfResponse = document.querySelector('#signup-form [name="cf-turnstile-response"]')?.value;

    if(!email || !password || !confirmPassword) return showToast('error', 'INPUT ERROR', 'Please fill in all required fields.');
    if(password !== confirmPassword) return showToast('error', 'VERIFICATION FAILED', 'Security keys do not match.');
    if(password.length < 6) return showToast('error', 'WEAK SECURITY', 'Security clearance must be at least 6 characters.');
    if(!cfResponse) return showToast('error', 'SECURITY ALERT', 'Please complete the Cloudflare security check.');

    setButtonState(btnId, 'loading');
    showToast('info', 'INITIALIZING', 'Establishing secure operator profile...');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            wallet: 0,
            status: "active"
        });

        setButtonState(btnId, 'success');
        showToast('success', 'PROFILE CREATED', 'Operator identity registered. Redirecting...');
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1200);

    } catch (error) {
        setButtonState(btnId, 'reset', 'REGISTER PROFILE', 'fa-solid fa-user-shield');
        
        if (window.turnstile) turnstile.reset();

        const errorCode = error.code;
        if(errorCode === 'auth/email-already-in-use') {
            showToast('error', 'IDENTITY CONFLICT', 'An operator with this email is already registered.');
        } else if(errorCode === 'auth/invalid-email') {
            showToast('error', 'INVALID FORMAT', 'Please enter a valid operator email address.');
        } else {
            showToast('error', 'SYSTEM ERROR', error.message);
        }
    }
});
