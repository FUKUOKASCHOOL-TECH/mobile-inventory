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
import { supabase } from "./supabase.js"
import { dispatchToast } from "./utils.js"

// Google OAuth認証（Supabase Auth使用）
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`
      }
    })

    if (error) {
      throw error
    }

    // OAuth認証の場合はリダイレクトされるため、ここには到達しない
    // コールバック処理はauth.jsxで行う
    return { success: true, redirect: true }
  } catch (error) {
    // Supabaseが設定されていない場合のフォールバック
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return {
        success: true,
        user: {
          userName: "Googleユーザー",
          email: `google_${Date.now()}@example.com`,
          provider: "google"
        }
      }
    }
    throw error
  }
}

// Discord OAuth認証（Supabase Auth使用）
export async function signInWithDiscord() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth`
      }
    })

    if (error) {
      throw error
    }

    // OAuth認証の場合はリダイレクトされるため、ここには到達しない
    // コールバック処理はauth.jsxで行う
    return { success: true, redirect: true }
  } catch (error) {
    // Supabaseが設定されていない場合のフォールバック
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return {
        success: true,
        user: {
          userName: "Discordユーザー",
          email: `discord_${Date.now()}@example.com`,
          provider: "discord"
        }
      }
    }
    throw error
  }
}

// メール/パスワード認証 - 新規登録（Supabase Auth使用）
export async function signUpWithEmail(email, password, userName) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_name: userName
        },
        emailRedirectTo: `${window.location.origin}/auth`
      }
    })

    if (error) {
      // メール確認が必要な場合のエラーハンドリング
      if (error.message.includes("Email not confirmed") || error.message.includes("email_not_confirmed")) {
        throw new Error("メール確認が必要です。メールボックスを確認してください。")
      }
      throw error
    }

    // メール確認が必要な場合でも、セッションが作成される場合がある
    if (data.user) {
      return {
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          userName: data.user?.user_metadata?.user_name || userName,
          provider: "email"
        },
        requiresEmailConfirmation: !data.session // セッションがない場合はメール確認が必要
      }
    }

    // メール確認が必要な場合
    return {
      success: true,
      requiresEmailConfirmation: true,
      message: "確認メールを送信しました。メールボックスを確認してください。"
    }
  } catch (error) {
    // Supabaseが設定されていない場合のフォールバック
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // ローカルストレージに保存（既存の実装）
      const { createUser } = await import("./storage.js")
      const result = createUser({ email, password, userName })
      if (result.success) {
        return {
          success: true,
          user: {
            userName: result.user.userName,
            email: result.user.email,
            provider: "email"
          }
        }
      }
      throw new Error(result.error)
    }
    throw error
  }
}

// メール/パスワード認証 - ログイン（Supabase Auth使用）
export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      // メール確認が必要な場合のエラーハンドリング
      if (error.message.includes("Email not confirmed") || error.message.includes("email_not_confirmed")) {
        throw new Error("メール確認が必要です。メールボックスを確認して、確認リンクをクリックしてください。")
      }
      throw error
    }

    return {
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        userName: data.user?.user_metadata?.user_name || data.user?.email?.split("@")[0] || "ユーザー",
        provider: "email"
      }
    }
  } catch (error) {
    // Supabaseが設定されていない場合のフォールバック
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // ローカルストレージから検証（既存の実装）
      const { verifyUser } = await import("./storage.js")
      const result = verifyUser(email, password)
      if (result.success) {
        return {
          success: true,
          user: {
            userName: result.user.userName,
            email: result.user.email,
            provider: "email"
          }
        }
      }
      throw new Error(result.error)
    }
    throw error
  }
}

// ログアウト（Supabase Auth使用）
export async function signOut() {
  try {
    // Supabaseのセッションをクリア
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) {
      throw error
    }
    // セッションストレージもクリア（念のため）
    if (typeof window !== 'undefined') {
      // Supabaseが使用するストレージキーをクリア
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
    }
    return { success: true }
  } catch (error) {
    // Supabaseが設定されていない場合はローカルストレージをクリア
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const { clearSession } = await import("./storage.js")
      clearSession()
      return { success: true }
    }
    throw error
  }
}

// 現在のセッションを取得（Supabase Auth使用）
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }

    if (!session) {
      return null
    }

    const user = session.user
    const provider = user.app_metadata?.provider || "email"
    
    return {
      id: user.id,
      email: user.email,
      userName: user.user_metadata?.user_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "ユーザー",
      provider: provider,
      loggedInAt: new Date(user.last_sign_in_at || user.created_at).toISOString()
    }
  } catch (error) {
    // Supabaseが設定されていない場合はローカルストレージから取得
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const { getSession } = await import("./storage.js")
      return getSession()
    }
    return null
  }
}

// Supabase Authのセッション変更を監視
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    // SIGNED_OUTイベントの場合は必ずnullを返す
    if (event === 'SIGNED_OUT' || !session) {
      callback(null)
      return
    }
    
    // セッションがある場合のみユーザー情報を返す
    if (session && session.user) {
      const user = session.user
      const provider = user.app_metadata?.provider || "email"
      callback({
        id: user.id,
        email: user.email,
        userName: user.user_metadata?.user_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "ユーザー",
        provider: provider,
        loggedInAt: new Date(user.last_sign_in_at || user.created_at).toISOString()
      })
    } else {
      callback(null)
    }
  })
  return { data: { subscription } }
}
