/**
@typedef {Object} InventoryItem
@property {string} id
@property {string} name
@property {number} stock
@property {string} location
@property {string} item_type // 'consumable' | 'food' | 'shared'
@property {Array} tags
@property {string} expiry_date
@property {string} expiry_type
*/

// このページの責務: 在庫の一覧・追加/編集/削除を行える管理UIを提供する
import React, { useMemo, useState } from "react"
import ItemCard from "../components/ItemCard.jsx"
import Modal from "../components/Modal.jsx"
import { IconEdit, IconPlus, IconTrash } from "../components/Icons.jsx"
import { useInventory } from "../hooks/useInventory.js"
import { useTags } from "../hooks/useTags.js"
import { toIntSafe } from "../lib/utils.js"
import { useToast } from "../components/Toast.jsx"

const ITEM_TYPES = [
  { value: "consumable", label: "消耗品" },
  { value: "food", label: "食品" },
  { value: "shared", label: "共有物" },
]

const EXPIRY_TYPES = [
  { value: "best_before", label: "賞味期限" },
  { value: "use_by", label: "消費期限" },
]

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-gray-600">{label}</div>
      {children}
    </label>
  )
}

export default function Inventory() {
  const [selectedTagId, setSelectedTagId] = useState(null)
  const { items, addItem, updateItem, deleteItem, loading, refreshItems } = useInventory(
    selectedTagId ? { tagId: selectedTagId } : {}
  )
  const { tags, addTag, loading: tagsLoading } = useTags()
  const { pushToast } = useToast()
  const [open, setOpen] = useState(false)
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [mode, setMode] = useState("add")
  const [target, setTarget] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState("")
  const [form, setForm] = useState({
    name: "",
    stock: 1,
    location: "",
    item_type: "consumable",
    tagIds: [],
    expiry_date: "",
    expiry_type: "best_before",
  })

  const gridCols = "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"

  const openAdd = () => {
    setMode("add")
    setTarget(null)
    setForm({
      name: "",
      stock: 1,
      location: "",
      item_type: "consumable",
      tagIds: tags.length > 0 ? [String(tags[0].id)] : [],
      expiry_date: "",
      expiry_type: "best_before",
    })
    setOpen(true)
  }

  const openEdit = (item) => {
    setMode("edit")
    setTarget(item)
    setForm({
      name: item.name || "",
      stock: item.stock || 1,
      location: item.location || "",
      item_type: item.item_type || "consumable",
      tagIds: item.tags && item.tags.length > 0 ? item.tags.map(tag => String(tag.id)) : [],
      expiry_date: item.expiry_date || "",
      expiry_type: item.expiry_type || "best_before",
    })
    setOpen(true)
  }

  const validate = () => {
    if (!form.name.trim()) {
      pushToast("名前は必須です", "danger")
      return false
    }
    const n = toIntSafe(form.stock, 0)
    if (n < 1 || !Number.isInteger(n)) {
      pushToast("在庫数は1以上の整数です", "danger")
      return false
    }
    if (!form.tagIds || form.tagIds.length === 0) {
      pushToast("ジャンルを1つ以上選択してください", "danger")
      return false
    }
    if (form.item_type === "food" && !form.expiry_date) {
      pushToast("食品の場合は期限を入力してください", "danger")
      return false
    }
    return true
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const itemData = {
      name: form.name.trim(),
      stock: toIntSafe(form.stock, 1),
      location: form.location.trim() || "",
      item_type: form.item_type,
      tags: form.tagIds && form.tagIds.length > 0 ? form.tagIds.map(id => Number.parseInt(id, 10)) : [],
      expiry_date: form.item_type === "food" ? form.expiry_date : null,
      expiry_type: form.item_type === "food" ? form.expiry_type : null,
      status: form.item_type === "shared" ? "available" : null,
    }

    if (mode === "add") {
      const result = await addItem(itemData)
      if (result.success) {
        setOpen(false)
        // 念のため明示的にリフレッシュ
        await refreshItems()
      }
      return
    }

    if (mode === "edit" && target) {
      const result = await updateItem({
        ...target,
        ...itemData,
        id: target.id,
      })
      if (result.success) {
        setOpen(false)
      }
    }
  }

  const handleAddTag = async (e) => {
    e.preventDefault()
    if (!newTagName.trim()) {
      pushToast("タグ名を入力してください", "danger")
      return
    }
    const result = await addTag(newTagName.trim())
    if (result.success) {
      setNewTagName("")
      setTagModalOpen(false)
      // 新しく追加したタグを選択
      if (result.data) {
        setForm((p) => ({ ...p, tagIds: [...(p.tagIds || []), String(result.data.id)] }))
      }
    }
  }

  const askDelete = (id) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  const doDelete = async () => {
    if (!deleteId) return
    const result = await deleteItem(deleteId)
    if (result.success) {
      setConfirmOpen(false)
      setDeleteId("")
    }
  }

  const handleStockChange = async (itemId, newStock) => {
    const item = items.find((it) => it.id === itemId)
    if (!item) return
    
    const updated = {
      ...item,
      stock: Math.max(0, newStock),
    }
    // 即座に更新（updateItem内でfetchItemsが呼ばれるので、追加のrefreshItemsは不要）
    await updateItem(updated)
  }

  const handleSharedAction = async () => {
    // 共有物のアクション後にアイテムリストをリフレッシュ
    await refreshItems()
  }

  const header = useMemo(() => {
    return (
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">在庫一覧</h2>
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

  // フィルターされたアイテム
  const filteredItems = useMemo(() => {
    if (!selectedTagId) return items
    return items.filter((item) =>
      item.tags?.some((tag) => tag.id === Number.parseInt(selectedTagId, 10))
    )
  }, [items, selectedTagId])

  return (
    <div className="pt-4">
      {/* ヘッダーカード */}
      <div className="rounded-3xl border border-gray-300 bg-white p-4">
        {header}

        {/* ジャンルフィルター */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            <button
              className={`
                rounded-2xl border px-3 py-1 text-xs
                ${
                  selectedTagId === null
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700"
                }
              `}
              onClick={() => setSelectedTagId(null)}
              type="button"
            >
              すべて
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                className={`
                  rounded-2xl border px-3 py-1 text-xs
                  ${
                    selectedTagId === String(tag.id)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700"
                  }
                `}
                onClick={() => setSelectedTagId(String(tag.id))}
                type="button"
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 在庫カード一覧 */}
      <div className="mt-4">
        {loading ? (
          <div className="rounded-3xl border border-gray-300 bg-white p-6 text-sm text-black">
            読み込み中...
          </div>
        ) : (
          <>
            <div className={gridCols}>
              {filteredItems.map((it) => (
                <div key={it.id} className="relative">
                  <ItemCard 
                    item={it} 
                    onStockChange={handleStockChange}
                    onSharedAction={refreshItems}
                  />

                  {/* 編集 / 削除ボタン */}
                  <div className="absolute right-2 top-2 flex gap-1.5 z-10">
                    <button
                      className="
                        rounded-lg border border-gray-300 
                        bg-white/95 backdrop-blur-sm p-1.5 text-black 
                        shadow-sm hover:bg-gray-50 hover:shadow
                        active:scale-[0.95] transition-all
                      "
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEdit(it);
                      }}
                      type="button"
                      aria-label="編集"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                    </button>

                    <button
                      className="
                        rounded-lg border border-gray-300 
                        bg-white/95 backdrop-blur-sm p-1.5 text-black 
                        shadow-sm hover:bg-gray-50 hover:shadow
                        active:scale-[0.95] transition-all
                      "
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        askDelete(it.id);
                      }}
                      type="button"
                      aria-label="削除"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="mt-6 rounded-3xl border border-gray-300 bg-white p-6 text-sm text-black">
                アイテムがありません。「追加」から登録してください。
              </div>
            )}
          </>
        )}
      </div>

      {/* 追加・編集モーダル */}
      <Modal
        open={open}
        title={mode === "add" ? "アイテム追加" : "アイテム編集"}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={submit} className="space-y-3 text-black">
          {/* ジャンル選択（最初に表示） */}
          <Field label="ジャンル（必須・複数選択可能）">
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  className="
                    rounded-2xl border border-gray-300 
                    bg-white px-3 py-2 text-xs text-black
                    active:scale-[0.98]
                  "
                  onClick={(e) => {
                    e.preventDefault()
                    setTagModalOpen(true)
                  }}
                  type="button"
                >
                  ジャンルを追加
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {tags.length === 0 ? (
                  <div className="text-xs text-gray-500">ジャンルがありません</div>
                ) : (
                  tags.map((tag) => {
                    const isSelected = form.tagIds && form.tagIds.includes(String(tag.id))
                    return (
                      <label
                        key={tag.id}
                        className="
                          flex items-center gap-2
                          rounded-xl border border-gray-300 
                          bg-white px-3 py-2 text-sm text-black
                          cursor-pointer hover:bg-gray-50
                        "
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm((p) => ({
                                ...p,
                                tagIds: [...(p.tagIds || []), String(tag.id)],
                              }))
                            } else {
                              setForm((p) => ({
                                ...p,
                                tagIds: (p.tagIds || []).filter((id) => id !== String(tag.id)),
                              }))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span>{tag.name}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </Field>

          {/* 性質選択 */}
          <Field label="性質">
            <select
              className="
                w-full rounded-2xl border border-gray-300 
                bg-white px-3 py-2 text-sm text-black
              "
              value={form.item_type}
              onChange={(e) =>
                setForm((p) => ({ ...p, item_type: e.target.value }))
              }
            >
              {ITEM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="名前（必須）">
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

          <Field label="在庫数（1以上の整数）">
            <input
              className="
                w-full rounded-2xl border border-gray-300 
                bg-white px-3 py-2 text-sm text-black
              "
              inputMode="numeric"
              type="number"
              min="1"
              value={form.stock}
              onChange={(e) =>
                setForm((p) => ({ ...p, stock: e.target.value }))
              }
            />
          </Field>

          <Field label="場所">
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

          {/* 食品の場合は期限入力 */}
          {form.item_type === "food" && (
            <>
              <Field label="期限の種類">
                <select
                  className="
                    w-full rounded-2xl border border-gray-300 
                    bg-white px-3 py-2 text-sm text-black
                  "
                  value={form.expiry_type}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expiry_type: e.target.value }))
                  }
                >
                  {EXPIRY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="期限（必須）">
                <input
                  className="
                    w-full rounded-2xl border border-gray-300 
                    bg-white px-3 py-2 text-sm text-black
                  "
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expiry_date: e.target.value }))
                  }
                />
              </Field>
            </>
          )}

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

      {/* タグ追加モーダル */}
      <Modal
        open={tagModalOpen}
        title="ジャンルを追加"
        onClose={() => {
          setTagModalOpen(false)
          setNewTagName("")
        }}
      >
        <form onSubmit={handleAddTag} className="space-y-3 text-black">
          <Field label="ジャンル名">
            <input
              className="
                w-full rounded-2xl border border-gray-300 
                bg-white px-3 py-2 text-sm text-black
              "
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="例: キッチン用品"
            />
          </Field>
          <button
            className="
              w-full rounded-2xl border border-gray-300 
              bg-white px-4 py-3 text-sm font-semibold text-black 
              active:scale-[0.99]
            "
            type="submit"
          >
            追加
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
