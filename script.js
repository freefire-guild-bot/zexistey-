// WAIT FOR PAGE LOAD
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

// 🔥 FIREBASE INIT (ONCE)
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

// ✅ AUTO LOGIN CHECK (SAFE)
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "dashboard.html";
    }
});

// ---------- UI ----------

function get(id){ return document.getElementById(id); }

// TAB SWITCH
function switchTab(tab){
    if(tab==="login"){
        get('form-login').classList.add('active');
        get('form-signup').classList.remove('active');
        get('btn-tab-login').classList.add('active');
        get('btn-tab-signup').classList.remove('active');
    } else {
        get('form-signup').classList.add('active');
        get('form-login').classList.remove('active');
        get('btn-tab-signup').classList.add('active');
        get('btn-tab-login').classList.remove('active');
    }
}

get('btn-tab-login').onclick = ()=>switchTab('login');
get('btn-tab-signup').onclick = ()=>switchTab('signup');
get('go-to-signup').onclick = ()=>switchTab('signup');
get('go-to-login').onclick = ()=>switchTab('login');

// PASSWORD SHOW/HIDE
document.querySelectorAll('.toggle-password').forEach(icon=>{
    icon.onclick = ()=>{
        const input = get(icon.dataset.target);
        if(input.type==="password"){
            input.type="text";
            icon.classList.replace("fa-eye","fa-eye-slash");
        } else {
            input.type="password";
            icon.classList.replace("fa-eye-slash","fa-eye");
        }
    }
});

// ---------- LOGIN ----------

get('login-form').onsubmit = async (e)=>{
    e.preventDefault();

    const email = get('login-email').value.trim();
    const pass = get('login-pwd').value;

    if(!email || !pass) return alert("Fill all fields");

    try{
        await signInWithEmailAndPassword(auth,email,pass);
        window.location.href="dashboard.html";
    }catch(err){
        alert("Invalid login");
    }
};

// ---------- SIGNUP ----------

get('signup-form').onsubmit = async (e)=>{
    e.preventDefault();

    const email = get('signup-email').value.trim();
    const pass = get('signup-pwd').value;
    const confirm = get('signup-pwd-confirm').value;

    if(pass!==confirm) return alert("Password not match");

    try{
        const user = await createUserWithEmailAndPassword(auth,email,pass);

        await setDoc(doc(db,"users",user.user.uid),{
            email,
            wallet:0,
            status:"active"
        });

        window.location.href="dashboard.html";

    }catch(err){
        alert(err.message);
    }
};

});
});
