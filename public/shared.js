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
    document.addEventListener('DOMContentLoaded', () => {
        auth.onAuthStateChanged(async (user) => {
            // Firebase認証状態が判明したら、常にローディング画面を非表示にし、アプリコンテナを表示
            const loadingElement = document.getElementById('loading');
            const appContainerElement = document.getElementById('app-container');
            if (loadingElement) loadingElement.style.display = 'none';
            if (appContainerElement) appContainerElement.style.display = 'block';

            if (user) {
                const headerPlaceholder = document.getElementById('header-placeholder');
                if (headerPlaceholder) {
                    // MutationObserverを使用して、ヘッダーのHTMLがDOMに挿入されたことを監視
                    const observer = new MutationObserver((mutationsList, observer) => {
                        if (headerPlaceholder.innerHTML !== '') {
                            setupHeaderMenu(user);
                            observer.disconnect(); // 一度実行したら監視を停止
                        }
                    });
                    observer.observe(headerPlaceholder, { childList: true });

                    // ヘッダーが既にロードされている場合（例: 直接ページロード時、動的フェッチではない場合）
                    if (headerPlaceholder.innerHTML !== '') {
                        setupHeaderMenu(user);
                    }
                } else {
                    // header-placeholderがない場合、ヘッダーが静的にDOMに存在すると仮定
                    setupHeaderMenu(user);
                }

                if (onUserAuthenticated) {
                    onUserAuthenticated(user);
                }
            } else {
                // ユーザーが認証されていない場合、Canvas環境のトークンがあればそれを使用
                // なければ匿名認証を試みる
                try {
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Authentication failed in initializePage:", error);
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
    const menuTexts = document.querySelectorAll('#sidebar-menu .menu-text'); // メニューテキスト要素
    const appContainer = document.getElementById('app-container'); // メインコンテンツコンテナ
    const logoutButtonMobile = document.getElementById('logout-button-mobile'); // サイドバー内のログアウトボタン
    const desktopMenuToggle = document.getElementById('desktop-menu-toggle'); // デスクトップ用ハンバーガーメニュー

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
     */
    const applySidebarState = () => {
        // 各要素の存在を確実にチェック
        if (!sidebarMenu || !appContainer) {
            console.warn("Sidebar or app container elements not found. Skipping sidebar setup.");
            return;
        }

        if (window.innerWidth >= 768) { // デスクトップ (md breakpoint)
            // デスクトップではサイドバーを常に表示し、初期はアイコンのみ、ホバーで展開
            sidebarMenu.classList.remove('-translate-x-full'); // モバイルの非表示状態を解除
            sidebarMenu.classList.add('translate-x-0'); // 常に表示位置に

            // デスクトップのハンバーガーメニューを表示
            if (desktopMenuToggle) desktopMenuToggle.classList.remove('hidden');

            // モバイル用のハンバーガーメニュー、閉じるボタン、オーバーレイを非表示
            if (menuToggle) menuToggle.classList.add('hidden');
            if (closeMenuButton) closeMenuButton.classList.add('hidden');
            if (mobileMenuOverlay) mobileMenuOverlay.classList.add('hidden');

            // コンテンツの左マージンを調整 (サイドバーの幅に応じて)
            appContainer.classList.remove('md:ml-64'); // 展開時のマージンを削除
            appContainer.classList.add('md:ml-16'); // 初期は折りたたみ時のマージン

            // デスクトップではホバーイベントリスナーを削除（CSSのgroup-hoverで制御するため）
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
            if (desktopMenuToggle) desktopMenuToggle.classList.add('hidden'); // デスクトップ用を非表示

            // モバイルではホバーイベントリスナーを削除
            sidebarMenu.onmouseenter = null;
            sidebarMenu.onmouseleave = null;
        }
    };

    // ページロード時とリサイズ時にサイドバーの状態を設定
    applySidebarState();
    window.addEventListener('resize', applySidebarState);

    // デスクトップ用ハンバーガーメニューのクリックイベント (サイドバーの展開/収納)
    if (desktopMenuToggle && sidebarMenu && appContainer) {
        desktopMenuToggle.addEventListener('click', () => {
            // 現在の幅に基づいて展開/収納を切り替える
            if (sidebarMenu.classList.contains('w-16')) {
                sidebarMenu.classList.remove('w-16');
                sidebarMenu.classList.add('w-64');
                appContainer.classList.remove('md:ml-16');
                appContainer.classList.add('md:ml-64');
            } else {
                sidebarMenu.classList.remove('w-64');
                sidebarMenu.classList.add('w-16');
                appContainer.classList.remove('md:ml-64');
                appContainer.classList.add('md:ml-16');
            }
        });
    }

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
 * @param {string} message - 表示するメッセージ
 * @param {boolean} isError - エラーメッセージかどうか
 * @param {string} elementId - メッセージを表示する要素のID
 */
export function showStatus(message, isError, elementId) {
    const statusDiv = document.getElementById(elementId);
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `pt-4 text-center font-medium h-10 ${isError ? 'text-red-600' : 'text-green-600'}`;
    }
}
