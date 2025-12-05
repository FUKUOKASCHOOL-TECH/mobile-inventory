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
import React, { useEffect } from "react"

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-gray-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-300 px-5 py-4">
          <div className="text-sm font-semibold text-black">{title}</div>
          <button
            className="rounded-xl border border-gray-300 bg-white px-3 py-1 text-xs text-black active:scale-[0.98]"
            onClick={onClose}
            type="button"
          >
            閉じる
          </button>
        </div>
        <div className="px-5 py-4 text-black">{children}</div>
      </div>
    </div>
  )
}
