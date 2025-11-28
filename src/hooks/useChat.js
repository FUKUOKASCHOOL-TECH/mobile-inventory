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
import { addChatMessage, getChat, onStorageEvent } from "../lib/storage.js"

export function useChat() {
  const [messages, setMessages] = useState(() => getChat())

  useEffect(() => {
    return onStorageEvent("chat", () => {
      setMessages(getChat())
    })
  }, [])

  const send = useCallback((msg) => {
    // localStorage同期
    addChatMessage(msg)
  }, [])

  return useMemo(() => ({ messages, send }), [messages, send])
}
