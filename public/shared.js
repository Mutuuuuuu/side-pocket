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
 * ページの初期化とFirebase認証状態の監視を行います。
 * @param {Function} onUserAuthenticated - ユーザー認証後に実行されるコールバック関数
 */
export async function initializePage(onUserAuthenticated) {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log("DOMContentLoaded fired.");
        const loadingElement = document.getElementById('loading');
        const appContainerElement = document.getElementById('app-container');
        const headerPlaceholder = document.getElementById('header-placeholder');

        // ヘッダーを動的に読み込む
        if (headerPlaceholder) {
            try {
                console.log("Attempting to fetch _header.html...");
                const response = await fetch('_header.html');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.text();
                headerPlaceholder.innerHTML = data;
                console.log("_header.html loaded successfully.");
            } catch (error) {
                console.error('Error loading header:', error);
                // ヘッダーの読み込みに失敗しても、アプリの動作を停止させない
                if (loadingElement) loadingElement.style.display = 'none';
                if (appContainerElement) appContainerElement.style.display = 'block';
                showStatus("ヘッダーの読み込みに失敗しました。", true, 'header-status-message');
                // ここでreturnしないことで、Firebase認証プロセスが続行されるようにする
            }
        } else {
            console.warn("Header placeholder not found. Assuming header is statically loaded.");
        }

        console.log("Attaching onAuthStateChanged listener...");
        auth.onAuthStateChanged(async (user) => {
            console.log("onAuthStateChanged fired. User:", user ? user.uid : "null");
            // Firebase認証状態が判明したら、常にローディング画面を非表示にし、アプリコンテナを表示
            if (loadingElement) loadingElement.style.display = 'none';
            if (appContainerElement) appContainerElement.style.display = 'block';

            if (user) {
                console.log("User authenticated. Setting up header menu.");
                // ユーザーが認証されたら、ヘッダーメニューをセットアップ
                setupHeaderMenu(user);

                if (onUserAuthenticated) {
                    onUserAuthenticated(user);
                }
            } else {
                console.log("User not authenticated. Attempting sign-in.");
                // ユーザーが認証されていない場合、Canvas環境のトークンがあればそれを使用
                // なければ匿名認証を試みる
                try {
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(auth, __initial_auth_token);
                        console.log("Signed in with custom token via __initial_auth_token.");
                    } else {
                        await signInAnonymously(auth);
                        console.log("Signed in anonymously.");
                    }
                } catch (error) {
                    console.error("Authentication failed in initializePage:", error);
                    // 認証失敗時はログインページへリダイレクト
                    window.location.href = 'index.html';
                }
                // 匿名認証が成功した場合、onAuthStateChangedが再度fireされ、userオブジェクトが渡される
            }
        });
    });
}

/**
 * ヘッダーとサイドバーメニューのセットアップを行います。
 * _header.htmlがDOMにロードされた後に呼び出されることを想定しています。
 * @param {object} user - Firebaseユーザーオブジェクト
 */
export function setupHeaderMenu(user) {
    const userInfoSpan = document.getElementById('user-info');
    const userIconImg = document.getElementById('user-icon');
    const menuToggle = document.getElementById('menu-toggle'); // モバイル用ハンバーガーメニュー
    const sidebarMenu = document.getElementById('sidebar-menu'); // サイドバーメニューコンテナ
    const closeMenuButton = document.getElementById('close-menu-button'); // モバイル用閉じるボタン
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay'); // モバイル用オーバーレイ
    // const menuTexts = document.querySelectorAll('#sidebar-menu .menu-text'); // CSSで制御するためJSからは削除
    const appContainer = document.getElementById('app-container'); // メインコンテンツコンテナ
    const logoutButtonMobile = document.getElementById('logout-button-mobile'); // サイドバー内のログアウトボタン
    // const desktopMenuToggle = document.getElementById('desktop-menu-toggle'); // デスクトップ用ハンバーガーメニュー (削除)

    // ユーザー情報の表示
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
    if (logoutButtonMobile) {
        logoutButtonMobile.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Error signing out:", error);
                showStatus("ログアウトに失敗しました: " + error.message, true, 'header-status-message');
            }
        });
    }

    /**
     * デスクトップとモバイルでサイドバーの表示状態を切り替える関数
     * この関数は主にモバイルの挙動と、デスクトップの初期状態を設定します。
     * デスクトップのホバーによる展開はCSS (md:hover:w-64) で制御されます。
     */
    const applySidebarState = () => {
        // 各要素の存在を確実にチェック
        if (!sidebarMenu || !appContainer) {
            console.warn("Sidebar or app container elements not found. Skipping sidebar state application.");
            return;
        }

        if (window.innerWidth >= 768) { // デスクトップ (md breakpoint)
            // デスクトップではサイドバーを常に表示し、初期はアイコンのみ
            sidebarMenu.classList.remove('-translate-x-full'); // モバイルの非表示状態を解除
            sidebarMenu.classList.add('translate-x-0'); // 常に表示位置に
            sidebarMenu.classList.add('w-16'); // 初期幅をアイコン用に設定
            sidebarMenu.classList.remove('w-64'); // 展開時の幅を削除 (CSSのhoverで制御)

            // モバイル用のハンバーガーメニュー、閉じるボタン、オーバーレイを非表示
            if (menuToggle) menuToggle.classList.add('hidden');
            if (closeMenuButton) closeMenuButton.classList.add('hidden');
            if (mobileMenuOverlay) mobileMenuOverlay.classList.add('hidden');

            // コンテンツの左マージンを調整 (サイドバーの幅に応じて)
            // デスクトップでは、サイドバーがw-16の時はml-16、w-64の時はml-64
            // これはCSSのmd:hover:w-64と連携して動作する
            appContainer.classList.remove('md:ml-64');
            appContainer.classList.add('md:ml-16');

            // デスクトップではホバーイベントリスナーは不要（CSSのgroup-hoverで制御するため）
            sidebarMenu.onmouseenter = null;
            sidebarMenu.onmouseleave = null;

        } else { // モバイル
            // モバイルではサイドバーを初期非表示
            sidebarMenu.classList.remove('w-16'); // デスクトップのアイコン幅を解除
            sidebarMenu.classList.remove('w-64'); // デスクトップの展開幅を解除
            sidebarMenu.classList.add('w-64'); // モバイルの展開幅
            sidebarMenu.classList.add('-translate-x-full'); // 初期非表示

            appContainer.classList.remove('md:ml-16'); // デスクトップのマージンを解除
            appContainer.classList.remove('md:ml-64');

            // モバイルではハンバーガーメニュー、閉じるボタン、オーバーレイを表示
            if (menuToggle) menuToggle.classList.remove('hidden');
            if (closeMenuButton) closeMenuButton.classList.remove('hidden');
            if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('hidden');

            // モバイルではホバーイベントリスナーを削除
            sidebarMenu.onmouseenter = null;
            sidebarMenu.onmouseleave = null;
        }
    };

    // ページロード時とリサイズ時にサイドバーの状態を設定
    applySidebarState();
    window.addEventListener('resize', applySidebarState);

    // --- モバイル用ハンバーガーメニューの開閉ロジック ---
    if (menuToggle && sidebarMenu && mobileMenuOverlay) {
        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation(); // クリックイベントがbodyに伝播するのを防ぐ
            sidebarMenu.classList.remove('-translate-x-full');
            mobileMenuOverlay.classList.remove('hidden');
        });
    }

    if (closeMenuButton && sidebarMenu && mobileMenuOverlay) {
        closeMenuButton.addEventListener('click', () => {
            sidebarMenu.classList.add('-translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
        });
    }

    if (mobileMenuOverlay && sidebarMenu) {
        mobileMenuOverlay.addEventListener('click', () => {
            sidebarMenu.classList.add('-translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
        });
    }

    // メニュー内のリンクをクリックした際もメニューを閉じる (モバイル用)
    sidebarMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) { // モバイルメニューの場合のみ閉じる
                sidebarMenu.classList.add('-translate-x-full');
                mobileMenuOverlay.classList.add('hidden');
            }
        });
    });
}

/**
 * ステータスメッセージを表示します。
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
