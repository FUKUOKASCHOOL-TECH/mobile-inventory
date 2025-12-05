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
// このページの責務: 1アイテムの在庫変更・貸出/返却を行い、必要に応じて通知/履歴を追加する
import React, { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { IconMinus, IconPlus } from "../components/Icons.jsx"
import { useInventory } from "../hooks/useInventory.js"
import { useLending } from "../hooks/useLending.js"
import { useSession } from "../hooks/useSession.js"
import { useToast } from "../components/Toast.jsx"
import { badgeByGenre, generateId, nowIso, toIntSafe } from "../lib/utils.js"
import { sendDiscordNotification } from "../lib/discordMock.js"

export default function Item() {
  const params = useParams()
  const id = String(params.id || "")
  const { items, updateItem } = useInventory()
  const { add } = useLending()
  const { session } = useSession()
  const { pushToast } = useToast()
  const [memo, setMemo] = useState("")

  const item = useMemo(() => items.find((x) => x.id === id), [items, id])
  const badge = useMemo(() => badgeByGenre(item?.genre), [item])

  const applyCount = (nextCount) => {
    if (!item) return
    const prev = item.count
    const next = { ...item, count: Math.max(0, toIntSafe(nextCount, 0)), updatedAt: nowIso() }
    // localStorage同期
    updateItem(next)

    if (prev === 1 && next.count === 0) {
      // 在庫ゼロ通知
      sendDiscordNotification({ type: "stock_zero", itemName: item.name, genre: item.genre, userName: session?.userName || "unknown", timestamp: nowIso() })
    }
  }

  const lend = () => {
    if (!item) return
    if (item.count <= 0) {
      pushToast("在庫がありません", "danger")
      return
    }
    applyCount(item.count - 1)

    // 貸出履歴追加
    add({ id: generateId("lend_"), itemId: item.id, action: "lend", userName: session?.userName || "unknown", at: nowIso(), memo: memo.trim() })

    sendDiscordNotification({ type: "lend", itemName: item.name, genre: item.genre, userName: session?.userName || "unknown", timestamp: nowIso() })
    setMemo("")
  }

  const ret = () => {
    if (!item) return
    applyCount(item.count + 1)

    // 貸出履歴追加
    add({ id: generateId("lend_"), itemId: item.id, action: "return", userName: session?.userName || "unknown", at: nowIso(), memo: memo.trim() })

    sendDiscordNotification({ type: "return", itemName: item.name, genre: item.genre, userName: session?.userName || "unknown", timestamp: nowIso() })
    setMemo("")
  }

  if (!item) {
    return (
      <div className="pt-4">
        <div className="rounded-3xl border border-gray-300 bg-white p-5 text-black">
          <div className="text-base font-semibold text-black">アイテムが見つかりません</div>
          <div className="mt-2 text-sm text-white">QRの内容が在庫IDと一致しない可能性があります。</div>
          <div className="mt-4 flex gap-2">
            <Link to="/scan" className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm text-black">
              スキャンへ
            </Link>
            <Link to="/inventory" className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm text-black">
              在庫一覧へ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4">
      <div className="rounded-3xl border border-gray-300 bg-white p-5 text-black">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-black">{item.name}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black">
              <span className={`rounded-full border px-2 py-1 text-[11px] ${badge.className}`}>{badge.label}</span>
              <span className="rounded-full border border-gray-300 bg-white px-2 py-1 text-black">場所: {item.location}</span>
              <span className="rounded-full border border-gray-300 bg-white px-2 py-1 text-black">更新: {new Date(item.updatedAt).toLocaleString("ja-JP")}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-300 bg-white px-4 py-2 text-center text-black">
            <div className="text-[11px] text-black">在庫</div>
            <div className="text-2xl font-extrabold text-black">{item.count}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-black active:scale-[0.99]"
            onClick={() => applyCount(item.count - 1)}
            type="button"
          >
            <IconMinus className="h-4 w-4" />-
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-black active:scale-[0.99]"
            onClick={() => applyCount(item.count + 1)}
            type="button"
          >
            <IconPlus className="h-4 w-4" />+
          </button>

          <div className="col-span-2 mt-2 rounded-3xl border border-gray-300 bg-white p-4 text-black">
            <div className="text-sm font-semibold text-black">貸出 / 返却</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <input
                className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500"
                placeholder="メモ（任意）"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
              <button className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm text-black active:scale-[0.99]" onClick={lend} type="button">
                貸出
              </button>
              <button className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm text-black active:scale-[0.99]" onClick={ret} type="button">
                返却
              </button>
            </div>
            <div className="mt-2 text-[11px] text-black">在庫が 1→0 のとき、自動で在庫切れ通知（モック）が飛びます。</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-gray-300 bg-white p-5 text-black">
        <div className="text-sm font-semibold text-black">運用メモ</div>
        <div className="mt-2 text-sm text-black">ジャンルは将来 Discord のチャンネルに割り当てます（kitchen, bath, consumable, tool）。</div>
      </div>
    </div>
  )
}
