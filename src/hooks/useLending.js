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
import { addLendingRecord, getLending, onStorageEvent } from "../lib/storage.js"

export function useLending() {
  const [records, setRecords] = useState(() => getLending())

  useEffect(() => {
    return onStorageEvent("lending", () => {
      setRecords(getLending())
    })
  }, [])

  const add = useCallback((record) => {
    // 貸出履歴追加
    addLendingRecord(record)
  }, [])

  return useMemo(() => ({ records, add }), [records, add])
}
