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
// このページの責務: 在庫の一覧・追加/編集/削除を行える管理UIを提供する
import React, { useMemo, useState } from "react"
import ItemCard from "../components/ItemCard.jsx"
import Modal from "../components/Modal.jsx"
import { IconEdit, IconPlus, IconTrash } from "../components/Icons.jsx"
import { useInventory } from "../hooks/useInventory.js"
import { generateId, nowIso, toIntSafe } from "../lib/utils.js"
import { useToast } from "../components/Toast.jsx"

const GENRES = ["kitchen", "bath", "consumable", "tool", "other"]

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-zinc-500">{label}</div>
      {children}
    </label>
  )
}

export default function Inventory() {
  const { items, addItem, updateItem, deleteItem } = useInventory()
  const { pushToast } = useToast()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState("add")
  const [target, setTarget] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState("")
  const [form, setForm] = useState({ name: "", count: 0, location: "", genre: "kitchen" })

  const gridCols = "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"

  const openAdd = () => {
    setMode("add")
    setTarget(null)
    setForm({ name: "", count: 0, location: "", genre: "kitchen" })
    setOpen(true)
  }

  const openEdit = (item) => {
    setMode("edit")
    setTarget(item)
    setForm({ name: item.name, count: item.count, location: item.location, genre: item.genre })
    setOpen(true)
  }

  const validate = () => {
    if (!form.name.trim()) {
      pushToast("name は必須です", "danger")
      return false
    }
    const n = toIntSafe(form.count, 0)
    if (n < 0 || !Number.isInteger(n)) {
      pushToast("count は0以上の整数です", "danger")
      return false
    }
    return true
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return

    if (mode === "add") {
      const item = { id: generateId("item_"), name: form.name.trim(), count: toIntSafe(form.count, 0), location: form.location.trim() || "未設定", genre: form.genre, updatedAt: nowIso() }
      // localStorage同期
      addItem(item)
      pushToast("追加しました", "success")
      setOpen(false)
      return
    }

    if (mode === "edit" && target) {
      const next = { ...target, name: form.name.trim(), count: toIntSafe(form.count, 0), location: form.location.trim() || "未設定", genre: form.genre, updatedAt: nowIso() }
      // localStorage同期
      updateItem(next)
      pushToast("更新しました", "success")
      setOpen(false)
    }
  }

  const askDelete = (id) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  const doDelete = () => {
    if (!deleteId) return
    // localStorage同期
    deleteItem(deleteId)
    pushToast("削除しました", "success")
    setConfirmOpen(false)
    setDeleteId("")
  }

  const header = useMemo(() => {
    return (
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">在庫一覧</h2>
          <div className="mt-1 text-xs text-zinc-500">スマホは1列、PCは2〜3列表示。</div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-sm text-zinc-100 active:scale-[0.99]" onClick={openAdd} type="button">
          <IconPlus className="h-4 w-4" />
          追加
        </button>
      </div>
    )
  }, [])

  return (
    <div className="pt-4">
      <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-4">{header}</div>

      <div className="mt-4">
        <div className={gridCols}>
          {items.map((it) => (
            <div key={it.id} className="relative">
              <ItemCard item={it} />
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-zinc-200 backdrop-blur active:scale-[0.98]"
                  onClick={() => openEdit(it)}
                  type="button"
                  aria-label="編集"
                >
                  <IconEdit className="h-4 w-4" />
                </button>
                <button
                  className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-zinc-200 backdrop-blur active:scale-[0.98]"
                  onClick={() => askDelete(it.id)}
                  type="button"
                  aria-label="削除"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-zinc-900 bg-zinc-950 p-6 text-sm text-zinc-400">アイテムがありません。「追加」から登録してください。</div>
        ) : null}
      </div>

      <Modal open={open} title={mode === "add" ? "アイテム追加" : "アイテム編集"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label="name（必須）">
            <input className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </Field>

          <Field label="count（0以上の整数）">
            <input
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              inputMode="numeric"
              value={form.count}
              onChange={(e) => setForm((p) => ({ ...p, count: e.target.value }))}
            />
          </Field>

          <Field label="location">
            <input className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          </Field>

          <Field label="genre（Discordチャンネル割り当て用）">
            <select className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" value={form.genre} onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))}>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>

          <div className="pt-2">
            <button className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm font-semibold text-zinc-100 active:scale-[0.99]" type="submit">
              保存
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={confirmOpen} title="削除確認" onClose={() => setConfirmOpen(false)}>
        <div className="text-sm text-zinc-300">このアイテムを削除しますか？（元に戻せません）</div>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100" onClick={() => setConfirmOpen(false)} type="button">
            キャンセル
          </button>
          <button className="flex-1 rounded-2xl border border-red-900/60 bg-red-950/60 px-4 py-3 text-sm text-red-50" onClick={doDelete} type="button">
            削除
          </button>
        </div>
      </Modal>
    </div>
  )
}
