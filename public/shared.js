import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBuRc0oRFQk-GvVAh_90S9NGAYu5sOkxyM",
    authDomain: "side-pocket-sl.firebaseapp.com",
    projectId: "side-pocket-sl",
    storageBucket: "side-pocket-sl.appspot.com",
    messagingSenderId: "887116583823",
    appId: "1:887116583823:web:5783488bd573f5be4bf1fa",
    measurementId: "G-QSBDN1TX68"
};

// 2. Firebase Initialization
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * 3. Shared Function: Initialize Page
 * @param {Function} onUserAuthenticated - Callback function to run after user is authenticated
 */
export async function initializePage(onUserAuthenticated) {
    await loadHeader();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            setupHeaderMenu(user);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            if (onUserAuthenticated) {
                onUserAuthenticated(user);
            }
        } else {
            window.location.href = 'login.html';
        }
    });
}

/**
 * 4. Fetch and load the header component
 */
async function loadHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        try {
            const response = await fetch('_header.html');
            const headerHTML = await response.text();
            headerPlaceholder.innerHTML = headerHTML;
        } catch (error) {
            console.error('ヘッダーの読み込みに失敗しました:', error);
            headerPlaceholder.innerHTML = '<p class="text-red-500">ヘッダーの読み込みに失敗しました。</p>';
        }
    }
}

/**
 * Setup header with user info and menu listeners.
 * @param {object} user - Firebase user object
 */
function setupHeaderMenu(user) {
    document.getElementById('user-display-name').textContent = user.displayName || user.email;
    document.getElementById('user-icon').src = user.photoURL || 'images/sidepocket_symbol.png';

    const menuButton = document.getElementById('menu-button');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (menuButton && dropdownMenu) {
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });
        window.addEventListener('click', (e) => {
            if (!menuButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.add('hidden');
            }
        });
        document.getElementById('logoutBtn').addEventListener('click', () => {
            signOut(auth);
        });
    }
}

/**
 * Display a status message.
 * @param {string} message - The message to display
 * @param {boolean} isError - True if it's an error message
 * @param {string} elementId - The ID of the element to display the message in
 */
export function showStatus(message, isError, elementId) {
    const statusDiv = document.getElementById(elementId);
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `pt-4 text-center font-medium h-10 ${isError ? 'text-red-600' : 'text-green-600'}`;
    }
}
