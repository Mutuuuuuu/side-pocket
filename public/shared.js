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
    const logoutButton = document.getElementById('logout-button');
    const menuToggle = document.getElementById('menu-toggle'); // ハンバーガーメニューボタン
    const sidebarMenu = document.getElementById('sidebar-menu'); // サイドバーメニューコンテナ
    const closeMenuButton = document.getElementById('close-menu-button'); // 閉じるボタン
    const menuTexts = document.querySelectorAll('#sidebar-menu .menu-text'); // メニューテキスト要素

    // ユーザー情報
    if (userInfoSpan) {
        userInfoSpan.textContent = user.displayName || user.email || '匿名ユーザー';
    }
    if (userIconImg) {
        if (user.photoURL) {
            userIconImg.src = user.photoURL;
        } else {
            userIconImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucd-circle-user'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='10' r='3'/%3E%3Cpath d='M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662'/%3E%3C/svg%3E";
        }
    }

    // ログアウトボタンのイベントリスナー
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

    // サイドバーの初期状態を設定
    if (sidebarMenu) {
        sidebarMenu.style.width = '64px'; // 閉じた時の幅
    }
    if (closeMenuButton) {
        closeMenuButton.classList.add('hidden'); // 閉じるボタンを非表示
    }
    menuTexts.forEach(span => {
        span.classList.add('hidden'); // テキストを非表示
    });

    // ハンバーガーメニューのトグル
    if (menuToggle && sidebarMenu) {
        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation(); // クリックイベントがbodyに伝播するのを防ぐ
            if (sidebarMenu.style.width === '64px') {
                // サイドバーを展開
                sidebarMenu.style.width = '200px';
                if (closeMenuButton) {
                    closeMenuButton.classList.remove('hidden'); // 閉じるボタンを表示
                }
                menuTexts.forEach(span => {
                    span.classList.remove('hidden'); // メニューテキストを表示
                });
                // ハンバーガーアイコンを非表示にする
                menuToggle.classList.add('hidden');
            } else {
                // サイドバーを閉じる (アイコンのみ)
                sidebarMenu.style.width = '64px';
                if (closeMenuButton) {
                    closeMenuButton.classList.add('hidden'); // 閉じるボタンを非表示
                }
                menuTexts.forEach(span => {
                    span.classList.add('hidden'); // メニューテキストを非表示
                });
                // ハンバーガーアイコンを表示する
                menuToggle.classList.remove('hidden');
            }
        });
    }

    // 閉じるボタンのイベントリスナー
    if (closeMenuButton && sidebarMenu) {
        closeMenuButton.addEventListener('click', () => {
            sidebarMenu.style.width = '64px'; // メニューを閉じたときの幅 (アイコンのみの幅)
            closeMenuButton.classList.add('hidden'); // 閉じるボタンを非表示
            menuTexts.forEach(span => {
                span.classList.add('hidden'); // メニューテキストを非表示
            });
            // ハンバーガーアイコンを表示する
            if (menuToggle) {
                menuToggle.classList.remove('hidden');
            }
        });
    }

    // サイドバー外をクリックで閉じる
    document.body.addEventListener('click', (event) => {
        // クリックされた要素がサイドバー、メニュー切り替えボタン、またはその子孫でない場合
        if (sidebarMenu && !sidebarMenu.contains(event.target) && (menuToggle && !menuToggle.contains(event.target))) {
            // サイドバーが展開状態の場合のみ閉じる
            if (sidebarMenu.style.width === '200px') {
                sidebarMenu.style.width = '64px';
                if (closeMenuButton) {
                    closeMenuButton.classList.add('hidden');
                }
                menuTexts.forEach(span => {
                    span.classList.add('hidden');
                });
                if (menuToggle) {
                    menuToggle.classList.remove('hidden');
                }
            }
        }
    });
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
