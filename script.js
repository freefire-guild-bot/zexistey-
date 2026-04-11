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

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB1c8emccEr0Vt6zBJVrbDMUNBZ3IZH9Vc",
    authDomain: "zexi-bot-20.firebaseapp.com",
    projectId: "zexi-bot-20",
    storageBucket: "zexi-bot-20.firebasestorage.app",
    messagingSenderId: "819439962932",
    appId: "1:819439962932:web:a33de3f49c7cdf94aff361"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔐 SESSION MANAGEMENT: Redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "dashboard.html";
    }
});

// --- UI Elements & Event Listeners ---
const formLogin = document.getElementById('form-login');
const formSignup = document.getElementById('form-signup');
const btnTabLogin = document.getElementById('btn-tab-login');
const btnTabSignup = document.getElementById('btn-tab-signup');
const goToSignupBtn = document.getElementById('go-to-signup');
const goToLoginBtn = document.getElementById('go-to-login');

// Tab Switching Logic
function switchTab(tab) {
    if (tab === 'login') {
        btnTabLogin.className = 'tab-btn active';
        btnTabSignup.className = 'tab-btn inactive';
        formSignup.classList.remove('active');
        formLogin.classList.add('active');
    } else {
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

// Password Visibility Toggle
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

// ⚠️ ERROR HANDLING: Dynamic Toast Notification
function showErrorAlert(message) {
    // Creating the toast dynamically ensures it works even if missing from style.css
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed; top: -100px; left: 50%; transform: translateX(-50%);
        background: #ff0033; color: white; padding: 12px 24px;
        border-radius: 8px; font-weight: 600; font-family: 'Poppins', sans-serif;
        z-index: 9999; transition: top 0.4s ease; box-shadow: 0 4px 12px rgba(255,0,51,0.4);
        text-align: center; min-width: 250px;
    `;
    document.body.appendChild(toast);
    
    // Slide in
    setTimeout(() => toast.style.top = '20px', 10);
    
    // Slide out and remove
    setTimeout(() => {
        toast.style.top = '-100px';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Button UX State Manager
function setButtonState(btnId, state, originalText, originalIcon) {
    const btn = document.getElementById(btnId);
    
    if (state === 'loading') {
        btn.classList.add('loading');
        btn.style.pointerEvents = 'none';
    } 
    else if (state === 'success') {
        btn.classList.remove('loading');
        btn.style.background = '#25d366'; 
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-text').innerText = 'SUCCESS!';
        btn.querySelector('i').className = 'fa-solid fa-check';
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

// --- 🔐 LOGIN LOGIC ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Normalize email to lowercase
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-pwd').value;
    const btnId = 'submit-login';

    if(!email || !password) return showErrorAlert("Please fill in all fields.");

    setButtonState(btnId, 'loading');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        setButtonState(btnId, 'success');
        
        // onAuthStateChanged will handle the redirect automatically, but we add a fallback
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);
    } catch (error) {
        setButtonState(btnId, 'reset', 'LOGIN', 'fa-solid fa-right-to-bracket');
        const errorCode = error.code;
        
        // Friendly error messages
        if(errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
            showErrorAlert("Invalid email or password.");
        } else if (errorCode === 'auth/too-many-requests') {
            showErrorAlert("Too many failed attempts. Try again later.");
        } else {
            showErrorAlert(error.message.replace("Firebase: ", ""));
        }
    }
});

// --- 🟢 SIGNUP LOGIC (WITH FIRESTORE FIX) ---
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Normalize email to lowercase to match case-sensitive Firestore Rules
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const password = document.getElementById('signup-pwd').value;
    const confirmPassword = document.getElementById('signup-pwd-confirm').value;
    const btnId = 'submit-signup';

    if(!email || !password || !confirmPassword) return showErrorAlert("Please fill in all fields.");
    if(password !== confirmPassword) return showErrorAlert("Passwords do not match.");
    if(password.length < 6) return showErrorAlert("Password must be at least 6 characters.");

    setButtonState(btnId, 'loading');

    try {
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. 🔥 CRITICAL FIX: Use user.email as the Document ID to match Firestore rule: match /users/{email}
        await setDoc(doc(db, "users", user.email), {
            email: user.email,
            wallet: 0,
            status: "active",
            uid: user.uid,
            createdAt: new Date().toISOString()
        });

        setButtonState(btnId, 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);

    } catch (error) {
        setButtonState(btnId, 'reset', 'SIGN UP', 'fa-solid fa-user-plus');
        const errorCode = error.code;
        
        // Friendly error messages
        if(errorCode === 'auth/email-already-in-use') {
            showErrorAlert("An account with this email already exists.");
        } else if(errorCode === 'auth/invalid-email') {
            showErrorAlert("Please enter a valid email address.");
        } else {
            showErrorAlert(error.message.replace("Firebase: ", ""));
        }
    }
});
