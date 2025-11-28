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
import { getSession, setSession, clearSession, onStorageEvent } from "../lib/storage.js"

export function useSession() {
  const [session, setState] = useState(() => getSession())

  useEffect(() => {
    return onStorageEvent("session", () => {
      setState(getSession())
    })
  }, [])

  const set = useCallback((data) => {
    // localStorage同期
    setSession(data)
    setState(getSession())
  }, [])

  const clear = useCallback(() => {
    // localStorage同期
    clearSession()
    setState(getSession())
  }, [])

  return useMemo(() => ({ session, set, clear }), [session, set, clear])
}
