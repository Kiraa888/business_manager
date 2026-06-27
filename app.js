// --- 1. FIREBASE SETUP & INITIALIZATION ---
// Using your live project credentials
const firebaseConfig = {
    apiKey: "AIzaSyB4rdZKS18Ow9MPCpRE7tVbuG7b8WgLuto",
    authDomain: "clintflow-b584f.firebaseapp.com",
    projectId: "clintflow-b584f",
    storageBucket: "clintflow-b584f.firebasestorage.app",
    messagingSenderId: "373004278074",
    appId: "1:373004278074:web:04ba603ee5575cb5335803",
    measurementId: "G-6TM5VTEMQY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// --- 2. STATE MANAGEMENT ---
const SETTINGS_KEY = 'clientflow_settings_final';
let businesses = [];
let settings = { theme: 'dark', accentColor: '#f97316', logoName: 'ClientFlow' };
let currentEditId = null, currentPage = 1;
const itemsPerPage = 12;
let currentCalDate = new Date();

const getStatusClass = (status) => (status || 'new').toLowerCase().replace(/\s/g, '');

// --- 3. AUTHENTICATION & CLOUD DATA ---

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
        businesses = []; // Clear data on logout
        if(authBtnSidebar) authBtnSidebar.innerHTML = '🔐 Login with Google';
        if(authBtnMobile) authBtnMobile.innerHTML = '🔐';
        refreshDashboard();
        renderBusinessTable();
    }
});

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
            if (doc.exists && doc.data().leads) {
                businesses = doc.data().leads;
            } else {
                businesses = [];
            }
            refreshDashboard();
            if(document.getElementById('page-businesses').classList.contains('active')) renderBusinessTable();
            if(document.getElementById('page-calendar').classList.contains('active')) renderCalendar();
        })
        .catch(err => {
            console.error("Error loading data", err);
            showToast("Failed to load cloud data", "error");
        });
}

function saveDataToCloud() {
    if (!currentUser) {
        showToast("Please log in to save data", "error");
        return;
    }
    
    db.collection("users").doc(currentUser.uid).set({
        leads: businesses
    }, { merge: true })
    .catch(err => showToast("Failed to sync to cloud", "error"));
}

// --- 4. SETTINGS & UI LOGIC ---

// Settings remain in localStorage so the device remembers preferences before login
function loadSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) settings = JSON.parse(raw);
    applySettings();
}

function applySettings() {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    document.documentElement.style.setProperty('--accent2', adjustColor(settings.accentColor, 20));
    
    const logoElements = [document.getElementById('logoText'), document.getElementById('mobileLogoText')];
    logoElements.forEach(el => { if(el) el.textContent = settings.logoName; });
    
    const initials = settings.logoName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CF';
    const iconElements = [document.getElementById('sidebarLogoIcon'), document.getElementById('mobileLogoIcon')];
    iconElements.forEach(el => { if(el) el.textContent = initials; });
    
    const themeText = settings.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    const mobileThemeIcon = settings.theme === 'dark' ? '☀️' : '🌙';
    
    const sidebarThemeToggle = document.getElementById('sidebarThemeToggle');
    if(sidebarThemeToggle) sidebarThemeToggle.innerHTML = themeText;
    
    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    if(mobileThemeToggle) mobileThemeToggle.innerHTML = mobileThemeIcon;
    
    if(document.getElementById('set_theme')) document.getElementById('set_theme').value = settings.theme;
    if(document.getElementById('set_name')) document.getElementById('set_name').value = settings.logoName;
    if(document.getElementById('set_color')) document.getElementById('set_color').value = settings.accentColor;
}

function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function generateDemoData() {
    if(!currentUser) return showToast("Please log in first to add demo data", "error");
    if(!confirm("This will add 6 fake leads to your database. Proceed?")) return;
    const statuses = ['New Lead','Website Sent','Interested','Follow Up','Deal Closed'];
    const names = ['Green Garden Cafe','Elite Salon','Metro Realty','QuickMart'];
    const colors = ['#f97316','#3b82f6','#10b981','#8b5cf6'];
    const channels = ['WhatsApp', 'Call', 'In-Person'];
    
    const dummyLeads = Array.from({length:6}, (_,i) => {
        const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random()*20));
        const nf = new Date(); nf.setDate(nf.getDate() + Math.floor(Math.random()*10)-2);
        
        const asked = 15000 + (i * 5000);
        const agreed = asked - 2000;
        const advance = agreed * 0.5;

        return {
            id:'biz_'+Date.now()+'_'+i, businessName:names[i%names.length] + ' ' + (i+1), ownerName:'Jane Doe', category:'Retail',
            phone:`+91 98765 4321${i}`, email:`test${i}@example.com`, address: `${100+i} Main Street, Kolkata, WB`,
            mapLink: i%2===0 ? `https://maps.google.com/?q=${100+i}+Main+Street` : '',
            approachChannel: channels[i%channels.length], dateContacted: d.toISOString().split('T')[0],
            
            priceAsked: asked, priceAgreed: agreed, advancePaid: advance,
            deadlineDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0],
            paymentDate: d.toISOString().split('T')[0],
            
            status:statuses[i%statuses.length], priority:'Medium', 
            nextFollowUp:nf.toISOString().split('T')[0], demoWebsiteLink: i%2===0 ? 'https://demo.clientflow.dev' : '', 
            activityFeed:[], colorLabel: colors[i%colors.length]
        };
    });
    businesses = [...dummyLeads, ...businesses];
    saveDataToCloud(); refreshDashboard(); showToast("Demo data loaded!");
}

function showToast(msg, type='success') {
    const c = document.getElementById('toastContainer');
    if(!c) return;
    const t = document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg;
    c.appendChild(t); 
    setTimeout(() => { 
        t.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        t.style.opacity = '0'; t.style.transform = 'translateX(50px)';
        setTimeout(() => t.remove(), 400); 
    }, 3000);
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById('page-'+page); 
    if(pg) {
        pg.classList.add('active');
        if(page === 'calendar') renderCalendar();
    }
    
    document.querySelectorAll('.sidebar-nav a').forEach(a=>a.classList.remove('active'));
    const link = document.querySelector(`[data-page="${page}"]`); 
    if(link) link.classList.add('active');
    
    if(page==='dashboard') refreshDashboard();
    if(page==='businesses') renderBusinessTable();
    currentPage=1;
    const mainContent = document.querySelector('.main-content');
    if(mainContent) mainContent.scrollTop = 0;
}

document.querySelectorAll('.sidebar-nav a').forEach(a=>a.addEventListener('click',e=>{ 
    e.preventDefault(); navigateTo(e.currentTarget.dataset.page); 
}));

function toggleTheme() {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applySettings();
    if(document.getElementById('page-dashboard') && document.getElementById('page-dashboard').classList.contains('active')) {
        updatePieChart();
    }
}

// --- 5. RENDER FUNCTIONS ---

function updatePieChart() {
    const chart = document.getElementById('pieChart');
    const legend = document.getElementById('pieLegend');
    if(!chart || !legend) return;

    const counts = {};
    let total = businesses.length;
    if(total === 0) {
        chart.style.background = 'var(--surface3)';
        legend.innerHTML = '<p style="color:var(--text3)">No leads available</p>';
        return;
    }

    businesses.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });

    const statusColors = {
        'New Lead': 'var(--blue)', 'Website Sent': 'var(--cyan)', 'Interested': 'var(--green)',
        'Follow Up': 'var(--amber)', 'No Reply': 'var(--text3)', 'Rejected': 'var(--red)', 'Deal Closed': 'var(--purple)'
    };

    let gradientStr = [];
    let legendHtml = [];
    let currentAngle = 0;

    for (const [status, count] of Object.entries(counts)) {
        let percentage = count / total;
        let angle = percentage * 360;
        let color = statusColors[status] || 'var(--accent)';
        
        gradientStr.push(`${color} ${currentAngle}deg ${currentAngle + angle}deg`);
        currentAngle += angle;

        legendHtml.push(`
            <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.9rem; padding: 6px 0; border-bottom:1px solid var(--border);">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:12px; height:12px; border-radius:4px; background:${color}"></div>
                    <span style="color:var(--text2); font-weight:500;">${status}</span>
                </div>
                <span style="font-weight:700;">${Math.round(percentage * 100)}% <span style="color:var(--text3); font-weight:400; font-size:0.8rem;">(${count})</span></span>
            </div>
        `);
    }

    chart.style.background = `conic-gradient(${gradientStr.join(', ')})`;
    legend.innerHTML = legendHtml.join('');
}

function refreshDashboard() {
    const total = businesses.length;
    const interested = businesses.filter(b=>b.status==='Interested').length;
    const dealClosed = businesses.filter(b=>b.status==='Deal Closed').length;
    const followUps = businesses.filter(b=>b.status==='Follow Up').length;
    const today = new Date().toISOString().split('T')[0];
    const todayFollowUps = businesses.filter(b=>b.nextFollowUp===today);
    
    const stats = [
        { val: total, label: 'Total Leads' }, { val: interested, label: 'Interested' },
        { val: dealClosed, label: 'Deals Closed' }, { val: followUps, label: 'Follow Ups' }
    ];

    const statsContainer = document.getElementById('dashboardStats');
    if(statsContainer) {
        statsContainer.innerHTML = stats.map((s, i) => `
            <div class="stat-card animate-slide-up" style="animation-delay: ${i * 0.08}s" onclick="navigateTo('businesses')">
                <div class="stat-value">${s.val}</div><div class="stat-label">${s.label}</div>
            </div>`).join('');
    }
    
    const countBadge = document.getElementById('businessCount');
    if(countBadge) countBadge.textContent = total;
    
    const tfDiv = document.getElementById('todayFollowUps');
    if(tfDiv) {
        tfDiv.innerHTML = todayFollowUps.length ? todayFollowUps.map((b, i) => `
            <div class="animate-slide-up glass-card" style="animation-delay: ${i * 0.1}s; display:flex; align-items:center; justify-content:space-between; padding:16px; margin-bottom:12px; cursor:pointer;" onclick="openProfileModal('${b.id}')">
                <div style="display:flex; align-items:center; gap:16px;">
                    <div style="width:40px; height:40px; border-radius:50%; background:${b.colorLabel}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.1);">${b.businessName.charAt(0)}</div>
                    <div><div style="font-weight:600; font-size:1.05rem;">${b.businessName}</div><span class="status-badge status-${getStatusClass(b.status)}" style="margin-top:4px;">${b.status||'New'}</span></div>
                </div>
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); openProfileModal('${b.id}')">View</button>
            </div>`).join('') : '<div style="text-align:center; color:var(--text3); padding: 30px;">🎉 All caught up for today!</div>';
    }
    
    updatePieChart();
}

function renderBusinessTable() {
    const searchInput = document.getElementById('businessSearch');
    const search = (searchInput?.value||'').toLowerCase();
    const filterInput = document.getElementById('statusFilter');
    const filter = filterInput?.value||'all';
    
    let filtered = businesses.filter(b => {
        const matchSearch = b.businessName.toLowerCase().includes(search) || b.ownerName.toLowerCase().includes(search);
        const matchFilter = filter === 'all' || b.status === filter;
        return matchSearch && matchFilter;
    });
    filtered.sort((a,b)=>new Date(b.dateContacted)-new Date(a.dateContacted));
    
    const totalPages = Math.ceil(filtered.length/itemsPerPage);
    if(currentPage>totalPages) currentPage=Math.max(1,totalPages);
    const pageItems = filtered.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);
    
    const tableBody = document.getElementById('businessTableBody');
    if(tableBody) {
        tableBody.innerHTML = pageItems.length ? pageItems.map((b, i) => `
            <tr class="animate-slide-up" style="animation-delay: ${i * 0.03}s">
                <td><div style="width:36px; height:36px; border-radius:50%; background:${b.colorLabel}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">${b.businessName.charAt(0)}</div></td>
                <td><strong style="cursor:pointer; color:var(--text); transition:0.3s;" onclick="openProfileModal('${b.id}')">${b.businessName}</strong></td>
                <td><span class="status-badge status-${getStatusClass(b.status)}">${b.status}</span></td>
                <td style="color:var(--text3); font-size:0.85rem;">${b.approachChannel || '—'}<br><span style="font-size:0.75rem;">${b.dateContacted || ''}</span></td>
                <td style="color:var(--text3);">${b.nextFollowUp || '—'}</td>
                <td>${b.demoWebsiteLink ? `<a href="${b.demoWebsiteLink}" target="_blank" class="btn btn-xs" style="background:var(--surface3); border:1px solid var(--border2); color:var(--text); text-decoration:none; box-shadow:var(--shadow);">🌐 Open Demo</a>` : '<span style="color:var(--text3)">—</span>'}</td>
                <td>
                    <button class="btn btn-xs btn-ghost" onclick="openProfileModal('${b.id}')">👁</button>
                    <button class="btn btn-xs btn-ghost" onclick="deleteBusiness('${b.id}')" style="color:var(--red);">🗑</button>
                </td>
            </tr>`).join('') : '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text3);">No leads found.</td></tr>';
    }
    
    const paginationContainer = document.getElementById('pagination');
    if(paginationContainer) {
        paginationContainer.innerHTML = totalPages>1 ? Array.from({length:totalPages},(_,i)=>`<button class="btn btn-xs ${i+1===currentPage?'btn-primary':'btn-ghost'}" style="margin-left:4px; width:30px; height:30px; padding:0;" onclick="currentPage=${i+1};renderBusinessTable();">${i+1}</button>`).join('') : '';
    }
}

function changeMonth(offset) { 
    currentCalDate.setMonth(currentCalDate.getMonth() + offset); 
    renderCalendar(); 
}

function renderCalendar() {
    const year = currentCalDate.getFullYear(), month = currentCalDate.getMonth(), today = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const calTitle = document.getElementById('calMonthYear');
    if(calTitle) calTitle.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = '';
    for(let i = 0; i < firstDay; i++) { html += `<div class="calendar-cell empty"></div>`; }
    
    for(let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const dayLeads = businesses.filter(b => b.nextFollowUp === dateStr);
        let eventsHtml = dayLeads.map(b => `<div class="calendar-event" style="background:${b.colorLabel}" onclick="event.stopPropagation(); openProfileModal('${b.id}')">${b.businessName}</div>`).join('');
        
        html += `<div class="calendar-cell ${isToday ? 'today' : ''}" onclick="if(${dayLeads.length}>0) showToast('Follow up with ${dayLeads.map(l=>l.businessName).join(', ')}', 'success')"><div class="calendar-date-num">${day}</div>${eventsHtml}</div>`;
    }
    
    const calGrid = document.getElementById('calendarGrid');
    if(calGrid) calGrid.innerHTML = html;
}

// --- 6. DATA MODIFICATION FUNCTIONS ---

function saveSettings(showNotif = true) {
    settings = { 
        theme: document.getElementById('set_theme')?.value || settings.theme, 
        logoName: document.getElementById('set_name')?.value || 'ClientFlow', 
        accentColor: document.getElementById('set_color')?.value || '#f97316' 
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applySettings(); if(showNotif) showToast('Settings saved successfully!');
}

function clearAllData() {
    if(!currentUser) return showToast("You must be logged in to clear data", "error");
    if(confirm('🚨 WARNING: Are you absolutely sure? This will wipe all your leads permanently from the cloud.')) {
        if(confirm('Are you REALLY sure? There is no undo.')) {
            businesses = [];
            saveDataToCloud();
            location.reload();
        }
    }
}

// --- 7. MODALS LOGIC ---

function openAddBusinessModal() {
    if(!currentUser) return showToast("Please log in to add leads", "error");
    currentEditId = null; 
    document.getElementById('businessModalTitle').textContent = 'Add New Lead';
    document.getElementById('businessModalBody').innerHTML = getFormHTML({});
    const overlay = document.getElementById('businessModalOverlay'); 
    overlay.style.display = 'flex'; 
    setTimeout(() => overlay.classList.add('active'), 10);
}

function openEditBusinessModal(id) {
    currentEditId = id; const b = businesses.find(x=>x.id===id); if(!b) return;
    document.getElementById('businessModalTitle').textContent = 'Edit Lead';
    document.getElementById('businessModalBody').innerHTML = getFormHTML(b);
    const overlay = document.getElementById('businessModalOverlay'); 
    overlay.style.display = 'flex'; 
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closeBusinessModal() { 
    const overlay = document.getElementById('businessModalOverlay'); 
    overlay.classList.remove('active'); 
    setTimeout(() => overlay.style.display = 'none', 300);
}

function openProfileModal(id) {
    const b = businesses.find(x=>x.id===id); if(!b) return;
    
    const agreed = Number(b.priceAgreed) || 0;
    const advance = Number(b.advancePaid) || 0;
    const remaining = agreed - advance;
    
    document.getElementById('profileModalTitle').textContent = 'Lead Profile';
    
    document.getElementById('profileModalBody').innerHTML = `
        <div style="display:flex; gap:20px; align-items:center; margin-bottom:10px;">
            <div style="width:72px; height:72px; border-radius:50%; background:${b.colorLabel}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:2rem; box-shadow:0 8px 24px rgba(0,0,0,0.15);">${b.businessName.charAt(0)}</div>
            <div><h3 style="font-size:1.5rem; margin-bottom:4px;">${b.businessName}</h3><p style="color:var(--text2); font-weight:500;">${b.ownerName}  •  <span style="background:var(--surface2); padding:4px 10px; border-radius:12px; font-size:0.8rem; border:1px solid var(--border);">${b.category}</span></p></div>
        </div>
        
        <div class="glass-card" style="padding:16px; margin: 16px 0;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom: 16px;">
                <div><strong style="color:var(--text3); font-size:0.8rem; text-transform:uppercase;">Phone</strong><br> <span style="font-family:monospace;">${b.phone || '—'}</span></div>
                <div><strong style="color:var(--text3); font-size:0.8rem; text-transform:uppercase;">Status</strong><br> <span class="status-badge status-${getStatusClass(b.status)}" style="margin-top:4px;">${b.status}</span></div>
                <div><strong style="color:var(--text3); font-size:0.8rem; text-transform:uppercase;">Next Follow-Up</strong><br> ${b.nextFollowUp||'—'}</div>
                <div><strong style="color:var(--text3); font-size:0.8rem; text-transform:uppercase;">Approached Via</strong><br> ${b.approachChannel || '—'} <span style="font-size:0.8rem; color:var(--text3);">(${b.dateContacted || 'N/A'})</span></div>
            </div>
            
            <div style="padding-top:16px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px;">
                <strong style="color:var(--text3); font-size:0.8rem; text-transform:uppercase;">Address Location</strong>
                <span style="color:var(--text); line-height: 1.5;">${b.address || '—'}</span>
            </div>
        </div>

        <div class="glass-card" style="padding:16px; margin: 16px 0; background: var(--surface2);">
            <h4 style="font-size:0.95rem; color:var(--text); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                <span>💰</span> Project & Financials
            </h4>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                <div><strong style="color:var(--text3); font-size:0.8rem; text-transform:uppercase;">Delivery Deadline</strong><br> <span style="color:var(--text);">${b.deadlineDate || '—'}</span></div>
                <div><strong style="color:var(--text3); font-size:0.8rem; text-transform:uppercase;">Payment Date</strong><br> <span style="color:var(--text);">${b.paymentDate || '—'}</span></div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; padding-top:16px; border-top:1px solid var(--border);">
                <div><strong style="color:var(--text3); font-size:0.75rem; text-transform:uppercase;">Asking Price</strong><br> <span style="color:var(--text); font-weight:600;">₹${b.priceAsked || '0'}</span></div>
                <div><strong style="color:var(--text3); font-size:0.75rem; text-transform:uppercase;">Negotiated</strong><br> <span style="color:var(--accent); font-weight:600;">₹${b.priceAgreed || '0'}</span></div>
                <div><strong style="color:var(--text3); font-size:0.75rem; text-transform:uppercase;">Advance Paid</strong><br> <span style="color:var(--green); font-weight:600;">₹${b.advancePaid || '0'}</span></div>
            </div>

            <div style="margin-top:16px; padding:12px 16px; background:var(--surface3); border:1px solid var(--border); border-radius:var(--radiusSm); display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:var(--text2); font-size:0.85rem; text-transform:uppercase;">Remaining Balance</strong>
                <span style="font-size:1.2rem; font-weight:700; color:${remaining > 0 ? 'var(--amber)' : 'var(--green)'};">₹${remaining}</span>
            </div>
        </div>
        
        <div style="display:flex; gap:12px; margin-top:20px; border-bottom:1px solid var(--border); padding-bottom:20px;">
            ${b.demoWebsiteLink ? `<a href="${b.demoWebsiteLink}" target="_blank" class="btn btn-primary" style="flex:1; text-decoration:none; font-size:0.95rem;">🌐 Open Demo Website</a>` : ''}
            ${b.mapLink ? `<a href="${b.mapLink}" target="_blank" class="btn btn-ghost" style="flex:1; text-decoration:none; font-size:0.95rem;">📍 View on Map</a>` : ''}
        </div>
        
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
            <button class="btn btn-ghost" onclick="closeProfileModal()">Close</button>
            <button class="btn btn-ghost" style="border-color:var(--accent); color:var(--accent);" onclick="closeProfileModal(); setTimeout(()=>openEditBusinessModal('${b.id}'), 350)">Edit Lead Data</button>
        </div>
    `;
    const overlay = document.getElementById('profileModalOverlay'); 
    overlay.style.display = 'flex'; 
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closeProfileModal() { 
    const overlay = document.getElementById('profileModalOverlay'); 
    overlay.classList.remove('active'); 
    setTimeout(() => overlay.style.display = 'none', 300);
}

function getFormHTML(b) {
    return `
    <div class="form-row"><div class="form-group"><label>Business Name*</label><input id="bf_name" value="${b.businessName||''}"></div><div class="form-group"><label>Owner Name*</label><input id="bf_owner" value="${b.ownerName||''}"></div></div>
    <div class="form-row"><div class="form-group"><label>Phone</label><input id="bf_phone" value="${b.phone||''}"></div><div class="form-group"><label>Category</label><input id="bf_category" value="${b.category||''}" placeholder="e.g. Retail, Real Estate"></div></div>
    
    <div class="form-row" style="background:var(--surface3); padding:12px; border-radius:var(--radiusSm); margin-bottom:16px;">
        <div class="form-group" style="margin-bottom:0;"><label>Approach Date</label><input type="date" id="bf_date" value="${b.dateContacted||''}"></div>
        <div class="form-group" style="margin-bottom:0;"><label>Approach Method</label><select id="bf_channel">${['WhatsApp','Call','Email','In-Person','LinkedIn','Other'].map(c=>`<option ${b.approachChannel===c?'selected':''}>${c}</option>`).join('')}</select></div>
    </div>
    
    <div class="form-row">
        <div class="form-group"><label>Address</label><input id="bf_address" value="${b.address||''}" placeholder="123 Main St"></div>
        <div class="form-group"><label>Google Map Link</label><input id="bf_map" value="${b.mapLink||''}" placeholder="https://maps.google.com/..."></div>
    </div>
    
    <div class="form-row"><div class="form-group"><label>Status</label><select id="bf_status">${['New Lead','Website Sent','Interested','Follow Up','No Reply','Rejected','Deal Closed'].map(s=>`<option ${b.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="form-group"><label>Next Follow-Up</label><input type="date" id="bf_followup" value="${b.nextFollowUp||''}"></div></div>
    
    <div class="form-group"><label>Demo Website Link</label><input id="bf_demo" value="${b.demoWebsiteLink||''}" placeholder="https://yourdemo.com"></div>

    <div style="margin-top:24px; padding-top:16px; border-top:1px dashed var(--border);">
        <h4 style="margin-bottom:16px; color:var(--text); font-size:1rem; display:flex; align-items:center; gap:8px;"><span>💰</span> Project & Financials</h4>
        
        <div class="form-row" style="margin-bottom:16px;">
            <div class="form-group" style="margin-bottom:0;"><label>Delivery Deadline</label><input type="date" id="bf_deadline" value="${b.deadlineDate||''}"></div>
            <div class="form-group" style="margin-bottom:0;"><label>Payment/Agreement Date</label><input type="date" id="bf_payment_date" value="${b.paymentDate||''}"></div>
        </div>

        <div class="form-row-3">
            <div class="form-group" style="margin-bottom:0;"><label>Asking Price (₹)</label><input type="number" id="bf_price_asked" value="${b.priceAsked||''}" placeholder="0"></div>
            <div class="form-group" style="margin-bottom:0;"><label>Negotiated (₹)</label><input type="number" id="bf_price_agreed" value="${b.priceAgreed||''}" placeholder="0"></div>
            <div class="form-group" style="margin-bottom:0;"><label>Advance Paid (₹)</label><input type="number" id="bf_advance" value="${b.advancePaid||''}" placeholder="0"></div>
        </div>
    </div>
    `;
}

function saveBusiness() {
    const name = document.getElementById('bf_name')?.value.trim();
    const owner = document.getElementById('bf_owner')?.value.trim();
    if(!name || !owner) return showToast('Business Name and Owner are required', 'error');
    
    const data = {
        businessName: name, ownerName: owner, phone: document.getElementById('bf_phone')?.value||'', category: document.getElementById('bf_category')?.value||'',
        address: document.getElementById('bf_address')?.value||'', mapLink: document.getElementById('bf_map')?.value||'',
        dateContacted: document.getElementById('bf_date')?.value||'', approachChannel: document.getElementById('bf_channel')?.value||'WhatsApp',
        status: document.getElementById('bf_status')?.value||'New Lead', nextFollowUp: document.getElementById('bf_followup')?.value||'', demoWebsiteLink: document.getElementById('bf_demo')?.value||'',
        
        deadlineDate: document.getElementById('bf_deadline')?.value||'',
        paymentDate: document.getElementById('bf_payment_date')?.value||'',
        priceAsked: Number(document.getElementById('bf_price_asked')?.value) || 0,
        priceAgreed: Number(document.getElementById('bf_price_agreed')?.value) || 0,
        advancePaid: Number(document.getElementById('bf_advance')?.value) || 0,
    };
    
    if(currentEditId) {
        const idx = businesses.findIndex(b=>b.id===currentEditId); 
        if(idx>=0) businesses[idx] = {...businesses[idx], ...data}; 
        showToast('Lead updated!');
    } else {
        const colors = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ef4444','#f59e0b'];
        businesses.unshift({...data, id:'biz_'+Date.now(), colorLabel: colors[Math.floor(Math.random()*colors.length)]}); 
        showToast('New lead added!');
    }
    
    saveDataToCloud(); 
    closeBusinessModal(); 
    refreshDashboard(); 
    renderBusinessTable(); 
    if(document.getElementById('page-calendar').classList.contains('active')) renderCalendar();
}

function deleteBusiness(id) {
    if(!confirm('Delete this lead? This cannot be undone.')) return;
    businesses = businesses.filter(b=>b.id!==id); 
    saveDataToCloud(); 
    showToast('Lead deleted.', 'error'); 
    renderBusinessTable(); 
    refreshDashboard();
}

// --- 8. INITIALIZATION ---

function init() {
    loadSettings();
    applySettings();
    
    // Inject DOM Elements dynamically just like before
    
    // Add Login button to sidebar
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if(sidebarFooter) {
        sidebarFooter.insertAdjacentHTML('afterbegin', `<button class="btn btn-primary btn-sm" style="width:100%; justify-content:center; margin-bottom:8px;" onclick="toggleAuth()" id="sidebarAuthBtn">🔐 Login with Google</button>`);
    }

    // Add Login button to mobile header
    const mobileHeader = document.querySelector('.mobile-header');
    if(mobileHeader) {
        mobileHeader.insertAdjacentHTML('beforeend', `<button class="btn btn-primary btn-sm" style="border-radius:20px; padding:6px 10px; margin-right:8px;" onclick="toggleAuth()" id="mobileAuthBtn">🔐</button>`);
    }
    
    document.getElementById('mainContent').innerHTML = `
        <div class="page active" id="page-dashboard">
            <div class="animate-slide-up" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h1 style="font-size:1.8rem; font-weight:700;">Dashboard Overview</h1>
            </div>
            
            <div class="stats-grid" id="dashboardStats"></div>
            
            <div class="glass-card animate-slide-up" style="animation-delay: 0.15s; margin-bottom: 24px;">
                <h3 style="margin-bottom: 20px; font-size:1.2rem;">📊 Lead Status Distribution</h3>
                <div class="pie-chart-container">
                    <div class="pie-chart" id="pieChart"></div>
                    <div id="pieLegend" style="flex:1; min-width: 200px; display:flex; flex-direction:column; gap:4px;"></div>
                </div>
            </div>

            <div class="glass-card animate-slide-up" style="animation-delay: 0.2s;">
                <h3 style="margin-bottom:20px; font-size:1.2rem;">🔥 Today's Follow-Ups</h3>
                <div id="todayFollowUps"></div>
            </div>
        </div>
        
        <div class="page" id="page-businesses">
            <div class="animate-slide-up" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h1 style="font-size:1.8rem; font-weight:700;">Lead Directory</h1>
            </div>
            <div class="glass-card animate-slide-up" style="margin-bottom:24px; padding:16px;">
                <div style="display:flex; gap:16px; flex-wrap:wrap;">
                    <input id="businessSearch" placeholder="Search by name or owner..." style="flex:1; min-width:250px; padding:12px 16px; border-radius:var(--radiusSm); border:1px solid var(--border2); background:var(--surface);" onkeyup="renderBusinessTable()">
                    <select id="statusFilter" style="padding:12px 16px; border-radius:var(--radiusSm); border:1px solid var(--border2); background:var(--surface); min-width:180px;" onchange="renderBusinessTable()">
                        <option value="all">All Statuses</option><option>New Lead</option><option>Website Sent</option><option>Interested</option><option>Follow Up</option><option>Deal Closed</option><option>Rejected</option>
                    </select>
                </div>
            </div>
            <div class="table-container animate-slide-up" style="animation-delay:0.1s;">
                <table><thead><tr><th>Log</th><th>Business</th><th>Status</th><th>Approached</th><th>Follow Up</th><th>Demo Site</th><th>Actions</th></tr></thead><tbody id="businessTableBody"></tbody></table>
            </div>
            <div id="pagination" style="display:flex; justify-content:flex-end; margin-top:16px;"></div>
        </div>
        
        <div class="page" id="page-calendar">
            <div class="animate-slide-up" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h1 style="font-size:1.8rem; font-weight:700;">Follow-up Calendar</h1>
            </div>
            <div class="glass-card animate-slide-up" style="animation-delay:0.1s;">
                <div class="calendar-header">
                    <button class="btn btn-ghost" onclick="changeMonth(-1)">← Prev</button>
                    <h2 id="calMonthYear" style="font-size:1.4rem;"></h2>
                    <button class="btn btn-ghost" onclick="changeMonth(1)">Next →</button>
                </div>
                <div class="calendar-grid" style="margin-bottom:8px;">
                    <div class="calendar-day-header">Sun</div><div class="calendar-day-header">Mon</div><div class="calendar-day-header">Tue</div><div class="calendar-day-header">Wed</div><div class="calendar-day-header">Thu</div><div class="calendar-day-header">Fri</div><div class="calendar-day-header">Sat</div>
                </div>
                <div class="calendar-grid" id="calendarGrid"></div>
            </div>
        </div>
        
        <div class="page" id="page-settings">
            <div class="animate-slide-up"><h1 style="font-size:1.8rem; font-weight:700; margin-bottom:24px;">Settings & Preferences</h1></div>
            
            <div class="glass-card animate-slide-up" style="animation-delay:0.1s; max-width: 600px;">
                <div style="margin-bottom: 32px;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px; color: var(--text2); border-bottom: 1px solid var(--border); padding-bottom: 8px;">Branding & Appearance</h3>
                    <div class="form-group" style="margin-bottom:16px;">
                        <label>Application Name</label>
                        <input id="set_name" value="${settings.logoName}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>UI Theme</label>
                            <select id="set_theme">
                                <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                                <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light Mode</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Accent Color</label>
                            <input type="color" id="set_color" class="color-picker" value="${settings.accentColor}">
                        </div>
                    </div>
                    <div style="margin-top:20px;">
                        <button class="btn btn-primary" onclick="saveSettings()">Save Configuration</button>
                    </div>
                </div>

                <div style="margin-top:40px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.05);">
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px; color: var(--text2); padding-bottom: 8px;">Demo Testing</h3>
                    <p style="color:var(--text3); font-size:0.9rem; margin-bottom:16px;">Add sample leads to test out the chart and tables.</p>
                    <button class="btn btn-ghost" onclick="generateDemoData()">🧪 Load Demo Data</button>
                </div>
                
                <div style="margin-top:40px;">
                    <h3 style="color:var(--red); border-bottom: 1px solid rgba(239, 68, 68, 0.2); padding-bottom: 8px; font-size: 1.1rem; margin-bottom: 16px;">Danger Zone</h3>
                    <p style="color:var(--text3); font-size:0.9rem; margin-bottom:16px;">This action will permanently delete all leads and CRM data from your cloud account.</p>
                    <button class="btn btn-danger" onclick="clearAllData()">🗑 Clear All Data</button>
                </div>
            </div>
        </div>
    `;
    refreshDashboard(); 
    renderBusinessTable();
}

// Inject Modal Overlays dynamically to keep HTML clean
document.body.insertAdjacentHTML('beforeend',`
    <div class="modal-overlay" id="businessModalOverlay" style="display:none;"><div class="modal"><div class="modal-header"><h2 id="businessModalTitle" style="font-size:1.4rem;">Add Lead</h2><button class="modal-close" onclick="closeBusinessModal()">✕</button></div><div class="modal-body" id="businessModalBody"></div><div style="padding:24px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:12px; background:var(--surface2); border-radius: 0 0 var(--radius) var(--radius);"><button class="btn btn-ghost" onclick="closeBusinessModal()">Cancel</button><button class="btn btn-primary" onclick="saveBusiness()">Save Lead Data</button></div></div></div>
    <div class="modal-overlay" id="profileModalOverlay" style="display:none;"><div class="modal" style="max-width:550px;"><div class="modal-header"><h2 id="profileModalTitle" style="font-size:1.4rem;">Profile</h2><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body" id="profileModalBody"></div></div></div>
`);

// Check and register Service Worker for PWA compliance
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered!'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// Boot up the application
init();
