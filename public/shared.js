import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithCustomToken, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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

// Canvas環境で__firebase_configが提供されていればそれを使用
const actualFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;


// 2. Firebase Initialization
export const app = initializeApp(actualFirebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * 3. Shared Function: Initialize Page
 * @param {Function} onUserAuthenticated - Callback function to run after user is authenticated
 */
export async function initializePage(onUserAuthenticated) {
    onAuthStateChanged(auth, async (user) => { // asyncを追加
        if (user) {
            setupHeaderMenu(user); // ヘッダーメニューを設定
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            if (onUserAuthenticated) {
                onUserAuthenticated(user);
            }
        } else {
            // ユーザーが認証されていない場合、Canvas環境のトークンがあればそれを使用
            // なければ匿名認証を試みる
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                    console.log("Signed in with custom token via __initial_auth_token.");
                } else {
                    // 匿名認証は、__initial_auth_tokenがない場合にのみ実行
                    await signInAnonymously(auth);
                    console.log("Signed in anonymously.");
                }
            } catch (error) {
                console.error("Authentication failed in initializePage:", error);
                // 認証失敗時はログインページへリダイレクト
                window.location.href = 'login.html';
            }
        }
    });
}

/**
 * Setup header with user info and menu listeners.
 * @param {object} user - Firebase user object
 */
function setupHeaderMenu(user) {
    const userInfoSpan = document.getElementById('user-info');
    const userIconImg = document.getElementById('user-icon');
    const logoutButton = document.getElementById('logout-button'); // This will now be inside mobile-menu
    const menuToggle = document.getElementById('menu-toggle'); // ハンバーガーメニューボタン
    const mobileMenu = document.getElementById('mobile-menu'); // フルスクリーンオーバーレイメニュー
    const closeMenuButton = document.getElementById('close-menu-button'); // 閉じるボタン

    // ユーザー情報
    if (userInfoSpan) {
        userInfoSpan.textContent = `${user.email || '匿名ユーザー'}`;
    }
    if (userIconImg) {
        // ユーザーのphotoURLがあれば設定、なければGoogleのデフォルトアイコン
        userIconImg.src = user.photoURL || "https://placehold.co/32x32/DB4437/FFFFFF?text=G"; // Google G icon placeholder
    }

    // ログアウトボタンのイベントリスナー (メニュー内に配置)
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (error) {
                console.error("Error signing out:", error);
                showStatus("ログアウトに失敗しました: " + error.message, true, 'header-status-message');
            }
        });
    }

    // ハンバーガーメニューのトグル
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // 閉じるボタンのイベントリスナー
    if (closeMenuButton && mobileMenu) {
        closeMenuButton.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
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
