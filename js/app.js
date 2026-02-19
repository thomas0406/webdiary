// ========================================
// NEON DIARY - App JavaScript
// ========================================

// ========================================
// Configuration
// ========================================
// Admin password - CHANGE THIS for security!
const ADMIN_PASSWORD = "neondiary123";

// Firebase Configuration
// Replace these values with your Firebase project config
// Get your config from: https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: "AIzaSyBFOwjdEsH769QT4wLoNQkbv8w2uDjnUKg",
  authDomain: "diary-web-d4d6f.firebaseapp.com",
  projectId: "diary-web-d4d6f",
  storageBucket: "diary-web-d4d6f.firebasestorage.app",
  messagingSenderId: "89292692627",
  appId: "1:89292692627:web:b25699de3fa686fedb0166",
  measurementId: "G-BHN5KZQ2K6",
  databaseURL: "https://diary-web-d4d6f.firebaseio.com"
};

// Firebase variables
let db;
let firebaseInitialized = false;

// ========================================
// App State
// ========================================
const AppState = {
    diaries: [],
    publicDiaries: [],
    currentDiary: null,
    isEditing: false,
    editingId: null,
    isAdmin: false,
    isVisitorMode: false
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    // Sections
    homeSection: document.getElementById('homeSection'),
    writeSection: document.getElementById('writeSection'),
    viewSection: document.getElementById('viewSection'),
    loginSection: document.getElementById('loginSection'),
    visitorSection: document.getElementById('visitorSection'),
    
    // Navigation
    homeBtn: document.getElementById('homeBtn'),
    newDiaryBtn: document.getElementById('newDiaryBtn'),
    visitorBtn: document.getElementById('visitorBtn'),
    adminBtn: document.getElementById('adminBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    backBtn: document.getElementById('backBtn'),
    cancelLoginBtn: document.getElementById('cancelLoginBtn'),
    
    // Forms
    diaryForm: document.getElementById('diaryForm'),
    loginForm: document.getElementById('loginForm'),
    diaryTitle: document.getElementById('diaryTitle'),
    diaryDate: document.getElementById('diaryDate'),
    diaryMood: document.getElementById('diaryMood'),
    diaryContent: document.getElementById('diaryContent'),
    diaryTags: document.getElementById('diaryTags'),
    diaryPublic: document.getElementById('diaryPublic'),
    adminPassword: document.getElementById('adminPassword'),
    
    // Display
    diaryList: document.getElementById('diaryList'),
    visitorDiaryList: document.getElementById('visitorDiaryList'),
    emptyState: document.getElementById('emptyState'),
    visitorEmptyState: document.getElementById('visitorEmptyState'),
    diaryDetail: document.getElementById('diaryDetail'),
    
    // Actions
    editDiaryBtn: document.getElementById('editDiaryBtn'),
    deleteDiaryBtn: document.getElementById('deleteDiaryBtn'),
    
    // Admin only elements
    adminOnlyElements: document.querySelectorAll('.admin-only'),
    adminOnlyActions: document.querySelector('.admin-only-actions'),
    
    // Mood buttons
    moodBtns: document.querySelectorAll('.mood-btn')
};

// ========================================
// Initialize App
// ========================================
async function initApp() {
    console.log('🚀 Initializing Neon Diary...');
    
    // Set today's date as default
    elements.diaryDate.valueAsDate = new Date();
    
    // Check if admin is logged in (from session)
    const adminLoggedIn = sessionStorage.getItem('isAdmin') === 'true';
    if (adminLoggedIn) {
        AppState.isAdmin = true;
        updateAdminUI();
    }
    
    // Try to initialize Firebase
    await initFirebase();
    
    // Load diaries
    await loadDiaries();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅  Diary initialized!');
}

// ========================================
// Firebase Initialization
// ========================================
async function initFirebase() {
    try {
        // Check if config is set (not the placeholder)
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.log('⚠️ Firebase not configured. Using localStorage.');
            return;
        }
        
        // Initialize Firebase
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(app);
        firebaseInitialized = true;
        
        console.log('✅ Firebase connected!');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        console.log('⚠️ Using localStorage as fallback.');
    }
}

// ========================================
// Load Diaries
// ========================================
async function loadDiaries() {
    try {
        if (firebaseInitialized) {
            // Load from Firebase
            const snapshot = await db.collection('diaries')
                .orderBy('date', 'desc')
                .get();
            
            AppState.diaries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } else {
            // Load from localStorage
            const stored = localStorage.getItem('neonDiaries');
            AppState.diaries = stored ? JSON.parse(stored) : [];
            
            // Sort by date (newest first)
            AppState.diaries.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // Filter public diaries for visitors
        AppState.publicDiaries = AppState.diaries.filter(d => d.isPublic === true);
        
        renderDiaryList();
        renderVisitorDiaryList();
    } catch (error) {
        console.error('❌ Error loading diaries:', error);
        showNotification('Gagal memuat diary!', 'error');
    }
}

// ========================================
// Save Diary
// ========================================
async function saveDiary(diaryData) {
    try {
        if (firebaseInitialized) {
            // Save to Firebase
            const docRef = await db.collection('diaries').add({
                ...diaryData,
                isPublic: diaryData.isPublic || false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } else {
            // Save to localStorage
            const id = 'diary_' + Date.now();
            diaryData.id = id;
            diaryData.isPublic = diaryData.isPublic || false;
            diaryData.createdAt = new Date().toISOString();
            
            AppState.diaries.unshift(diaryData);
            localStorage.setItem('neonDiaries', JSON.stringify(AppState.diaries));
            
            return id;
        }
    } catch (error) {
        console.error('❌ Error saving diary:', error);
        throw error;
    }
}

// ========================================
// Update Diary
// ========================================
async function updateDiary(id, diaryData) {
    try {
        if (firebaseInitialized) {
            // Update in Firebase
            await db.collection('diaries').doc(id).update({
                ...diaryData,
                isPublic: diaryData.isPublic || false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Update in localStorage
            const index = AppState.diaries.findIndex(d => d.id === id);
            if (index !== -1) {
                AppState.diaries[index] = {
                    ...AppState.diaries[index],
                    ...diaryData,
                    isPublic: diaryData.isPublic || false,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('neonDiaries', JSON.stringify(AppState.diaries));
            }
        }
    } catch (error) {
        console.error('❌ Error updating diary:', error);
        throw error;
    }
}

// ========================================
// Delete Diary
// ========================================
async function deleteDiary(id) {
    try {
        if (firebaseInitialized) {
            // Delete from Firebase
            await db.collection('diaries').doc(id).delete();
        } else {
            // Delete from localStorage
            AppState.diaries = AppState.diaries.filter(d => d.id !== id);
            localStorage.setItem('neonDiaries', JSON.stringify(AppState.diaries));
        }
        
        showNotification('Diary berhasil dihapus!', 'success');
    } catch (error) {
        console.error('❌ Error deleting diary:', error);
        showNotification('Gagal menghapus diary!', 'error');
    }
}

// ========================================
// Render Diary List (Admin/Home)
// ========================================
function renderDiaryList() {
    const { diaryList, emptyState } = elements;
    
    // Clear current list
    diaryList.innerHTML = '';
    
    // Show/hide empty state
    if (AppState.diaries.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Render diary cards
    AppState.diaries.forEach(diary => {
        const card = createDiaryCard(diary);
        diaryList.appendChild(card);
    });
}

// ========================================
// Render Visitor Diary List
// ========================================
function renderVisitorDiaryList() {
    const { visitorDiaryList, visitorEmptyState } = elements;
    
    // Clear current list
    visitorDiaryList.innerHTML = '';
    
    // Show/hide empty state
    if (AppState.publicDiaries.length === 0) {
        visitorEmptyState.classList.remove('hidden');
        return;
    }
    
    visitorEmptyState.classList.add('hidden');
    
    // Render diary cards
    AppState.publicDiaries.forEach(diary => {
        const card = createDiaryCard(diary, true);
        visitorDiaryList.appendChild(card);
    });
}

// ========================================
// Create Diary Card
// ========================================
function createDiaryCard(diary, isVisitor = false) {
    const card = document.createElement('div');
    card.className = 'diary-card';
    card.onclick = () => viewDiary(diary.id, isVisitor);
    
    const moodEmoji = getMoodEmoji(diary.mood);
    const formattedDate = formatDate(diary.date);
    const tags = diary.tags ? diary.tags.split(',').map(t => t.trim()).filter(t => t) : [];
    
    // Show public indicator
    const publicIndicator = diary.isPublic ? '<span class="tag tag-public"><i class="fas fa-globe"></i> Public</span>' : '<span class="tag tag-private"><i class="fas fa-lock"></i> Private</span>';
    
    card.innerHTML = `
        <div class="diary-card-header">
            <div>
                <h3 class="diary-card-title">${escapeHtml(diary.title)}</h3>
                <span class="diary-card-date">
                    <i class="fas fa-calendar-alt"></i>
                    ${formattedDate}
                </span>
            </div>
            <span class="diary-card-mood">${moodEmoji}</span>
        </div>
        <p class="diary-card-preview">${escapeHtml(diary.content)}</p>
        <div class="diary-card-tags">
            ${publicIndicator}
            ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
    `;
    
    return card;
}

// ========================================
// View Diary Detail
// ========================================
function viewDiary(id, isVisitor = false) {
    const diary = AppState.diaries.find(d => d.id === id);
    if (!diary) return;
    
    AppState.currentDiary = diary;
    
    const { diaryDetail } = elements;
    const moodEmoji = getMoodEmoji(diary.mood);
    const formattedDate = formatDate(diary.date);
    const formattedTime = formatTime(diary.createdAt);
    const tags = diary.tags ? diary.tags.split(',').map(t => t.trim()).filter(t => t) : [];
    const visibility = diary.isPublic ? '<span class="tag tag-public"><i class="fas fa-globe"></i> Public</span>' : '<span class="tag tag-private"><i class="fas fa-lock"></i> Private</span>';
    
    diaryDetail.innerHTML = `
        <div class="diary-detail-header">
            <h1 class="diary-detail-title">${escapeHtml(diary.title)}</h1>
            <div class="diary-detail-meta">
                <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                <span><i class="fas fa-clock"></i> ${formattedTime}</span>
                <span class="diary-detail-mood">${moodEmoji}</span>
                ${visibility}
            </div>
        </div>
        <div class="diary-detail-content">${escapeHtml(diary.content)}</div>
        ${tags.length > 0 ? `
            <div class="diary-detail-tags">
                ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        ` : ''}
    `;
    
    // Show/hide edit/delete buttons based on admin status
    if (AppState.isAdmin && elements.adminOnlyActions) {
        elements.adminOnlyActions.classList.remove('hidden');
    } else if (elements.adminOnlyActions) {
        elements.adminOnlyActions.classList.add('hidden');
    }
    
    switchSection('view');
}

// ========================================
// Navigation
// ========================================
function switchSection(sectionName) {
    // Hide all sections
    elements.homeSection.classList.remove('active');
    elements.writeSection.classList.remove('active');
    elements.viewSection.classList.remove('active');
    elements.loginSection.classList.remove('active');
    elements.visitorSection.classList.remove('active');
    
    // Update nav buttons
    elements.homeBtn.classList.remove('active');
    elements.newDiaryBtn.classList.remove('active');
    elements.visitorBtn.classList.remove('active');
    elements.adminBtn.classList.remove('active');
    
    // Show selected section
    switch (sectionName) {
        case 'home':
            elements.homeSection.classList.add('active');
            elements.homeBtn.classList.add('active');
            AppState.isVisitorMode = false;
            renderDiaryList();
            break;
        case 'write':
            elements.writeSection.classList.add('active');
            elements.newDiaryBtn.classList.add('active');
            break;
        case 'view':
            elements.homeBtn.classList.add('active');
            break;
        case 'login':
            elements.loginSection.classList.add('active');
            elements.adminBtn.classList.add('active');
            break;
        case 'visitor':
            elements.visitorSection.classList.add('active');
            elements.visitorBtn.classList.add('active');
            AppState.isVisitorMode = true;
            renderVisitorDiaryList();
            break;
    }
}

// ========================================
// Admin Authentication
// ========================================
function handleLogin(e) {
    e.preventDefault();
    
    const password = elements.adminPassword.value;
    
    if (password === ADMIN_PASSWORD) {
        AppState.isAdmin = true;
        sessionStorage.setItem('isAdmin', 'true');
        updateAdminUI();
        showNotification('Login berhasil!', 'success');
        elements.adminPassword.value = '';
        switchSection('home');
    } else {
        showNotification('Password salah!', 'error');
    }
}

function handleLogout() {
    AppState.isAdmin = false;
    sessionStorage.removeItem('isAdmin');
    updateAdminUI();
    showNotification('Logout berhasil!', 'success');
    switchSection('home');
}

function updateAdminUI() {
    // Show/hide admin-only elements
    elements.adminOnlyElements.forEach(el => {
        if (AppState.isAdmin) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
    
    // Update admin button
    if (AppState.isAdmin) {
        elements.adminBtn.innerHTML = '<i class="fas fa-user-check"></i> Admin';
    } else {
        elements.adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
    }
}

// ========================================
// Form Handling
// ========================================
function setupEventListeners() {
    // Navigation
    elements.homeBtn.addEventListener('click', () => switchSection('home'));
    elements.visitorBtn.addEventListener('click', () => switchSection('visitor'));
    elements.adminBtn.addEventListener('click', () => {
        if (AppState.isAdmin) {
            handleLogout();
        } else {
            switchSection('login');
        }
    });
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    elements.newDiaryBtn.addEventListener('click', () => {
        resetForm();
        switchSection('write');
    });
    elements.cancelBtn.addEventListener('click', () => {
        resetForm();
        switchSection('home');
    });
    elements.cancelLoginBtn.addEventListener('click', () => {
        elements.adminPassword.value = '';
        switchSection('home');
    });
    elements.backBtn.addEventListener('click', () => {
        if (AppState.isVisitorMode) {
            switchSection('visitor');
        } else {
            switchSection('home');
        }
    });
    
    // Login form
    elements.loginForm.addEventListener('submit', handleLogin);
    
    // Mood selector
    elements.moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.moodBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            elements.diaryMood.value = btn.dataset.mood;
        });
    });
    
    // Form submit
    elements.diaryForm.addEventListener('submit', handleFormSubmit);
    
    // Diary actions
    elements.editDiaryBtn.addEventListener('click', editCurrentDiary);
    elements.deleteDiaryBtn.addEventListener('click', deleteCurrentDiary);
}

// ========================================
// Handle Form Submit
// ========================================
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const isPublic = elements.diaryPublic ? elements.diaryPublic.checked : false;
    
    const diaryData = {
        title: elements.diaryTitle.value.trim(),
        date: elements.diaryDate.value,
        mood: elements.diaryMood.value,
        content: elements.diaryContent.value.trim(),
        tags: elements.diaryTags.value.trim(),
        isPublic: isPublic
    };
    
    try {
        showNotification('Menyimpan diary...', 'info');
        
        if (AppState.isEditing) {
            await updateDiary(AppState.editingId, diaryData);
            showNotification('Diary berhasil diperbarui!', 'success');
        } else {
            await saveDiary(diaryData);
            showNotification('Diary berhasil disimpan!', 'success');
        }
        
        resetForm();
        await loadDiaries();
        switchSection('home');
    } catch (error) {
        showNotification('Gagal menyimpan diary!', 'error');
    }
}

// ========================================
// Edit Diary
// ========================================
function editCurrentDiary() {
    const diary = AppState.currentDiary;
    if (!diary) return;
    
    AppState.isEditing = true;
    AppState.editingId = diary.id;
    
    elements.diaryTitle.value = diary.title;
    elements.diaryDate.value = diary.date;
    elements.diaryMood.value = diary.mood;
    elements.diaryContent.value = diary.content;
    elements.diaryTags.value = diary.tags || '';
    if (elements.diaryPublic) {
        elements.diaryPublic.checked = diary.isPublic || false;
    }
    
    // Select mood
    elements.moodBtns.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.mood === diary.mood) {
            btn.classList.add('selected');
        }
    });
    
    switchSection('write');
    showNotification('Mode edit diary', 'info');
}

// ========================================
// Delete Diary
// ========================================
async function deleteCurrentDiary() {
    const diary = AppState.currentDiary;
    if (!diary) return;
    
    if (confirm('Apakah Anda yakin ingin menghapus diary ini?')) {
        await deleteDiary(diary.id);
        AppState.currentDiary = null;
        await loadDiaries();
        switchSection('home');
    }
}

// ========================================
// Reset Form
// ========================================
function resetForm() {
    elements.diaryForm.reset();
    elements.diaryDate.valueAsDate = new Date();
    AppState.isEditing = false;
    AppState.editingId = null;
    
    if (elements.diaryPublic) {
        elements.diaryPublic.checked = false;
    }
    
    elements.moodBtns.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.mood === 'happy') {
            btn.classList.add('selected');
        }
    });
    elements.diaryMood.value = 'happy';
}

// ========================================
// Utility Functions
// ========================================
function getMoodEmoji(mood) {
    const moods = {
        happy: '<i class="fas fa-smile-beam" style="color: #ffff00;"></i>',
        love: '<i class="fas fa-heart" style="color: #ff00ff;"></i>',
        sad: '<i class="fas fa-sad-tear" style="color: #00ffff;"></i>',
        angry: '<i class="fas fa-angry" style="color: #ff073a;"></i>',
        cool: '<i class="fas fa-meh" style="color: #39ff14;"></i>'
    };
    return moods[mood] || moods.happy;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('id-ID', options);
}

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#39ff14' : type === 'error' ? '#ff073a' : '#00ffff'};
        color: #0a0a0f;
        border-radius: 10px;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 0 20px ${type === 'success' ? '#39ff14' : type === 'error' ? '#ff073a' : '#00ffff'};
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation keyframes and additional CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    /* Additional styles */
    .hidden {
        display: none !important;
    }
    
    .tag-public {
        background: rgba(57, 255, 20, 0.1);
        border-color: rgba(57, 255, 20, 0.3);
        color: #39ff14;
    }
    
    .tag-private {
        background: rgba(255, 0, 255, 0.1);
        border-color: rgba(255, 0, 255, 0.3);
        color: #ff00ff;
    }
    
    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .checkbox-label input {
        width: 20px;
        height: 20px;
        accent-color: var(--neon-cyan);
    }
    
    .login-hint {
        text-align: center;
        margin-top: 1.5rem;
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    
    .admin-only-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }
    
    .admin-only-actions.hidden {
        display: none;
    }
`;
document.head.appendChild(style);

// ========================================
// Initialize on DOM Load
// ========================================
document.addEventListener('DOMContentLoaded', initApp);
