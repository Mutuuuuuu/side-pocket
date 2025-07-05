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
    // ヘッダーを動的に読み込む
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        try {
            const response = await fetch('_header.html');
            const data = await response.text();
            headerPlaceholder.innerHTML = data;
        } catch (error) {
            console.error('Error loading header:', error);
            // ヘッダーの読み込みに失敗しても、アプリの動作を停止させない
            // 必要に応じてユーザーにエラーメッセージを表示
        }
    }

    // ヘッダーがロードされた後、Firebase認証状態を監視
    auth.onAuthStateChanged(async (user) => {
        const loadingElement = document.getElementById('loading');
        const appContainerElement = document.getElementById('app-container');

        if (user) {
            // ユーザーが認証されたら、ヘッダーメニューをセットアップ
            setupHeaderMenu(user);

            // ローディング画面を非表示にし、アプリコンテナを表示
            if (loadingElement) loadingElement.style.display = 'none';
            if (appContainerElement) appContainerElement.style.display = 'block';

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
    const sidebarLogo = document.getElementById('sidebar-logo'); // サイドバー内のロゴ

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

    let isSidebarExpanded = false; // サイドバーの展開状態を管理するフラグ (デスクトップ用)

    /**
     * デスクトップとモバイルでサイドバーの表示状態を切り替える関数
     */
    const applySidebarState = () => {
        // 各要素の存在を確実にチェック
        if (!sidebarMenu || !appContainer || !menuToggle || !closeMenuButton || !mobileMenuOverlay || !desktopMenuToggle || !sidebarLogo || !logoutButtonMobile) {
            console.warn("Sidebar or related elements not found. Skipping sidebar setup.");
            return;
        }

        if (window.innerWidth >= 768) { // デスクトップ (md breakpoint)
            // デスクトップではサイドバーを常に表示
            sidebarMenu.classList.remove('-translate-x-full'); // モバイルの非表示状態を解除
            sidebarMenu.classList.add('translate-x-0'); // 常に表示位置に

            // デスクトップのハンバーガーメニューを表示
            desktopMenuToggle.classList.remove('hidden');

            // モバイル用のハンバーガーメニュー、閉じるボタン、オーバーレイを非表示
            menuToggle.classList.add('hidden');
            closeMenuButton.classList.add('hidden');
            mobileMenuOverlay.classList.add('hidden');

            // デスクトップのサイドバー状態に基づいて幅とテキスト表示を調整
            if (isSidebarExpanded) {
                sidebarMenu.classList.remove('w-16');
                sidebarMenu.classList.add('w-64');
                appContainer.classList.remove('md:ml-16');
                appContainer.classList.add('md:ml-64');
                // テキストを表示
                menuTexts.forEach(span => {
                    span.classList.remove('hidden');
                    span.classList.add('inline-block');
                });
                sidebarLogo.classList.remove('hidden'); // ロゴを表示
                logoutButtonMobile.querySelector('.menu-text').classList.remove('hidden'); // ログアウトテキストを表示
                logoutButtonMobile.querySelector('.menu-text').classList.add('inline-block');
            } else {
                sidebarMenu.classList.remove('w-64');
                sidebarMenu.classList.add('w-16');
                appContainer.classList.remove('md:ml-64');
                appContainer.classList.add('md:ml-16');
                // テキストを非表示
                menuTexts.forEach(span => {
                    span.classList.add('hidden');
                    span.classList.remove('inline-block');
                });
                sidebarLogo.classList.add('hidden'); // ロゴを非表示
                logoutButtonMobile.querySelector('.menu-text').classList.add('hidden'); // ログアウトテキストを非表示
                logoutButtonMobile.querySelector('.menu-text').classList.remove('inline-block');
            }

            // デスクトップではホバーイベントリスナーを削除（クリックで制御するため）
            sidebarMenu.onmouseenter = null;
            sidebarMenu.onmouseleave = null;

        } else { // モバイル
            // モバイルではサイドバーを初期非表示 (w-64)
            sidebarMenu.classList.remove('w-16'); // デスクトップのアイコン幅を解除
            sidebarMenu.classList.remove('translate-x-0'); // デスクトップの位置を解除
            sidebarMenu.classList.add('w-64'); // モバイルの展開幅
            // モバイルでの初期状態は常に隠れている
            if (!sidebarMenu.classList.contains('-translate-x-full')) {
                 sidebarMenu.classList.add('-translate-x-full');
            }

            appContainer.classList.remove('md:ml-16'); // デスクトップのマージンを解除
            appContainer.classList.remove('md:ml-64');
            appContainer.style.marginLeft = '0px'; // モバイルではマージンを0に

            // モバイル用の要素を表示
            menuToggle.classList.remove('hidden');
            // closeMenuButton.classList.remove('hidden'); // これはクリックイベントで制御される
            mobileMenuOverlay.classList.add('hidden'); // オーバーレイはデフォルトで非表示

            // メニューテキストはモバイルでは常に表示
            menuTexts.forEach(span => {
                span.classList.remove('hidden');
                span.classList.add('inline-block');
            });
            // モバイルでサイドバーが開いたときにロゴを表示
            sidebarLogo.classList.add('hidden'); // 初期状態は非表示
            logoutButtonMobile.querySelector('.menu-text').classList.remove('hidden'); // ログアウトテキストを表示
            logoutButtonMobile.querySelector('.menu-text').classList.add('inline-block');
        }
    };

    // ページロード時とリサイズ時にサイドバーの状態を設定
    applySidebarState();
    window.addEventListener('resize', applySidebarState);

    // デスクトップ用ハンバーガーメニューのクリックイベント (サイドバーの展開/収納)
    if (desktopMenuToggle) { 
        desktopMenuToggle.addEventListener('click', () => {
            isSidebarExpanded = !isSidebarExpanded; // 状態を反転
            applySidebarState(); // 状態を適用
        });
    }

    // --- モバイル用ハンバーガーメニューの開閉ロジック ---
    if (menuToggle) {
        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation(); // クリックイベントがbodyに伝播するのを防ぐ
            sidebarMenu.classList.remove('-translate-x-full');
            mobileMenuOverlay.classList.remove('hidden');
            // モバイルメニューが開いたらロゴとテキストを表示
            sidebarLogo.classList.remove('hidden');
            menuTexts.forEach(span => {
                span.classList.remove('hidden');
                span.classList.add('inline-block');
            });
            logoutButtonMobile.querySelector('.menu-text').classList.remove('hidden'); // ログアウトテキストを表示
            logoutButtonMobile.querySelector('.menu-text').classList.add('inline-block');
        });
    }

    if (closeMenuButton) {
        closeMenuButton.addEventListener('click', () => {
            sidebarMenu.classList.add('-translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
            // モバイルメニューが閉じたらロゴとテキストを非表示
            sidebarLogo.classList.add('hidden');
            menuTexts.forEach(span => {
                span.classList.add('hidden');
                span.classList.remove('inline-block');
            });
            logoutButtonMobile.querySelector('.menu-text').classList.add('hidden'); // ログアウトテキストを非表示
            logoutButtonMobile.querySelector('.menu-text').classList.remove('inline-block');
        });
    }

    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', () => {
            sidebarMenu.classList.add('-translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
            // モバイルメニューが閉じたらロゴとテキストを非表示
            sidebarLogo.classList.add('hidden');
            menuTexts.forEach(span => {
                span.classList.add('hidden');
                span.classList.remove('inline-block');
            });
            logoutButtonMobile.querySelector('.menu-text').classList.add('hidden'); // ログアウトテキストを非表示
            logoutButtonMobile.querySelector('.menu-text').classList.remove('inline-block');
        });
    }

    // メニュー内のリンクをクリックした際もメニューを閉じる (モバイル用)
    sidebarMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) { // モバイルメニューの場合のみ閉じる
                sidebarMenu.classList.add('-translate-x-full');
                mobileMenuOverlay.classList.add('hidden');
                // モバイルメニューが閉じたらロゴとテキストを非表示
                sidebarLogo.classList.add('hidden');
                menuTexts.forEach(span => {
                    span.classList.add('hidden');
                    span.classList.remove('inline-block');
                });
                logoutButtonMobile.querySelector('.menu-text').classList.add('hidden'); // ログアウトテキストを非表示
                logoutButtonMobile.querySelector('.menu-text').classList.remove('inline-block');
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
