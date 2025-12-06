/**
@typedef {Object} InventoryItem
@property {string} id
@property {string} name
@property {number} stock
@property {string} location
@property {string} item_type
@property {Array} tags
@property {string} status
@property {string} borrowed_by
@property {string} reserved_by
@property {string} expiry_date
@property {string} expiry_type
*/

// このページの責務: 1アイテムの在庫変更・貸出/返却を行い、必要に応じて通知/履歴を追加する
import React, { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { IconMinus, IconPlus } from "../components/Icons.jsx"
import { useInventory } from "../hooks/useInventory.js"
import { useSession } from "../hooks/useSession.js"
import { useToast } from "../components/Toast.jsx"
import { toIntSafe, nowIso } from "../lib/utils.js"
import { addLendingLog } from "../lib/supabaseItems.js"
import { sendDiscordNotification } from "../lib/discordMock.js"

function getTagBadge(tag) {
  if (!tag) return { label: "未分類", className: "border-zinc-800 bg-zinc-900/40 text-zinc-200" }
  const name = String(tag.name || "").toLowerCase()
  if (name.includes("キッチン") || name.includes("kitchen")) {
    return { label: tag.name, className: "border-amber-900/50 bg-amber-950/30 text-amber-200" }
  }
  if (name.includes("バス") || name.includes("bath")) {
    return { label: tag.name, className: "border-sky-900/50 bg-sky-950/30 text-sky-200" }
  }
  if (name.includes("消耗") || name.includes("consumable")) {
    return { label: tag.name, className: "border-emerald-900/50 bg-emerald-950/30 text-emerald-200" }
  }
  if (name.includes("工具") || name.includes("tool")) {
    return { label: tag.name, className: "border-violet-900/50 bg-violet-950/30 text-violet-200" }
  }
  return { label: tag.name, className: "border-zinc-800 bg-zinc-900/40 text-zinc-200" }
}

export default function Item() {
  const params = useParams()
  const id = String(params.id || "")
  const { items, updateItem, refreshItems } = useInventory()
  const { session } = useSession()
  const { pushToast } = useToast()
  const [memo, setMemo] = useState("")
  const [userName, setUserName] = useState("")

  const item = useMemo(() => items.find((x) => x.id === id), [items, id])
  const tag = useMemo(() => (item?.tags && item.tags.length > 0 ? item.tags[0] : null), [item])
  const badge = useMemo(() => getTagBadge(tag), [tag])

  const isShared = item?.item_type === "shared"
  const isFood = item?.item_type === "food"

  const applyStock = async (nextStock) => {
    if (!item) return
    const prev = item.stock
    const next = {
      ...item,
      stock: Math.max(0, toIntSafe(nextStock, 0)),
    }
    await updateItem(next)
    await refreshItems()

    if (prev > 0 && next.stock === 0) {
      pushToast("在庫がゼロになりました", "warning")
      // 在庫が0になった時に通知を送信
      await sendDiscordNotification({
        type: "stock_zero",
        itemName: item.name,
        item_type: item.item_type || item.category || "consumable",
        category: item.item_type || item.category || "consumable",
        timestamp: new Date().toISOString(),
      })
    }
  }

  // 共有物の借りる処理
  const handleBorrow = async () => {
    if (!item) return

    if (item.status === "borrowed") {
      pushToast("既に貸出中です", "danger")
      return
    }

    if (!userName.trim()) {
      pushToast("借りる人の名前を入力してください", "danger")
      return
    }

    try {
      // ステータスを更新
      const updated = {
        ...item,
        status: "borrowed",
        borrowed_by: userName.trim(),
        lent_date: nowIso(),
      }
      await updateItem(updated)

      // 貸出ログを追加
      await addLendingLog({
        user_id: session?.id || null,
        item_id: Number.parseInt(item.id, 10),
        status: "borrowed",
        start_date: nowIso(),
        quantity: 1,
        user_name: userName.trim(),
        memo: memo.trim(),
      })

      pushToast("貸出しました", "success")
      setMemo("")
      setUserName("")
      await refreshItems()
    } catch (error) {
      console.error("貸出エラー:", error)
      pushToast("貸出に失敗しました", "danger")
    }
  }

  // 共有物の返す処理
  const handleReturn = async () => {
    if (!item) return

    if (item.status !== "borrowed") {
      pushToast("貸出中ではありません", "danger")
      return
    }

    try {
      // ステータスを更新
      const updated = {
        ...item,
        status: "available",
        borrowed_by: null,
        returned_date: nowIso(),
      }
      await updateItem(updated)

      // 返却ログを追加
      await addLendingLog({
        user_id: session?.id || null,
        item_id: Number.parseInt(item.id, 10),
        status: "returned",
        start_date: item.lent_date || nowIso(),
        returned_date: nowIso(),
        quantity: 1,
        user_name: item.borrowed_by || "不明",
        memo: memo.trim(),
      })

      pushToast("返却しました", "success")
      setMemo("")
      await refreshItems()
    } catch (error) {
      console.error("返却エラー:", error)
      pushToast("返却に失敗しました", "danger")
    }
  }

  if (!item) {
    return (
      <div className="pt-4">
        <div className="rounded-3xl border border-gray-300 bg-white p-5 text-black">
          <div className="text-base font-semibold text-black">アイテムが見つかりません</div>
          <div className="mt-2 text-sm text-gray-600">
            QRの内容が在庫IDと一致しない可能性があります。
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              to="/scan"
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm text-black"
            >
              スキャンへ
            </Link>
            <Link
              to="/inventory"
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm text-black"
            >
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
          <div className="flex-1">
            <div className="text-xl font-bold text-black">{item.name}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black">
              <span className={`rounded-full border px-2 py-1 text-[11px] ${badge.className}`}>
                {badge.label}
              </span>
              <span className="rounded-full border border-gray-300 bg-white px-2 py-1 text-black">
                場所: {item.location || "未設定"}
              </span>
              {isFood && item.expiry_date && (
                <span className="rounded-full border border-orange-300 bg-orange-50 px-2 py-1 text-orange-700">
                  期限: {new Date(item.expiry_date).toLocaleDateString("ja-JP")}
                  {item.expiry_type === "use_by" ? " (消費期限)" : " (賞味期限)"}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-300 bg-white px-4 py-2 text-center text-black">
            <div className="text-[11px] text-black">在庫</div>
            <div className="text-2xl font-extrabold text-black">{item.stock || 0}</div>
          </div>
        </div>

        {/* 共有物の場合は借りる/返すボタン */}
        {isShared ? (
          <div className="mt-5 rounded-3xl border border-gray-300 bg-white p-4 text-black">
            <div className="text-sm font-semibold text-black">貸出 / 返却</div>
            <div className="mt-2 space-y-2">
              <div>
                <div className="mb-1 text-xs text-gray-600">ステータス</div>
                <div className="text-sm text-black">
                  {item.status === "borrowed" ? (
                    <span className="text-red-600">
                      貸出中: {item.borrowed_by || "不明"}
                    </span>
                  ) : item.status === "reserved" ? (
                    <span className="text-yellow-600">
                      予約中: {item.reserved_by || "不明"}
                    </span>
                  ) : (
                    <span className="text-green-600">利用可能</span>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs text-gray-600">借りる人の名前</div>
                <input
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500"
                  placeholder="名前を入力"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  disabled={item.status === "borrowed"}
                />
              </div>

              <div>
                <div className="mb-1 text-xs text-gray-600">メモ（任意）</div>
                <input
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500"
                  placeholder="メモを入力"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  className="
                    flex-1 rounded-2xl border border-gray-300 
                    bg-white px-4 py-3 text-sm text-black 
                    active:scale-[0.99]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  onClick={handleBorrow}
                  type="button"
                  disabled={item.status === "borrowed"}
                >
                  借りる
                </button>
                <button
                  className="
                    flex-1 rounded-2xl border border-gray-300 
                    bg-white px-4 py-3 text-sm text-black 
                    active:scale-[0.99]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  onClick={handleReturn}
                  type="button"
                  disabled={item.status !== "borrowed"}
                >
                  返す
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 消耗品・食品の場合は在庫数変更 */
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              className="
                inline-flex items-center justify-center gap-2 
                rounded-2xl border border-gray-300 
                bg-white px-4 py-3 text-sm text-black 
                active:scale-[0.99]
              "
              onClick={() => applyStock((item.stock || 0) - 1)}
              type="button"
            >
              <IconMinus className="h-4 w-4" />-
            </button>
            <button
              className="
                inline-flex items-center justify-center gap-2 
                rounded-2xl border border-gray-300 
                bg-white px-4 py-3 text-sm text-black 
                active:scale-[0.99]
              "
              onClick={() => applyStock((item.stock || 0) + 1)}
              type="button"
            >
              <IconPlus className="h-4 w-4" />+
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
