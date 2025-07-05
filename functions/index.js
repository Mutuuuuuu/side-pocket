// functions/index.js
// Firebase Functionsに必要なモジュールをインポートします。
// onRequest HTTPトリガーとグローバルオプションをインポートします。
const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest } = require('firebase-functions/v2/https'); // onRequestをインポート
const { google } = require('googleapis');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true }); // CORSミドルウェアをインポート

// Firebase Admin SDKを初期化します。
admin.initializeApp();
const db = admin.firestore();

// グローバルオプションを設定します。
// これにより、すべての関数にデフォルトのリージョンを設定できます。
setGlobalOptions({
    region: 'asia-northeast1', // ここでデフォルトリージョンを設定します
    // その他のオプション（例: maxInstancesなど）もここに追加できます
});

// 環境変数をFirebase Functionsのparamsとして定義します。
const GOOGLE_CLIENT_ID = process.env.GOOGLEAPI_CLIENT_ID; // 環境変数から直接取得
const GOOGLE_CLIENT_SECRET = process.env.GOOGLEAPI_CLIENT_SECRET; // 環境変数から直接取得
const GOOGLE_REDIRECT_URI = process.env.GOOGLEAPI_REDIRECT_URI; // 環境変数から直接取得

// OAuth2クライアントを設定します。
// redirect_uri を初期化時に含めるように修正しました。
const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI // ここでredirect_uriを含める
);

/**
 * Google認証コードをアクセストークンとリフレッシュトークンに交換するHTTP Functionです。
 * クライアントサイドから認証コードを受け取り、サーバーサイドで安全にトークン交換を行います。
 *
 * @param {object} req - HTTPリクエストオブジェクト。
 * @param {object} res - HTTPレスポンスオブジェクト。
 */
exports.exchangeGoogleToken = onRequest(async (req, res) => {
    // CORSミドルウェアを適用します。
    // これにより、許可されたオリジンからのクロスオリジンリクエストを処理します。
    cors(req, res, async () => {
        // リクエストメソッドがOPTIONSの場合（プリフライトリクエスト）、即座に成功応答を返します。
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        // Firebase認証トークンをリクエストヘッダーから取得します。
        const idToken = req.headers.authorization?.split('Bearer ')[1];
        if (!idToken) {
            console.error("Unauthenticated request to exchangeGoogleToken: Missing ID token.");
            res.status(401).send('ユーザーは認証されていません。');
            return;
        }

        let decodedIdToken;
        try {
            decodedIdToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            console.error("Error verifying Firebase ID token:", error);
            res.status(401).send('無効な認証トークンです。');
            return;
        }

        const { code, redirectUri } = req.body;

        if (!code || !redirectUri) {
            console.error("Missing code or redirectUri in exchangeGoogleToken request body.");
            res.status(400).send('認証コードまたはリダイレクトURIが不足しています。');
            return;
        }

        try {
            const { tokens } = await oAuth2Client.getToken(code);

            // ここをtokens.credentials.refresh_tokenに修正
            if (tokens.credentials.refresh_token) {
                await db.collection('users').doc(decodedIdToken.uid).set({
                    googleRefreshToken: tokens.credentials.refresh_token,
                    googleAccessTokenExpiresAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            res.status(200).json({ accessToken: tokens.access_token });

        } catch (error) {
            console.error("Error exchanging code for tokens:", error);
            res.status(500).send(`トークン交換に失敗しました: ${error.message}`);
        }
    });
});

/**
 * 保存されたリフレッシュトークンを使用して新しいアクセストークンを取得するHTTP Functionです。
 * クライアントサイドから呼び出され、Google APIへのリクエスト前にアクセストークンを更新します。
 *
 * @param {object} req - HTTPリクエストオブジェクト。
 * @param {object} res - HTTPレスポンスオブジェクト。
 */
exports.refreshGoogleAccessToken = onRequest(async (req, res) => {
    cors(req, res, async () => {
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        const idToken = req.headers.authorization?.split('Bearer ')[1];
        if (!idToken) {
            console.error("Unauthenticated request to refreshGoogleAccessToken: Missing ID token.");
            res.status(401).send('ユーザーは認証されていません。');
            return;
        }

        let decodedIdToken;
        try {
            decodedIdToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            console.error("Error verifying Firebase ID token:", error);
            res.status(401).send('無効な認証トークンです。');
            return;
        }

        try {
            const userDoc = await db.collection('users').doc(decodedIdToken.uid).get();
            // userDoc.data() が undefined の可能性があるので、安全にアクセスする
            const userData = userDoc.data(); // userDataとして取得
            const refreshToken = userData?.googleRefreshToken; 

            console.log("Firestoreから取得したユーザーデータ:", userData); // デバッグログ
            console.log("取得したリフレッシュトークン:", refreshToken ? "取得済み" : "なし"); // デバッグログ

            if (!refreshToken) {
                console.error(`Refresh token not found for user: ${decodedIdToken.uid}`);
                // リフレッシュトークンがない場合は404エラーを返す
                res.status(404).send('リフレッシュトークンが見つかりません。Googleアカウントとの連携を再度行ってください。');
                return;
            }

            // oAuth2Clientのredirect_uriは初期化時に設定済みのため、ここでのsetRedirectUriは不要です。
            oAuth2Client.setCredentials({ refresh_token: refreshToken });
            
            let tokens;
            try {
                tokens = await oAuth2Client.refreshAccessToken();
                console.log("refreshAccessToken() からの応答:", tokens); // デバッグログ
            } catch (refreshError) {
                console.error("refreshAccessToken() の呼び出し中にエラーが発生しました:", refreshError); // デバッグログ
                // refreshAccessTokenが失敗した場合、そのエラーメッセージをクライアントに返す
                res.status(500).send(`アクセストークンの更新に失敗しました: ${refreshError.message}`);
                return;
            }

            // ここを tokens.credentials.refresh_token に修正
            if (tokens.credentials.refresh_token) {
                await db.collection('users').doc(decodedIdToken.uid).set({
                    googleRefreshToken: tokens.credentials.refresh_token,
                    googleAccessTokenExpiresAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // ここを tokens.credentials.access_token に修正
            res.status(200).json({ accessToken: tokens.credentials.access_token });

        } catch (error) {
            console.error("Error refreshing access token (outer catch):", error); // デバッグログ
            res.status(500).send(`アクセストークンの更新に失敗しました: ${error.message}`);
        }
    });
});
