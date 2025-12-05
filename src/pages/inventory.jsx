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
      <div className="mb-1 text-xs text-gray-600">{label}</div>
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
  const [form, setForm] = useState({
    name: "",
    count: 0,
    location: "",
    genre: "kitchen",
  })

  const gridCols = "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"

  const openAdd = () => {
    setMode("add")
    setTarget(null)
    setForm({
      name: "",
      count: 0,
      location: "",
      genre: "kitchen",
    })
    setOpen(true)
  }

  const openEdit = (item) => {
    setMode("edit")
    setTarget(item)
    setForm({
      name: item.name,
      count: item.count,
      location: item.location,
      genre: item.genre,
    })
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
      const item = {
        id: generateId("item_"),
        name: form.name.trim(),
        count: toIntSafe(form.count, 0),
        location: form.location.trim() || "未設定",
        genre: form.genre,
        updatedAt: nowIso(),
      }
      addItem(item)
      pushToast("追加しました", "success")
      setOpen(false)
      return
    }

    if (mode === "edit" && target) {
      const next = {
        ...target,
        name: form.name.trim(),
        count: toIntSafe(form.count, 0),
        location: form.location.trim() || "未設定",
        genre: form.genre,
        updatedAt: nowIso(),
      }
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
    deleteItem(deleteId)
    pushToast("削除しました", "success")
    setConfirmOpen(false)
    setDeleteId("")
  }

  const header = useMemo(() => {
    return (
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">在庫一覧</h2>
          <div className="mt-1 text-xs text-gray-700">
            スマホは1列、PCは2〜3列表示。
          </div>
        </div>

        <button
          className="
            inline-flex items-center gap-2 rounded-2xl 
            border border-gray-300 bg-white 
            px-4 py-2 text-sm text-black 
            active:scale-[0.99]
          "
          onClick={openAdd}
          type="button"
        >
          <IconPlus className="h-4 w-4" />
          追加
        </button>
      </div>
    )
  }, [])

  return (
    <div className="pt-4">
      {/* ヘッダーカード */}
      <div className="rounded-3xl border border-gray-300 bg-white p-4">
        {header}
      </div>

      {/* 在庫カード一覧 */}
      <div className="mt-4">
        <div className={gridCols}>
          {items.map((it) => (
            <div key={it.id} className="relative">
              <ItemCard item={it} />

              {/* 編集 / 削除ボタン */}
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  className="
                    rounded-xl border border-gray-300 
                    bg-white p-2 text-black 
                    active:scale-[0.98]
                  "
                  onClick={() => openEdit(it)}
                  type="button"
                >
                  <IconEdit className="h-4 w-4" />
                </button>

                <button
                  className="
                    rounded-xl border border-gray-300 
                    bg-white p-2 text-black 
                    active:scale-[0.98]
                  "
                  onClick={() => askDelete(it.id)}
                  type="button"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="mt-6 rounded-3xl border border-gray-300 bg-white p-6 text-sm text-black">
            アイテムがありません。「追加」から登録してください。
          </div>
        )}
      </div>

      {/* 追加・編集モーダル */}
      <Modal
        open={open}
        title={mode === "add" ? "アイテム追加" : "アイテム編集"}
        onClose={() => setOpen(false)}
      >
        <form
          onSubmit={submit}
          className="space-y-3 text-black"
        >
          <Field label="name（必須）">
            <input
              className="
                w-full rounded-2xl border border-gray-300 
                bg-white px-3 py-2 text-sm text-black
              "
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </Field>

          <Field label="count（0以上の整数）">
            <input
              className="
                w-full rounded-2xl border border-gray-300 
                bg-white px-3 py-2 text-sm text-black
              "
              inputMode="numeric"
              value={form.count}
              onChange={(e) =>
                setForm((p) => ({ ...p, count: e.target.value }))
              }
            />
          </Field>

          <Field label="location">
            <input
              className="
                w-full rounded-2xl border border-gray-300 
                bg-white px-3 py-2 text-sm text-black
              "
              value={form.location}
              onChange={(e) =>
                setForm((p) => ({ ...p, location: e.target.value }))
              }
            />
          </Field>

          <Field label="genre（Discordチャンネル割り当て用）">
            <select
              className="
                w-full rounded-2xl border border-gray-300 
                bg-white px-3 py-2 text-sm text-black
              "
              value={form.genre}
              onChange={(e) =>
                setForm((p) => ({ ...p, genre: e.target.value }))
              }
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>

          <button
            className="
              w-full rounded-2xl border border-gray-300 
              bg-white px-4 py-3 text-sm font-semibold text-black 
              active:scale-[0.99]
            "
            type="submit"
          >
            保存
          </button>
        </form>
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        open={confirmOpen}
        title="削除確認"
        onClose={() => setConfirmOpen(false)}
      >
        <div className="text-sm text-black">
          このアイテムを削除しますか？（元に戻せません）
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="
              flex-1 rounded-2xl border border-gray-300 
              bg-white px-4 py-3 text-sm text-black
            "
            onClick={() => setConfirmOpen(false)}
          >
            キャンセル
          </button>

          <button
            className="
              flex-1 rounded-2xl border border-red-900/60 
              bg-red-100 px-4 py-3 text-sm text-red-700
            "
            onClick={doDelete}
          >
            削除
          </button>
        </div>
      </Modal>
    </div>
  )
}
