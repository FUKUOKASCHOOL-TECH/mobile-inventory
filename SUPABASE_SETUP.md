# Supabase Auth セットアップガイド

このガイドでは、Supabase Authを使用した認証機能のセットアップ方法を説明します。

## 対応している認証方法

- **Google認証**: OAuth認証（オプション）
- **メール/パスワード認証**: デフォルトで有効

## ステップ1: Supabaseアカウントの作成

1. [Supabase](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ（推奨）またはメールアドレスで登録

## ステップ2: プロジェクトの作成

1. ダッシュボードで「New Project」をクリック
2. 以下の情報を入力：
   - **Name**: プロジェクト名（例: `inventory-app`）
   - **Database Password**: データベースのパスワード（必ず保存してください）
   - **Region**: 最寄りのリージョンを選択（例: `Northeast Asia (Tokyo)`）
3. 「Create new project」をクリック
4. プロジェクトの作成が完了するまで待機（1-2分）

## ステップ3: 環境変数の取得

1. プロジェクトダッシュボードの左サイドバーから「Settings」→「API」を選択
2. 以下の情報をコピー：
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

## ステップ4: 環境変数の設定

1. プロジェクトルート（`mobile-inventory`フォルダ）に `.env` ファイルを作成
2. 以下の内容を記述：

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**注意**: `.env`ファイルは`.gitignore`に含まれているため、Gitにコミットされません。

## ステップ5: Google OAuth認証の設定

### 5-1. Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「認証情報」を選択
4. 「認証情報を作成」→「OAuth クライアント ID」を選択
5. アプリケーションの種類: 「ウェブアプリケーション」を選択
6. 承認済みのリダイレクト URI に以下を追加：
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
   （`your-project-ref`はSupabaseのプロジェクト参照ID）
7. 「作成」をクリック
8. **クライアントID**と**クライアントシークレット**をコピー（後で使用）

### 5-2. Supabaseでの設定

1. Supabaseダッシュボードで「Authentication」→「Providers」を選択
2. 「Google」を探して「Enable Google」をクリック
3. 先ほどコピーした情報を入力：
   - **Client ID (for OAuth)**: Google Cloud Consoleから取得したクライアントID
   - **Client Secret (for OAuth)**: Google Cloud Consoleから取得したクライアントシークレット
4. 「Save」をクリック

## ステップ6: メール/パスワード認証の確認

1. Supabaseダッシュボードで「Authentication」→「Providers」を選択
2. 「Email」が有効になっていることを確認（デフォルトで有効）
3. 必要に応じて設定を調整：
   - 「Confirm email」: メール確認を必須にするかどうか
   - 「Secure email change」: メール変更時のセキュリティ設定

## ステップ7: アプリケーションの起動

1. ターミナルで以下を実行：

```bash
npm run dev
```

2. ブラウザで `http://localhost:5173` にアクセス
3. 認証ページで以下をテスト：
   - Googleでログイン（Google認証を設定した場合）
   - メール/パスワードで新規登録・ログイン

## トラブルシューティング

### 環境変数が読み込まれない

- `.env`ファイルがプロジェクトルート（`mobile-inventory`フォルダ）にあるか確認
- 開発サーバーを再起動（`Ctrl+C`で停止してから`npm run dev`で再起動）
- 環境変数の値に余分なスペースや引用符がないか確認

### OAuth認証がリダイレクトループになる

- SupabaseのリダイレクトURIが正しく設定されているか確認
- GoogleのリダイレクトURIがSupabaseのURLと一致しているか確認

### メール確認が必要な場合

- Supabaseダッシュボードで「Authentication」→「Providers」→「Email」の設定を確認
- 「Confirm email」が有効な場合、メールボックスを確認して確認リンクをクリック

## 参考リンク

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase Auth ドキュメント](https://supabase.com/docs/guides/auth)
- [Google OAuth設定ガイド](https://supabase.com/docs/guides/auth/social-login/auth-google)

