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
      // ログアウト時は必ずnullを設定
      if (user === null) {
        setState(null)
        // ローカルストレージもクリア（念のため）
        clearSession()
      } else {
        setState(user)
      }
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const set = useCallback(async (data) => {
    // Supabaseが設定されている場合は、セッションはSupabaseが自動的に管理する
    // ローカルストレージには保存しない（Supabaseのセッションと競合するため）
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // フォールバック: ローカルストレージに保存
      setSession(data)
      setState(getSession())
    } else {
      // Supabase使用時は、状態のみ更新（Supabaseがセッションを管理）
      setState(data)
    }
  }, [])

  const clear = useCallback(async () => {
    try {
      // まず状態をnullに設定（即座に反映）
      setState(null)
      
      // Supabaseが設定されている場合はSupabaseからログアウト
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        await authSignOut()
      }
      
      // ローカルストレージも必ずクリア（Supabase使用時も）
      clearSession()
      
      // Supabaseのセッションストレージもクリア
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      }
    } catch (error) {
      console.error("ログアウトエラー:", error)
      // エラーが発生しても状態とストレージはクリア
      setState(null)
      clearSession()
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      }
    }
  }, [])

  return useMemo(() => ({ session, set, clear, loading }), [session, set, clear, loading])
}
