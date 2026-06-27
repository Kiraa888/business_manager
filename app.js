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

let auth, db, currentUser;
let businesses = [];

window.addEventListener('load', () => {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

    auth.onAuthStateChanged((user) => {
        currentUser = user;
        const btn = document.getElementById('sidebarAuthBtn');
        if (btn) btn.innerHTML = user ? '🚪 Logout' : '🔐 Login';
        if (user) loadDataFromCloud();
    });
});

// --- 2. CORE FUNCTIONS ---

function toggleAuth() {
    if (currentUser) {
        auth.signOut();
    } else {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(e => console.error(e));
    }
}

function loadDataFromCloud() {
    if (!currentUser) return;
    db.collection("users").doc(currentUser.uid).get().then(doc => {
        businesses = (doc.exists && doc.data().leads) ? doc.data().leads : [];
        renderDashboard();
    });
}

function saveDataToCloud() {
    if (!currentUser) return;
    db.collection("users").doc(currentUser.uid).set({ leads: businesses }, { merge: true });
}

function toggleTheme() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
}

function renderDashboard() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `<h1>Dashboard</h1><p>Total Leads: ${businesses.length}</p>`;
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}
