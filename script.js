// script.js
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

// 1. Initialize Firebase (Runs immediately)
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

// 2. Fast Auth Check (Redirects before heavy DOM painting if already logged in)
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("dashboard.html");
    }
});

// 3. UI Logic (Waits for DOM to fully load)
document.addEventListener("DOMContentLoaded", () => {
    
    // Safely get DOM Elements
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    const btnTabLogin = document.getElementById('btn-tab-login');
    const btnTabSignup = document.getElementById('btn-tab-signup');
    const goToSignupBtn = document.getElementById('go-to-signup');
    const goToLoginBtn = document.getElementById('go-to-login');

    // Smooth & Lag-Free Tab Switching
    function switchTab(tab) {
        if (!formLogin || !formSignup) return;
        
        if (tab === 'login') {
            if (btnTabLogin) btnTabLogin.className = 'tab-btn active';
            if (btnTabSignup) btnTabSignup.className = 'tab-btn inactive';
            formSignup.classList.remove('active');
            formLogin.classList.add('active');
        } else {
            if (btnTabSignup) btnTabSignup.className = 'tab-btn active';
            if (btnTabLogin) btnTabLogin.className = 'tab-btn inactive';
            formLogin.classList.remove('active');
            formSignup.classList.add('active');
        }
    }

    // Attach Tab Listeners safely
    if (btnTabLogin) btnTabLogin.addEventListener('click', () => switchTab('login'));
    if (btnTabSignup) btnTabSignup.addEventListener('click', () => switchTab('signup'));
    if (goToSignupBtn) goToSignupBtn.addEventListener('click', () => switchTab('signup'));
    if (goToLoginBtn) goToLoginBtn.addEventListener('click', () => switchTab('login'));

    // Password Visibility Toggles
    const toggleIcons = document.querySelectorAll('.toggle-password');
    toggleIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            if (!targetId) return;
            
            const pwdInput = document.getElementById(targetId);
            if (!pwdInput) return;

            if (pwdInput.type === 'password') {  
                pwdInput.type = 'text';  
                this.classList.replace('fa-eye', 'fa-eye-slash');  
            } else {  
                pwdInput.type = 'password';  
                this.classList.replace('fa-eye-slash', 'fa-eye');  
            }  
        });
    });

    // Custom Clean Error Alert (Optimized to prevent memory leaks)
    function showErrorAlert(message) {
        // Remove existing toast if any to prevent stacking lag
        const existingToast = document.querySelector('.ui-alert-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'ui-alert-toast';
        toast.innerText = message;
        document.body.appendChild(toast);

        // Trigger animation safely
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
          
        setTimeout(() => {  
            toast.classList.remove('show');  
            setTimeout(() => toast.remove(), 300);  
        }, 3500);
    }

    // Handle Button Loading & Success States safely
    function setButtonState(btnId, state, originalText, originalIcon) {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        const btnTextEl = btn.querySelector('.btn-text');
        const btnIconEl = btn.querySelector('i');

        if (state === 'loading') {  
            btn.classList.add('loading');  
            btn.style.pointerEvents = 'none';  
        }   
        else if (state === 'success') {  
            btn.classList.remove('loading');  
            btn.style.background = '#25d366';   
            if (btnTextEl) {
                btnTextEl.style.display = 'inline';  
                btnTextEl.innerText = 'SUCCESS!';  
            }
            if (btnIconEl) {
                btnIconEl.className = 'fa-solid fa-check';  
                btnIconEl.style.display = 'inline';  
            }
        }   
        else if (state === 'reset') {  
            btn.classList.remove('loading');  
            btn.style.background = '';  
            btn.style.pointerEvents = 'all';  
            if (btnTextEl) btnTextEl.innerText = originalText;  
            if (btnIconEl) btnIconEl.className = originalIcon;  
        }
    }

    // Handle Login Submit
    const loginFormEl = document.getElementById('login-form');
    if (loginFormEl) {
        loginFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('login-email');
            const pwdInput = document.getElementById('login-pwd');
            if (!emailInput || !pwdInput) return;

            const email = emailInput.value.trim();  
            const password = pwdInput.value;  
            const btnId = 'submit-login';  

            if(!email || !password) return showErrorAlert("Please fill in all fields.");  

            setButtonState(btnId, 'loading');  

            try {  
                await signInWithEmailAndPassword(auth, email, password);  
                setButtonState(btnId, 'success');  
                // Redirection is handled by onAuthStateChanged automatically
            } catch (error) {  
                setButtonState(btnId, 'reset', 'LOGIN', 'fa-solid fa-right-to-bracket');  
                const errorCode = error.code;  
                if(errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {  
                    showErrorAlert("Invalid email or password.");  
                } else {  
                    showErrorAlert("Login failed. Please try again.");  
                }  
            }
        });
    }

    // Handle Signup Submit
    const signupFormEl = document.getElementById('signup-form');
    if (signupFormEl) {
        signupFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('signup-email');
            const pwdInput = document.getElementById('signup-pwd');
            const pwdConfirmInput = document.getElementById('signup-pwd-confirm');
            
            if (!emailInput || !pwdInput || !pwdConfirmInput) return;

            const email = emailInput.value.trim();  
            const password = pwdInput.value;  
            const confirmPassword = pwdConfirmInput.value;  
            const btnId = 'submit-signup';  

            if(!email || !password || !confirmPassword) return showErrorAlert("Please fill in all fields.");  
            if(password !== confirmPassword) return showErrorAlert("Passwords do not match.");  
            if(password.length < 6) return showErrorAlert("Password must be at least 6 characters.");  

            setButtonState(btnId, 'loading');  

            try {  
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);  
                const user = userCredential.user;  

                // Save to Firestore
                await setDoc(doc(db, "users", user.uid), {  
                    email: user.email,  
                    wallet: 0,  
                    status: "active"  
                });  

                setButtonState(btnId, 'success');  
                // Redirection handled by onAuthStateChanged
            } catch (error) {  
                setButtonState(btnId, 'reset', 'SIGN UP', 'fa-solid fa-user-plus');  
                const errorCode = error.code;  
                if(errorCode === 'auth/email-already-in-use') {  
                    showErrorAlert("An account with this email already exists.");  
                } else if(errorCode === 'auth/invalid-email') {  
                    showErrorAlert("Please enter a valid email address.");  
                } else {  
                    showErrorAlert("Signup failed. Please try again.");  
                }  
            }
        });
    }
});
