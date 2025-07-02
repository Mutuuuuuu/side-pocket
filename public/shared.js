// shared.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// === Firebase Configuration ===
// この設定はあなたのプロジェクトのものです。変更の必要はありません。
const firebaseConfig = {
    apiKey: "AIzaSyBuRc0oRFQk-GvVAh_90S9NGAYu5sOkxyM",
    authDomain: "side-pocket-sl.firebaseapp.com",
    projectId: "side-pocket-sl",
    storageBucket: "side-pocket-sl.appspot.com",
    messagingSenderId: "887116583823",
    appId: "1:887116583823:web:5783488bd573f5be4bf1fa",
    measurementId: "G-QSBDN1TX68"
};

// === Firebase Initialization ===
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // Firestoreもエクスポート

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// === Shared Functions ===

/**
 * ページの初期化、認証状態のチェック、ヘッダーのセットアップを行います。
 * @param {Function} onUserAuthenticated - ユーザーが認証された後に実行されるコールバック関数
 */
export function initializePage(onUserAuthenticated) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            setupHeader(user);
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
 * ヘッダーにユーザー情報を表示し、メニューのイベントリスナーを設定します。
 * @param {object} user - Firebaseのユーザーオブジェクト
 */
function setupHeader(user) {
    document.getElementById('user-display-name').textContent = user.displayName || user.email;
    document.getElementById('user-icon').src = user.photoURL || `https://placehold.co/32x32/EFEFEF/333333?text=${(user.displayName || user.email || '?').charAt(0)}`;

    const menuButton = document.getElementById('menu-button');
    const dropdownMenu = document.getElementById('dropdown-menu');

    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
    });

    window.addEventListener('click', (e) => {
        if (!menuButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });
    
    // ナビゲーションリンクの設定
    document.getElementById('menu-home').addEventListener('click', () => window.location.href = 'index.html');
    document.getElementById('menu-calendar').addEventListener('click', () => window.location.href = 'calendar.html');
    document.getElementById('menu-summary').addEventListener('click', () => window.location.href = 'summary.html');
    document.getElementById('menu-projects').addEventListener('click', () => window.location.href = 'projects.html');
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
        signOut(auth);
    });
}

/**
 * ステータスメッセージを表示するための共通関数
 * @param {string} message - 表示するメッセージ
 * @param {boolean} isError - エラーかどうか
 * @param {string} elementId - メッセージを表示する要素のID
 */
export function showStatus(message, isError, elementId) {
    const statusDiv = document.getElementById(elementId);
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `pt-4 text-center font-medium h-10 ${isError ? 'text-red-600' : 'text-green-600'}`;
    }
}
