// functions/index.js
// Firebase Functionsに必要なモジュールをインポートします。
// V2 APIのHTTPSトリガーとグローバルオプションをインポートします。
const { setGlobalOptions } = require('firebase-functions/v2');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
// functions.config() の代わりに、設定パラメータを定義するためにparamsをインポートします。
const { defineString } = require('firebase-functions/params');
const { google } = require('googleapis');
const admin = require('firebase-admin');

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
// これらはFirebase CLIで設定した環境変数に対応します。
const GOOGLE_CLIENT_ID = defineString('GOOGLEAPI_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = defineString('GOOGLEAPI_CLIENT_SECRET');
const GOOGLE_REDIRECT_URI = defineString('GOOGLEAPI_REDIRECT_URI');


// OAuth2クライアントを設定します。
const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID.value(),     // paramsからクライアントIDを取得
    GOOGLE_CLIENT_SECRET.value(), // paramsからクライアントシークレットを取得
    GOOGLE_REDIRECT_URI.value()   // paramsからリダイレクトURIを取得
);

/**
 * Google認証コードをアクセストークンとリフレッシュトークンに交換するHTTP Callable Functionです。
 * クライアントサイドから認証コードを受け取り、サーバーサイドで安全にトークン交換を行います。
 *
 * @param {object} data - クライアントから送信されるデータ。`code` (認証コード) と `redirectUri` を含みます。
 * @param {object} context - 関数の実行コンテキスト。Firebase認証情報を含みます。
 * @returns {object} アクセストークンを含むオブジェクト。
 */
exports.exchangeGoogleToken = onCall(async (data, context) => {
    // Firebaseで認証されたユーザーのみがこの関数を呼び出せるようにします。
    if (!context.auth) {
        console.error("Unauthenticated user attempted to call exchangeGoogleToken.");
        throw new HttpsError('unauthenticated', 'ユーザーは認証されていません。');
    }

    const { code, redirectUri } = data;

    // 必要なデータが提供されているか確認します。
    if (!code || !redirectUri) {
        console.error("Missing code or redirectUri in exchangeGoogleToken call.");
        throw new HttpsError('invalid-argument', '認証コードまたはリダイレクトURIが不足しています。');
    }

    try {
        // OAuth2クライアントのリダイレクトURIを動的に設定します。
        // これは、Google Cloud Consoleに登録されているリダイレクトURIと一致している必要があります。
        oAuth2Client.setRedirectUri(redirectUri);

        // 認証コードをGoogleのアクセストークンとリフレッシュトークンに交換します。
        const { tokens } = await oAuth2Client.getToken(code);

        // リフレッシュトークンは機密情報であり、クライアントには返すべきではありません。
        // Firestoreなど、サーバーサイドで安全に保存します。
        // これにより、将来的にユーザーの介入なしにアクセストークンを更新できます。
        if (tokens.refresh_token) {
            await db.collection('users').doc(context.auth.uid).set({
                googleRefreshToken: tokens.refresh_token,
                // アクセストークンの有効期限も記録しておくと良いでしょう（オプション）。
                googleAccessTokenExpiresAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true }); // 既存のユーザーデータとマージして更新します。
        }

        // クライアントにはアクセストークンのみを返します。
        return { accessToken: tokens.access_token };

    } catch (error) {
        console.error("Error exchanging code for tokens:", error);
        // エラーが発生した場合、クライアントに適切なエラーメッセージを返します。
        throw new HttpsError('internal', 'トークン交換に失敗しました。', error.message);
    }
});

/**
 * 保存されたリフレッシュトークンを使用して新しいアクセストークンを取得するHTTP Callable Functionです。
 * クライアントサイドから呼び出され、Google APIへのリクエスト前にアクセストークンを更新します。
 *
 * @param {object} data - クライアントから送信されるデータ（この関数では不要）。
 * @param {object} context - 関数の実行コンテキスト。Firebase認証情報を含みます。
 * @returns {object} 新しいアクセストークンを含むオブジェクト。
 */
exports.refreshGoogleAccessToken = onCall(async (data, context) => {
    // Firebaseで認証されたユーザーのみがこの関数を呼び出せるようにします。
    if (!context.auth) {
        console.error("Unauthenticated user attempted to call refreshGoogleAccessToken.");
        throw new HttpsError('unauthenticated', 'ユーザーは認証されていません。');
    }

    try {
        // ユーザーのFirestoreドキュメントから保存されたリフレッシュトークンを取得します。
        const userDoc = await db.collection('users').doc(context.auth.uid).get();
        const refreshToken = userDoc.data()?.googleRefreshToken;

        // リフレッシュトークンが見つからない場合はエラーを返します。
        if (!refreshToken) {
            console.error(`Refresh token not found for user: ${context.auth.uid}`);
            throw new HttpsError('not-found', 'リフレッシュトークンが見つかりません。Googleアカウントとの連携を再度行ってください。');
        }

        // OAuth2クライアントにリフレッシュトークンを設定します。
        oAuth2Client.setCredentials({ refresh_token: refreshToken });

        // リフレッシュトークンを使用して新しいアクセストークンを取得します。
        const { tokens } = await oAuth2Client.refreshAccessToken();

        // 新しいリフレッシュトークンが発行された場合（稀ですが）、Firestoreの情報を更新します。
        if (tokens.refresh_token) {
            await db.collection('users').doc(context.auth.uid).set({
                googleRefreshToken: tokens.refresh_token,
                googleAccessTokenExpiresAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // 新しいアクセストークンをクライアントに返します。
        return { accessToken: tokens.access_token };

    } catch (error) {
        console.error("Error refreshing access token:", error);
        throw new HttpsError('internal', 'アクセストークンの更新に失敗しました。', error.message);
    }
});
