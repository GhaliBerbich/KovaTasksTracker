// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, update } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCGpCAa6_gUB9SAgRXiBQ2dXZidvNbf6Rg",
  authDomain: "kovatasktracker.firebaseapp.com",
  databaseURL: "https://kovatasktracker-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kovatasktracker",
  storageBucket: "kovatasktracker.firebasestorage.app",
  messagingSenderId: "1062116112198",
  appId: "1:1062116112198:web:a135bfe5d1be7421cc5747",
  measurementId: "G-ED768L7X79"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// State
let tasks = [];
let isAdmin = sessionStorage.getItem('kovaAdmin') === 'true';

// Currently selected task for claiming
let currentClaimTaskId = null;

// DOM Elements
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const addTaskBtn = document.getElementById('add-task-btn');

const adminModal = document.getElementById('admin-modal');
const addTaskModal = document.getElementById('add-task-modal');
const claimTaskModal = document.getElementById('claim-task-modal');

// Lists
const lists = {
    high: document.getElementById('list-high'),
    medium: document.getElementById('list-medium'),
    low: document.getElementById('list-low')
};

const counts = {
    high: document.getElementById('count-high'),
    medium: document.getElementById('count-medium'),
    low: document.getElementById('count-low')
};

// Initialization
function init() {
    updateAuthUI();
    setupEventListeners();
    
    // Setup Firebase Listener
    const tasksRef = ref(db, 'tasks');
    onValue(tasksRef, (snapshot) => {
        const data = snapshot.val();
        tasks = [];
        if (data) {
            tasks = Object.values(data);
        }
        renderTasks();
    });
}

// Helpers
function updateAuthUI() {
    if (isAdmin) {
        adminLoginBtn.classList.add('hidden');
        adminLogoutBtn.classList.remove('hidden');
        addTaskBtn.classList.remove('hidden');
    } else {
        adminLoginBtn.classList.remove('hidden');
        adminLogoutBtn.classList.add('hidden');
        addTaskBtn.classList.add('hidden');
    }
}

// Render
function renderTasks() {
    // Clear lists
    Object.values(lists).forEach(list => list.innerHTML = '');
    
    // Reset counts
    const currentCounts = { high: 0, medium: 0, low: 0 };

    tasks.forEach(task => {
        const priority = task.priority || 'medium';
        currentCounts[priority]++;
        
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.id = task.id;
        card.dataset.colormode = task.colorMode;
        
        const isAssigned = task.assignee && task.assignee.trim() !== '';
        const assigneeHTML = isAssigned 
            ? `<div class="task-assignee" title="Assigned to">${escapeHtml(task.assignee)}</div>`
            : `<div class="task-assignee unassigned" title="Click to claim">Tap to claim...</div>`;

        card.innerHTML = `
            <div class="hover-menu">
                ${priority !== 'high' ? `<button class="hover-btn move-btn" data-target="${priority === 'low' ? 'medium' : 'high'}" title="Move Left"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
                ${priority !== 'low' ? `<button class="hover-btn move-btn" data-target="${priority === 'high' ? 'medium' : 'low'}" title="Move Right"><i class="fa-solid fa-arrow-right"></i></button>` : ''}
                ${isAdmin ? `<button class="hover-btn delete-btn" title="Delete Task"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
            
            <div class="task-header">
                <div class="task-title">${escapeHtml(task.title)}</div>
            </div>
            <div class="task-desc">${escapeHtml(task.description || '')}</div>
            
            <div class="assignee-container">
                ${assigneeHTML}
            </div>
            <button class="details-btn toggle-details-btn">Show Details...</button>
            <div class="task-details collapsed" onclick="event.stopPropagation();">
                <div class="task-controls">
                    <div class="control-row">
                        <input type="checkbox" id="impl-${task.id}" class="custom-checkbox status-check" data-field="implemented" ${task.implemented ? 'checked' : ''}>
                        <label for="impl-${task.id}">Implemented</label>
                    </div>
                    <div class="control-row">
                        <input type="checkbox" id="push-${task.id}" class="custom-checkbox status-check" data-field="pushed" ${task.pushed ? 'checked' : ''}>
                        <label for="push-${task.id}">Pushed</label>
                    </div>
                    <div class="control-row">
                        <input type="checkbox" id="rel-${task.id}" class="custom-checkbox status-check" data-field="released" ${task.released ? 'checked' : ''}>
                        <label for="rel-${task.id}">Released</label>
                    </div>
                    <div class="control-row" style="margin-top: 5px;">
                        <label for="ver-${task.id}">Version:</label>
                        <input type="text" id="ver-${task.id}" class="version-input" data-id="${task.id}" value="${escapeHtml(task.version || '')}" placeholder="e.g. 2.2">
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM
        if (lists[priority]) {
            lists[priority].appendChild(card);
        }
    });

    // Update counts
    counts.high.textContent = currentCounts.high;
    counts.medium.textContent = currentCounts.medium;
    counts.low.textContent = currentCounts.low;
}

// Escaping utility
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Event Listeners
function setupEventListeners() {
    // Admin Auth
    adminLoginBtn.addEventListener('click', () => {
        adminModal.classList.remove('hidden');
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-error').classList.add('hidden');
        document.getElementById('admin-password').focus();
    });

    adminLogoutBtn.addEventListener('click', () => {
        isAdmin = false;
        sessionStorage.setItem('kovaAdmin', 'false');
        updateAuthUI();
        renderTasks(); // Re-render to hide delete buttons
    });

    document.getElementById('close-admin-modal').addEventListener('click', () => {
        adminModal.classList.add('hidden');
    });

    document.getElementById('submit-admin-btn').addEventListener('click', () => {
        const pwd = document.getElementById('admin-password').value;
        if (pwd === 'Kova2026Team') {
            isAdmin = true;
            sessionStorage.setItem('kovaAdmin', 'true');
            adminModal.classList.add('hidden');
            updateAuthUI();
            renderTasks(); // Re-render to show delete buttons
        } else {
            document.getElementById('admin-error').classList.remove('hidden');
        }
    });

    // Add Task
    addTaskBtn.addEventListener('click', () => {
        addTaskModal.classList.remove('hidden');
        document.getElementById('new-task-title').value = '';
        document.getElementById('new-task-desc').value = '';
        document.getElementById('new-task-priority').value = 'medium';
        document.getElementById('new-task-title').focus();
    });

    document.getElementById('close-add-modal').addEventListener('click', () => {
        addTaskModal.classList.add('hidden');
    });

    document.getElementById('submit-task-btn').addEventListener('click', () => {
        const title = document.getElementById('new-task-title').value;
        const desc = document.getElementById('new-task-desc').value;
        const priority = document.getElementById('new-task-priority').value;

        if (title.trim() === '') return;

        const id = Date.now().toString();
        const newTask = {
            id: id,
            title: title,
            description: desc,
            priority: priority,
            assignee: '',
            implemented: false,
            pushed: false,
            released: false,
            version: '',
            colorMode: Math.floor(Math.random() * 4) + 1 // 1 to 4 for random post-it colors
        };

        set(ref(db, 'tasks/' + id), newTask);
        addTaskModal.classList.add('hidden');
    });

    // Delegated events for cards
    document.querySelector('.dashboard-board').addEventListener('click', (e) => {
        // Claiming task (Clicking on assignee container)
        const assigneeContainer = e.target.closest('.assignee-container');
        if (assigneeContainer) {
            const card = assigneeContainer.closest('.task-card');
            if (card) {
                currentClaimTaskId = card.dataset.id;
                const task = tasks.find(t => t.id === currentClaimTaskId);
                
                claimTaskModal.classList.remove('hidden');
                const nameInput = document.getElementById('assignee-name');
                nameInput.value = task ? (task.assignee || '') : '';
                nameInput.focus();
            }
            return;
        }

        // Toggle Task Details
        const toggleBtn = e.target.closest('.toggle-details-btn');
        if (toggleBtn) {
            e.stopPropagation();
            const card = toggleBtn.closest('.task-card');
            if (card) {
                const details = card.querySelector('.task-details');
                if (details.classList.contains('collapsed')) {
                    details.classList.remove('collapsed');
                    toggleBtn.textContent = 'Hide Details';
                } else {
                    details.classList.add('collapsed');
                    toggleBtn.textContent = 'Show Details...';
                }
            }
            return;
        }

        // Toggle Status Checkboxes
        if (e.target.classList.contains('status-check')) {
            const card = e.target.closest('.task-card');
            if (card) {
                const taskId = card.dataset.id;
                const field = e.target.dataset.field;
                update(ref(db, 'tasks/' + taskId), {
                    [field]: e.target.checked
                });
            }
            return;
        }

        // Hover Menu - Change Priority
        const moveBtn = e.target.closest('.move-btn');
        if (moveBtn) {
            e.stopPropagation();
            const card = moveBtn.closest('.task-card');
            if (card) {
                const taskId = card.dataset.id;
                const newPriority = moveBtn.dataset.target;
                update(ref(db, 'tasks/' + taskId), {
                    priority: newPriority
                });
            }
            return;
        }

        // Hover Menu - Delete Task (Admin)
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this task?')) {
                const card = deleteBtn.closest('.task-card');
                if (card) {
                    const taskId = card.dataset.id;
                    remove(ref(db, 'tasks/' + taskId));
                }
            }
            return;
        }
    });

    // Delegated event for input change (Version)
    // Use 'change' instead of 'input' for Firebase to avoid writing to DB on every keystroke
    document.querySelector('.dashboard-board').addEventListener('change', (e) => {
        if (e.target.classList.contains('version-input')) {
            const taskId = e.target.dataset.id;
            update(ref(db, 'tasks/' + taskId), {
                version: e.target.value
            });
        }
    });

    // Claim Task
    document.getElementById('close-claim-modal').addEventListener('click', () => {
        claimTaskModal.classList.add('hidden');
        currentClaimTaskId = null;
    });

    document.getElementById('submit-claim-btn').addEventListener('click', () => {
        const name = document.getElementById('assignee-name').value;
        if (currentClaimTaskId && name.trim() !== '') {
            update(ref(db, 'tasks/' + currentClaimTaskId), {
                assignee: name.trim()
            }).then(() => {
                claimTaskModal.classList.add('hidden');
                currentClaimTaskId = null;
            });
        }
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
