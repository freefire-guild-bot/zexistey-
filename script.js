// SAFE LOAD
document.addEventListener("DOMContentLoaded", () => {

import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js").then(async ({ initializeApp }) => {
const { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");

const { 
    getFirestore, 
    doc, 
    setDoc 
} = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");

const firebaseConfig = {
    apiKey: "AIzaSyB1c8emccEr0Vt6zBJVrbDMUNBZ3IZH9Vc",
    authDomain: "zexi-bot-20.firebaseapp.com",
    projectId: "zexi-bot-20",
    storageBucket: "zexi-bot-20.firebasestorage.app",
    messagingSenderId: "819439962932",
    appId: "1:819439962932:web:a33de3f49c7cdf94aff361"
};

// INIT ONLY ONCE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// SAFE AUTH CHECK
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "dashboard.html";
    }
});

// ELEMENT SAFE GET
const getEl = (id) => document.getElementById(id);

// TAB SWITCH
function switchTab(tab) {
    const formLogin = getEl('form-login');
    const formSignup = getEl('form-signup');
    const btnTabLogin = getEl('btn-tab-login');
    const btnTabSignup = getEl('btn-tab-signup');

    if (!formLogin || !formSignup) return;

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

// BUTTON EVENTS SAFE
getEl('btn-tab-login')?.addEventListener('click', () => switchTab('login'));
getEl('btn-tab-signup')?.addEventListener('click', () => switchTab('signup'));
getEl('go-to-signup')?.addEventListener('click', () => switchTab('signup'));
getEl('go-to-login')?.addEventListener('click', () => switchTab('login'));

// PASSWORD TOGGLE
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = getEl(this.dataset.target);
        if (!input) return;

        input.type = input.type === 'password' ? 'text' : 'password';
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

// ERROR
function showErrorAlert(msg) {
    alert(msg); // lightweight (no lag)
}

// LOGIN
getEl('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = getEl('login-email').value.trim();
    const password = getEl('login-pwd').value;

    if(!email || !password) return showErrorAlert("Fill all fields");

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "dashboard.html";
    } catch (err) {
        showErrorAlert("Login failed");
    }
});

// SIGNUP
getEl('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = getEl('signup-email').value.trim();
    const password = getEl('signup-pwd').value;
    const confirm = getEl('signup-pwd-confirm').value;

    if(password !== confirm) return showErrorAlert("Passwords not match");

    try {
        const user = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, "users", user.user.uid), {
            email,
            wallet: 0,
            status: "active"
        });

        window.location.href = "dashboard.html";

    } catch (err) {
        showErrorAlert("Signup error");
    }
});

});
});
