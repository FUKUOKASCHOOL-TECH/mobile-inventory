# Inventory (React + Vite + Tailwind)

QRスキャン → 在庫確認 → 貸出/返却 → チャット通知（Discordモック）までをワンフローで確認できるMVPです。

## 機能

- **Googleアカウント認証**: Supabase Authを使用したOAuth認証
- **GitHubアカウント認証**: Supabase Authを使用したOAuth認証
- **メール/パスワード認証**: Supabase Authを使用した認証（フォールバック: ローカルストレージ）

## Setup

```bash
npm i
npm run dev
```

## 環境変数の設定

### Supabase Authの設定（推奨）

プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase設定
# Supabaseダッシュボードから取得: https://app.supabase.com
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Supabaseのセットアップ手順

1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクト設定 > API から以下を取得：
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`
4. Authentication > Providers で以下を有効化：
   - Google（OAuth認証）
   - GitHub（OAuth認証）
   - Email（メール/パスワード認証）

#### OAuth認証の設定

**Google認証:**
1. Google Cloud ConsoleでOAuth 2.0クライアントIDを作成
2. リダイレクトURIを設定: `https://your-project-ref.supabase.co/auth/v1/callback`
3. Supabaseダッシュボード > Authentication > Providers > Google にクライアントIDとシークレットを設定

**GitHub認証:**
1. GitHub Developer SettingsでOAuth Appを作成
2. Authorization callback URLを設定: `https://your-project-ref.supabase.co/auth/v1/callback`
3. Supabaseダッシュボード > Authentication > Providers > GitHub にClient IDとClient Secretを設定

### 環境変数が設定されていない場合

Supabaseが設定されていない場合でも、アプリケーションは動作します：
- Google認証: モック認証が使用されます
- GitHub認証: モック認証が使用されます
- メール/パスワード認証: ローカルストレージに保存されます（フォールバック）

## 認証方法の詳細

### Supabase Authを使用した認証

このアプリケーションは **Supabase Auth** を使用して認証を実装しています。

#### メリット

- **セキュリティ**: パスワードハッシュ化、セッション管理が自動
- **OAuth認証**: Google、GitHubなどのOAuth認証が簡単に実装可能
- **フロントエンドのみ**: バックエンド不要でデプロイ可能
- **無料枠**: 月50,000 MAUまで無料
- **フォールバック**: Supabaseが設定されていない場合、ローカルストレージ認証に自動フォールバック

#### 認証方法

1. **Google認証**: Supabase Auth経由でGoogle OAuth認証
2. **GitHub認証**: Supabase Auth経由でGitHub OAuth認証
3. **メール/パスワード認証**: Supabase Authで管理（フォールバック: ローカルストレージ）

### フォールバック動作

Supabaseが設定されていない場合、アプリケーションは自動的にローカルストレージ認証にフォールバックします。これにより、開発中でもSupabaseの設定なしで動作確認が可能です。
