// --- 1. FIREBASE SETUP & INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyB4rdZKS18Ow9MPCpRE7tVbuG7b8WgLuto",
    authDomain: "clintflow-b584f.firebaseapp.com",
    projectId: "clintflow-b584f",
    storageBucket: "clintflow-b584f.firebasestorage.app",
    messagingSenderId: "373004278074",
    appId: "1:373004278074:web:04ba603ee5575cb5335803",
    measurementId: "G-6TM5VTEMQY"
};

// GLOBAL VARIABLES
let auth, db, currentUser;
let businesses = [];
let settings = { theme: 'dark', accentColor: '#f97316', logoName: 'ClientFlow' };
let currentEditId = null, currentPage = 1;
const itemsPerPage = 12;
let currentCalDate = new Date();
const SETTINGS_KEY = 'clientflow_settings_final';

// Initialize when scripts are loaded
window.addEventListener('load', () => {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

    // Listen for Login/Logout
    auth.onAuthStateChanged((user) => {
        const authBtnSidebar = document.getElementById('sidebarAuthBtn');
        const authBtnMobile = document.getElementById('mobileAuthBtn');
        
        if (user) {
            currentUser = user;
            showToast(`Welcome back, ${user.displayName.split(' ')[0]}!`);
            if(authBtnSidebar) authBtnSidebar.innerHTML = '🚪 Logout';
            if(authBtnMobile) authBtnMobile.innerHTML = '🚪';
            loadDataFromCloud();
        } else {
            currentUser = null;
            businesses = [];
            if(authBtnSidebar) authBtnSidebar.innerHTML = '🔐 Login with Google';
            if(authBtnMobile) authBtnMobile.innerHTML = '🔐';
            refreshDashboard();
            renderBusinessTable();
        }
    });

    init();
});

// --- 2. AUTHENTICATION & CLOUD DATA ---

function toggleAuth() {
    if (currentUser) {
        auth.signOut().then(() => showToast('Logged out successfully'));
    } else {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(err => showToast(err.message, 'error'));
    }
}

function loadDataFromCloud() {
    if (!currentUser) return;
    db.collection("users").doc(currentUser.uid).get()
        .then((doc) => {
            businesses = (doc.exists && doc.data().leads) ? doc.data().leads : [];
            refreshDashboard();
            if(document.getElementById('page-businesses')?.classList.contains('active')) renderBusinessTable();
            if(document.getElementById('page-calendar')?.classList.contains('active')) renderCalendar();
        })
        .catch(err => showToast("Failed to load cloud data", "error"));
}

function saveDataToCloud() {
    if (!currentUser) return;
    db.collection("users").doc(currentUser.uid).set({ leads: businesses }, { merge: true })
        .catch(err => showToast("Failed to sync to cloud", "error"));
}

// --- 3. CORE LOGIC ---

const getStatusClass = (status) => (status || 'new').toLowerCase().replace(/\s/g, '');

function showToast(msg, type='success') {
    const c = document.getElementById('toastContainer');
    if(!c) return;
    const t = document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg;
    c.appendChild(t); 
    setTimeout(() => { 
        t.style.opacity = '0'; 
        setTimeout(() => t.remove(), 400); 
    }, 3000);
}

function init() {
    loadSettings();
    applySettings();
    
    // UI Injection
    document.querySelector('.sidebar-footer')?.insertAdjacentHTML('afterbegin', `<button class="btn btn-primary btn-sm" style="width:100%; margin-bottom:8px;" onclick="toggleAuth()" id="sidebarAuthBtn">🔐 Login with Google</button>`);
    document.querySelector('.mobile-header')?.insertAdjacentHTML('beforeend', `<button class="btn btn-primary btn-sm" style="border-radius:20px; padding:6px 10px;" onclick="toggleAuth()" id="mobileAuthBtn">🔐</button>`);
    
    // ... [Insert all other functions: navigateTo, renderDashboard, renderTable, modals, etc. here]
    // Note: I have truncated the redundant helper functions for brevity. 
    // Ensure all your previous render/modal/save functions are placed below here.
}
