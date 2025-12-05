/**
@typedef {Object} InventoryItem
@property {string} id
@property {string} name
@property {number} count
@property {string} location
@property {string} genre
@property {string} updatedAt
*/

/**
@typedef {Object} LendingRecord
@property {string} id
@property {string} itemId
@property {string} action // lend | return
@property {string} userName
@property {string} at
@property {string} memo
*/
// このページの責務: ログイン情報をSupabase Authで管理して /scan へ遷移する
import React, { useState, useEffect } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useSession } from "../hooks/useSession.js"
import { dispatchToast } from "../lib/utils.js"
import { signInWithGoogle, signInWithGitHub, signUpWithEmail, signInWithEmail, transformUserData } from "../lib/auth.js"
import { supabase } from "../lib/supabase.js"

function LoginButton({ label, provider, onClick, loading = false }) {
  return (
    <button
      className="w-full rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
      type="button"
      disabled={loading}
    >
      <div className="text-sm font-semibold text-zinc-100">{label}</div>
      <div className="mt-1 text-xs text-zinc-500">provider: {provider}</div>
    </button>
  )
}

function EmailAuthForm({ onSuccess }) {
  const [mode, setMode] = useState("login") // "login" or "register"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userName, setUserName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "register") {
        if (!email || !password || !userName) {
          setError("すべての項目を入力してください")
          setLoading(false)
          return
        }
        const result = await signUpWithEmail(email, password, userName)
        if (result.success) {
          if (result.requiresEmailConfirmation) {
            setError(result.message || "確認メールを送信しました。メールボックスを確認して、メール内のリンクをクリックしてください。")
            dispatchToast("確認メールを送信しました", "success")
          } else if (result.user) {
            dispatchToast("アカウントを作成しました", "success")
            onSuccess(result.user)
          }
        } else {
          setError(result.error || "アカウント作成に失敗しました")
        }
      } else {
        if (!email || !password) {
          setError("メールアドレスとパスワードを入力してください")
          setLoading(false)
          return
        }
        const result = await signInWithEmail(email, password)
        if (result.success) {
          dispatchToast("ログインしました", "success")
          onSuccess(result.user)
        } else {
          setError(result.error || "ログインに失敗しました")
        }
      }
    } catch (err) {
      setError(err.message || "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("login")
            setError("")
          }}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === "login"
              ? "bg-zinc-800 text-zinc-100"
              : "bg-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register")
            setError("")
          }}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === "register"
              ? "bg-zinc-800 text-zinc-100"
              : "bg-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          新規登録
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "register" && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">ユーザー名</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
              placeholder="ユーザー名を入力"
              disabled={loading}
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
            placeholder="email@example.com"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
            placeholder="パスワードを入力"
            disabled={loading}
          />
        </div>
        {error && (
          <div className="rounded-xl bg-red-950/30 border border-red-900/50 px-4 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "処理中..." : mode === "register" ? "アカウントを作成" : "ログイン"}
        </button>
      </form>
    </div>
  )
}

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { set, session } = useSession()
  const from = location.state?.from || "/scan"
  const [loading, setLoading] = useState({ google: false, github: false })

  // Supabase OAuthコールバック処理
  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get("code")
      const error = searchParams.get("error")
      const errorDescription = searchParams.get("error_description")

      if (error) {
        dispatchToast(errorDescription || "認証がキャンセルされました", "error")
        navigate("/auth", { replace: true })
        return
      }

      if (code) {
        // Supabaseが設定されている場合、セッションは自動的に処理される
        // useSessionフックがセッションを取得するのを待つ
        try {
          const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            throw sessionError
          }

          if (newSession) {
            const userData = transformUserData(newSession.user)
            set(userData)
            dispatchToast("ログインしました", "success")
            navigate(from, { replace: true })
          }
        } catch (err) {
          dispatchToast(err.message || "認証に失敗しました", "error")
          navigate("/auth", { replace: true })
        }
      }
    }

    handleAuthCallback()
  }, [searchParams, navigate, from, set])

  // 既にログインしている場合はリダイレクト
  useEffect(() => {
    if (session) {
      navigate(from, { replace: true })
    }
  }, [session, navigate, from])

  const handleGoogleLogin = async () => {
    setLoading((prev) => ({ ...prev, google: true }))
    try {
      const result = await signInWithGoogle()
      if (result.redirect) {
        // OAuth認証の場合はリダイレクトされる
        // コールバック処理はuseEffectで行う
        return
      }
      if (result.success && result.user) {
        set(result.user)
        dispatchToast("ログインしました", "success")
        navigate(from, { replace: true })
      }
    } catch (error) {
      dispatchToast(error.message || "Google認証に失敗しました", "error")
    } finally {
      setLoading((prev) => ({ ...prev, google: false }))
    }
  }

  const handleGitHubLogin = async () => {
    setLoading((prev) => ({ ...prev, github: true }))
    try {
      const result = await signInWithGitHub()
      if (result.redirect) {
        // OAuth認証の場合はリダイレクトされる
        // コールバック処理はuseEffectで行う
        return
      }
      if (result.success && result.user) {
        set(result.user)
        dispatchToast("ログインしました", "success")
        navigate(from, { replace: true })
      }
    } catch (error) {
      dispatchToast(error.message || "GitHub認証に失敗しました", "error")
    } finally {
      setLoading((prev) => ({ ...prev, github: false }))
    }
  }


  const handleEmailAuthSuccess = (userData) => {
    set(userData)
    navigate(from, { replace: true })
  }

  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-xl font-bold text-zinc-100">ログイン</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {isSupabaseConfigured
            ? "Google、GitHubまたはメールアドレスでログインできます。"
            : "Supabaseが設定されていないため、ローカルストレージ認証を使用します。"}
        </p>

        <div className="mt-6 space-y-3">
          <LoginButton
            label="Googleでログイン"
            provider="google"
            onClick={handleGoogleLogin}
            loading={loading.google}
          />
          <LoginButton
            label="GitHubでログイン"
            provider="github"
            onClick={handleGitHubLogin}
            loading={loading.github}
          />
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-950 px-2 text-zinc-500">または</span>
            </div>
          </div>
        </div>

        <EmailAuthForm onSuccess={handleEmailAuthSuccess} />

        <div className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 text-xs text-zinc-400">
          <div className="font-semibold text-zinc-300">認証について</div>
          <div className="mt-1 leading-relaxed">
            {isSupabaseConfigured
              ? "Supabase Authを使用した認証です。Google、GitHub認証はOAuth、メール/パスワード認証はSupabaseで管理されます。"
              : "Supabaseが設定されていないため、ローカルストレージに保存されます。本番環境ではSupabase Authの使用を推奨します。"}
          </div>
        </div>
      </div>
    </div>
  )
}
