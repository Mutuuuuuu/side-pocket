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
            // app-containerの表示はsetupHeaderMenu内で制御されるため、ここでは削除
            // document.getElementById('loading').style.display = 'none';
            // document.getElementById('app-container').style.display = 'block';
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
                window.location.href = 'index.html'; // login.html から index.html に変更
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
    const menuToggle = document.getElementById('menu-toggle'); // ハンバーガーメニューボタン (モバイル用)
    const sidebarMenu = document.getElementById('sidebar-menu'); // サイドバーメニューコンテナ
    const closeMenuButton = document.getElementById('close-menu-button'); // 閉じるボタン (モバイル用)
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay'); // オーバーレイ (モバイル用)
    const menuTexts = document.querySelectorAll('#sidebar-menu .menu-text'); // メニューテキスト要素
    const appContainer = document.getElementById('app-container'); // app-container要素を取得
    const logoutButtonMobile = document.getElementById('logout-button-mobile'); // モバイル用ログアウトボタン


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

    // ログアウトボタンのイベントリスナー (モバイル用のみ)
    if (logoutButtonMobile) {
        logoutButtonMobile.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'index.html'; // ログアウト後はログインページへ
            } catch (error) {
                console.error("Error signing out:", error);
                showStatus("ログアウトに失敗しました: " + error.message, true, 'header-status-message');
            }
        });
    }

    // --- デスクトップ用サイドバーの初期状態とホバーによる展開 ---
    const setupDesktopSidebar = () => {
        // sidebarMenuとappContainerがnullでないことを確認
        if (!sidebarMenu || !appContainer) {
            console.warn("Sidebar elements not found. Skipping desktop sidebar setup.");
            return;
        }

        if (window.innerWidth >= 768) { // md breakpoint
            sidebarMenu.classList.remove('-translate-x-full'); // サイドバーを常に表示
            sidebarMenu.classList.add('translate-x-0'); // 位置をリセット
            sidebarMenu.classList.add('w-16'); // デフォルトでアイコンのみの幅
            sidebarMenu.classList.remove('w-64'); // 展開時の幅を削除

            appContainer.classList.add('md:ml-16'); // コンテンツの左マージンを調整
            appContainer.classList.remove('md:ml-64'); // 展開時のマージンを削除

            // テキストを非表示
            menuTexts.forEach(span => {
                span.classList.add('hidden');
            });

            // ホバーでサイドバーを展開
            sidebarMenu.addEventListener('mouseenter', () => {
                sidebarMenu.classList.remove('w-16');
                sidebarMenu.classList.add('w-64');
                appContainer.classList.remove('md:ml-16');
                appContainer.classList.add('md:ml-64');
                menuTexts.forEach(span => {
                    span.classList.remove('hidden'); // ホバー時にテキストを表示
                });
            });

            // ホバーが外れたらサイドバーを閉じる
            sidebarMenu.addEventListener('mouseleave', () => {
                sidebarMenu.classList.remove('w-64');
                sidebarMenu.classList.add('w-16');
                appContainer.classList.remove('md:ml-64');
                appContainer.classList.add('md:ml-16');
                menuTexts.forEach(span => {
                    span.classList.add('hidden'); // ホバーが外れたらテキストを非表示
                });
            });

            // デスクトップではハンバーガーメニューと閉じるボタン、オーバーレイを非表示
            if (menuToggle) menuToggle.classList.add('hidden');
            if (closeMenuButton) closeMenuButton.classList.add('hidden');
            if (mobileMenuOverlay) mobileMenuOverlay.classList.add('hidden');

        } else { // モバイル用
            sidebarMenu.classList.remove('w-16');
            sidebarMenu.classList.remove('w-64');
            sidebarMenu.classList.add('w-64'); // モバイルのデフォルト幅
            sidebarMenu.classList.add('-translate-x-full'); // モバイルで初期非表示

            appContainer.classList.remove('md:ml-16');
            appContainer.classList.remove('md:ml-64');

            // テキストをモバイルでは表示
            menuTexts.forEach(span => {
                span.classList.remove('hidden');
            });

            // モバイルではハンバーガーメニューと閉じるボタン、オーバーレイを表示
            if (menuToggle) menuToggle.classList.remove('hidden');
            if (closeMenuButton) closeMenuButton.classList.remove('hidden');
            if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('hidden');

            // ホバーイベントリスナーを削除 (デスクトップからモバイルに切り替わった場合)
            // イベントリスナーが複数回追加されるのを防ぐため、removeEventListenerの第2引数に同じ関数インスタンスを渡す必要がある
            // 無名関数を使っているため、ここでは直接削除できない。
            // 代わりに、イベントリスナーを追加する際に名前付き関数を使用するか、
            // cloneNode(true) と replaceChild を使って要素を再構築する方法を検討する。
            // 現状では、シンプルにホバーロジックをif (window.innerWidth >= 768) 内に閉じ込めることで対応。
        }
    };

    // ページロード時とリサイズ時にサイドバーの状態を設定
    setupDesktopSidebar();
    window.addEventListener('resize', setupDesktopSidebar);


    // --- モバイル用ハンバーガーメニューの開閉 ---
    if (menuToggle && sidebarMenu && mobileMenuOverlay) {
        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation(); // クリックイベントがbodyに伝播するのを防ぐ
            sidebarMenu.classList.remove('-translate-x-full');
            mobileMenuOverlay.classList.remove('hidden');
        });
    }

    // 閉じるボタンのイベントリスナー (モバイル用)
    if (closeMenuButton && sidebarMenu && mobileMenuOverlay) {
        closeMenuButton.addEventListener('click', () => {
            sidebarMenu.classList.add('-translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
        });
    }

    // サイドバー外をクリックで閉じる (モバイル用)
    if (sidebarMenu && mobileMenuOverlay) {
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

    // ロード中の表示を非表示にし、アプリコンテナを表示
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
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
