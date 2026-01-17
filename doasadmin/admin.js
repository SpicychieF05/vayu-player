import { supabase } from '../sections/common/supabase.js';
import { escapeHtml } from '../sections/common/utils.js';

// Credentials
const ADMIN_ID = "admin_chirantan_codiverse";
const ADMIN_PASS = "codiverse_chirantan";

// State
let items = [];

document.addEventListener("DOMContentLoaded", () => {
    checkLogin();
    bindEvents();
});

function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('vayu_admin_logged_in') === 'true';
    if (isLoggedIn) {
        showDashboard();
    } else {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('dashboardSection').classList.add('hidden');
    }
}

function bindEvents() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('adminId').value;
        const pass = document.getElementById('adminPass').value;

        if (id === ADMIN_ID && pass === ADMIN_PASS) {
            sessionStorage.setItem('vayu_admin_logged_in', 'true');
            showDashboard();
        } else {
            const err = document.getElementById('loginError');
            err.classList.remove('hidden');
            setTimeout(() => err.classList.add('hidden'), 3000);
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('vayu_admin_logged_in');
        window.location.reload();
    });

    // Search
    document.getElementById('adminSearch').addEventListener('input', (e) => render(e.target.value));

    // Edit Modal
    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('editModal')) closeEditModal();
    });

    document.getElementById('editForm').addEventListener('submit', (e) => {
        e.preventDefault();
        updateItem();
    });
}

function showDashboard() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    loadLibrary();
}

async function loadLibrary() {
    const loader = document.getElementById('loadingState');
    loader.classList.remove('hidden');
    
    // Check if supabase is ready
    if (!supabase) {
        alert("Supabase not initialized. Please check configuration.");
        return;
    }

    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

    loader.classList.add('hidden');

    if (error) {
        console.error("Error loading library:", error);
        alert("Failed to load library");
        return;
    }

    items = data || [];
    render();
}

function render(query = "") {
    const grid = document.getElementById('adminGrid');
    grid.innerHTML = "";

    const filtered = items.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) || 
        (item.user && item.user.toLowerCase().includes(query.toLowerCase()))
    );

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'library-card';
        card.innerHTML = `
            <div class="lib-card-content">
                <div class="lib-card-header">
                    <h3 class="lib-card-title">${escapeHtml(item.name)}</h3>
                    <div class="lib-card-meta">
                        <span class="lib-badge">${item.type}</span>
                        <span>•</span>
                        <span>${item.lang}</span>
                    </div>
                </div>
                <div class="lib-card-footer">
                    <span class="lib-user">Added by ${escapeHtml(item.username || item.user || 'Anon')}</span>
                </div>
                <!-- Admin Actions -->
                <div class="admin-actions">
                    <button class="action-btn edit-btn" data-id="${item.id}">Edit</button>
                    <button class="action-btn delete-btn" data-id="${item.id}">Delete</button>
                </div>
            </div>
        `;

        card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(item));
        card.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id));
        
        grid.appendChild(card);
    });
}

async function deleteItem(id) {
    if (!confirm("Are you sure you want to delete this video?")) return;

    const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error deleting: " + error.message);
    } else {
        items = items.filter(i => i.id !== id);
        render(document.getElementById('adminSearch').value);
    }
}

function openEditModal(item) {
    document.getElementById('editId').value = item.id;
    document.getElementById('editName').value = item.name;
    document.getElementById('editLink').value = item.link;
    document.getElementById('editType').value = item.type;
    document.getElementById('editLang').value = item.lang;
    
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

async function updateItem() {
    const id = document.getElementById('editId').value;
    const updates = {
        name: document.getElementById('editName').value,
        link: document.getElementById('editLink').value,
        type: document.getElementById('editType').value,
        lang: document.getElementById('editLang').value,
    };

    const { error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', id);

    if (error) {
        alert("Error updating: " + error.message);
    } else {
        const index = items.findIndex(i => i.id == id); // Loose equality for string/int id mismatch
        if (index !== -1) {
            items[index] = { ...items[index], ...updates };
        }
        closeEditModal();
        render(document.getElementById('adminSearch').value);
    }
}
