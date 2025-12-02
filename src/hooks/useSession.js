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
import { useCallback, useEffect, useMemo, useState } from "react"
import { getCurrentSession, onAuthStateChange, signOut as authSignOut } from "../lib/auth.js"
import { getSession, setSession, clearSession, onStorageEvent } from "../lib/storage.js"

export function useSession() {
  const [session, setState] = useState(null)
  const [loading, setLoading] = useState(true)

  // 初期セッション取得
  useEffect(() => {
    const initSession = async () => {
      try {
        // Supabaseが設定されている場合はSupabaseから取得
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          const supabaseSession = await getCurrentSession()
          setState(supabaseSession)
        } else {
          // フォールバック: ローカルストレージから取得
          setState(getSession())
        }
      } catch (error) {
        console.error("セッション取得エラー:", error)
        // フォールバック: ローカルストレージから取得
        setState(getSession())
      } finally {
        setLoading(false)
      }
    }

    initSession()
  }, [])

  // Supabase Authの状態変更を監視
  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // Supabaseが設定されていない場合はローカルストレージのイベントを監視
      return onStorageEvent("session", () => {
        setState(getSession())
      })
    }

    // Supabase Authの状態変更を監視
    const { data: { subscription } } = onAuthStateChange((user) => {
      setState(user)
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const set = useCallback(async (data) => {
    // Supabaseが設定されている場合は、セッションは自動的に管理される
    // ここではローカルストレージとの互換性のために保存
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setSession(data)
      setState(getSession())
    } else {
      // Supabase使用時は、セッション情報をローカルストレージにも保存（互換性のため）
      setSession(data)
      setState(data)
    }
  }, [])

  const clear = useCallback(async () => {
    try {
      // Supabaseが設定されている場合はSupabaseからログアウト
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        await authSignOut()
      } else {
        // フォールバック: ローカルストレージをクリア
        clearSession()
      }
      setState(null)
    } catch (error) {
      console.error("ログアウトエラー:", error)
      // エラーが発生してもローカルストレージはクリア
      clearSession()
      setState(null)
    }
  }, [])

  return useMemo(() => ({ session, set, clear, loading }), [session, set, clear, loading])
}
