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
import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { IconChevronLeft, IconLogout } from "./Icons.jsx"
import { useToast } from "./Toast.jsx"

export default function Navbar({ isMobile, userName, provider, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const canBack = location.pathname.startsWith("/item/")

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="flex items-center gap-2">
          {canBack ? (
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 active:scale-[0.98]"
              onClick={() => navigate(-1)}
              aria-label="戻る"
              type="button"
            >
              <IconChevronLeft className="h-5 w-5 text-zinc-200" />
            </button>
          ) : null}
          <div>
            <div className="text-sm font-semibold text-zinc-100">Inventory</div>
            <div className="text-xs text-zinc-400">QR → 在庫 → 貸出/返却 → 通知</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end">
            <div className="text-xs text-zinc-300">{userName}</div>
            <div className="text-[11px] text-zinc-500">{provider}</div>
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 text-sm text-zinc-100 active:scale-[0.98]"
            onClick={() => {
              onLogout()
              pushToast("ログアウトしました")
            }}
            type="button"
          >
            <IconLogout className="h-4 w-4" />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </div>
    </header>
  )
}
