import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. Firebase Configuration (変更なし)
const firebaseConfig = {
    apiKey: "AIzaSyBuRc0oRFQk-GvVAh_90S9NGAYu5sOkxyM",
    authDomain: "side-pocket-sl.firebaseapp.com",
    projectId: "side-pocket-sl",
    storageBucket: "side-pocket-sl.appspot.com",
    messagingSenderId: "887116583823",
    appId: "1:887116583823:web:5783488bd573f5be4bf1fa",
    measurementId: "G-QSBDN1TX68"
};

// 2. Firebase Initialization (変更なし)
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * 3. Shared Function: Initialize Page
 * 修正点：
 * - ページの初期化時に共通ヘッダー(_header.html)を fetch して #header-placeholder に挿入する機能を追加しました。
 * - これにより、各HTMLファイルにヘッダーを直接記述する必要がなくなります。
 * @param {Function} onUserAuthenticated - 認証成功後に実行されるコールバック関数
 */
export async function initializePage(onUserAuthenticated) {
    // 共通ヘッダーを読み込んで挿入
    try {
        const response = await fetch('_header.html');
        if (response.ok) {
            const headerHTML = await response.text();
            const headerPlaceholder = document.getElementById('header-placeholder');
            if (headerPlaceholder) {
                headerPlaceholder.innerHTML = headerHTML;
            }
        } else {
            console.error('Header file not found or failed to load.');
        }
    } catch (error) {
        console.error('Error fetching header:', error);
    }

    // 認証状態を監視
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // ユーザーがログインしている場合
            setupHeaderMenu(user); // ヘッダーのメニューをセットアップ
            if (typeof onUserAuthenticated === 'function') {
                onUserAuthenticated(user); // 各ページ固有の処理を実行
            }
        } else {
            // ユーザーがログアウトしている場合、ログインページにリダイレクト
            const protectedPages = ['index.html', 'profile.html', 'calender.html', 'summary.html', 'projects.html'];
            const currentPage = window.location.pathname.split('/').pop();
            if (protectedPages.includes(currentPage) || currentPage === '') {
                window.location.href = 'login.html';
            }
        }
    });
}

/**
 * ヘッダーのユーザー情報とメニューの動作をセットアップします。
 * 修正点：
 * - ユーザーアイコンのデフォルト画像を placehold.co のものに統一しました。
 * - ログアウトボタンのイベントリスナーを確実に追加するように修正しました。
 * @param {object} user - Firebase user object
 */
function setupHeaderMenu(user) {
    const userDisplayName = document.getElementById('user-display-name');
    const userIcon = document.getElementById('user-icon');
    const menuButton = document.getElementById('menu-button');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userDisplayName) userDisplayName.textContent = user.displayName || user.email;
    if (userIcon) userIcon.src = user.photoURL || 'https://placehold.co/32x32/EFEFEF/333333?text=?';

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
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => console.error("Logout failed:", error));
        });
    }
}

/**
 * ステータスメッセージを表示します。
 * @param {string} message - 表示するメッセージ
 * @param {boolean} isError - エラーメッセージの場合は true
 * @param {string} elementId - メッセージを表示する要素のID
 */
export function showStatus(message, isError, elementId) {
    const statusDiv = document.getElementById(elementId);
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `text-sm mt-2 ${isError ? 'text-red-600' : 'text-gray-600'}`;
    }
}
