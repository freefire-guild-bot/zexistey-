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

function showErrorAlert(message) {
    const toast = document.createElement('div');
    toast.className = 'ui-alert-toast';
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

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

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pwd').value;
    const btnId = 'submit-login';

    if(!email || !password) return showErrorAlert("Please fill in all fields.");

    setButtonState(btnId, 'loading');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        setButtonState(btnId, 'success');
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);
    } catch (error) {
        setButtonState(btnId, 'reset', 'LOGIN', 'fa-solid fa-right-to-bracket');
        const errorCode = error.code;
        if(errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
            showErrorAlert("Invalid email or password.");
        } else {
            showErrorAlert(error.message);
        }
    }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-pwd').value;
    const confirmPassword = document.getElementById('signup-pwd-confirm').value;
    const btnId = 'submit-signup';

    if(!email || !password || !confirmPassword) return showErrorAlert("Please fill in all fields.");
    if(password !== confirmPassword) return showErrorAlert("Passwords do not match.");
    if(password.length < 6) return showErrorAlert("Password must be at least 6 characters.");

    setButtonState(btnId, 'loading');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            wallet: 0,
            status: "active"
        });

        setButtonState(btnId, 'success');
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);

    } catch (error) {
        setButtonState(btnId, 'reset', 'SIGN UP', 'fa-solid fa-user-plus');
        const errorCode = error.code;
        if(errorCode === 'auth/email-already-in-use') {
            showErrorAlert("An account with this email already exists.");
        } else if(errorCode === 'auth/invalid-email') {
            showErrorAlert("Please enter a valid email address.");
        } else {
            showErrorAlert(error.message);
        }
    }
});
