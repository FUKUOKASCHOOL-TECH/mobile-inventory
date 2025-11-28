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
import { getInventory, setInventory, addItem as addItemStorage, updateItem as updateItemStorage, deleteItem as deleteItemStorage, onStorageEvent } from "../lib/storage.js"

export function useInventory() {
  const [items, setItems] = useState(() => getInventory())

  useEffect(() => {
    return onStorageEvent("inventory", () => {
      setItems(getInventory())
    })
  }, [])

  const setAll = useCallback((list) => {
    // localStorage同期
    setInventory(list)
  }, [])

  const addItem = useCallback((item) => {
    // localStorage同期
    addItemStorage(item)
  }, [])

  const updateItem = useCallback((item) => {
    // localStorage同期
    updateItemStorage(item)
  }, [])

  const deleteItem = useCallback((id) => {
    // localStorage同期
    deleteItemStorage(id)
  }, [])

  return useMemo(() => ({ items, setAll, addItem, updateItem, deleteItem }), [items, setAll, addItem, updateItem, deleteItem])
}
