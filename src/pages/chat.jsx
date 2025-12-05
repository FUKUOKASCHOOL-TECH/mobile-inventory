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

import React, { useMemo, useState } from "react"
import { useChat } from "../hooks/useChat.js"
import { useSession } from "../hooks/useSession.js"
import { generateId, nowIso } from "../lib/utils.js"
import { deleteChatMessage, updateChatMessage } from "../lib/storage.js"
import { useToast } from "../components/Toast.jsx"
import { IconTrash, IconEdit } from "../components/Icons.jsx"

const GENRE_TABS = [
  { key: "all", label: "全体連絡" },
  { key: "kitchen", label: "キッチン" },
  { key: "bath", label: "バスルーム" },
  { key: "consumable", label: "消耗品" },
  { key: "tool", label: "ツール" },
  { key: "other", label: "その他" }
]

function Bubble({ msg, mine, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(msg.text)

  // system メッセージからチャンネルタグを取り除く
  const displayText =
    msg.type === "system"
      ? msg.text.replace(/^\[channel_[^\]]+\]\s*/, "")
      : msg.text

  const handleEditSubmit = () => {
    if (editText.trim()) {
      onEdit(msg.id, editText.trim())
      setIsEditing(false)
    }
  }

  const handleEditCancel = () => {
    setEditText(msg.text)
    setIsEditing(false)
  }

  return (
    <div className={`flex gap-2 items-end ${mine ? "justify-end" : "justify-start"}`}>
      {/* 編集・削除は自分のメッセージだけ */}
      {mine && !isEditing && (
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 bg-white text-black active:scale-[0.95]"
            title="編集"
            type="button"
          >
            <IconEdit className="h-3 w-3" />
          </button>

          <button
            onClick={() => {
              if (window.confirm("本当に削除しますか？")) onDelete(msg.id)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 bg-white text-black hover:text-red-500 active:scale-[0.95]"
            title="削除"
            type="button"
          >
            <IconTrash className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* 吹き出し */}
      <div
        className={[
          "max-w-[85%] rounded-3xl border px-4 py-3 text-sm leading-relaxed",
          "border-gray-300 bg-white text-black"
        ].join(" ")}
      >
        {/* 編集モード */}
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-2 py-1.5 text-sm text-black"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleEditSubmit}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-2 py-1 text-xs text-black active:scale-[0.95]"
                type="button"
              >
                保存
              </button>
              <button
                onClick={handleEditCancel}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-2 py-1 text-xs text-black active:scale-[0.95]"
                type="button"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 通常表示 */}
            <div className="whitespace-pre-wrap break-words">{displayText}</div>

            {/* 編集済み表示 */}
            {msg.edited && (
              <div className="mt-1 text-[10px] opacity-60 text-black">
                編集済み {new Date(msg.editedAt).toLocaleString("ja-JP")}
              </div>
            )}

            <div className="mt-2 text-[11px] opacity-70 text-black">
              {new Date(msg.at).toLocaleString("ja-JP")}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Chat() {
  const { messages, send } = useChat()
  const { session } = useSession()
  const { pushToast } = useToast()
  const [text, setText] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // タブによるフィルタ
  const filteredMessages = useMemo(() => {
    if (activeTab === "all") {
      return messages.filter((m) => m.type === "user")
    }
    return messages.filter((m) => {
      if (m.type !== "system" || !m.payload) return false
      return String(m.payload.genre || "").toLowerCase() === activeTab
    })
  }, [messages, activeTab])

  const ordered = useMemo(() => [...filteredMessages].reverse(), [filteredMessages])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) {
      pushToast("メッセージを入力してください", "danger")
      return
    }
    const msg = {
      id: generateId("msg_"),
      type: "user",
      text: text.trim(),
      at: nowIso(),
      userName: session?.userName || "unknown",
      edited: false
    }
    send(msg)
    setText("")
  }

  const handleDelete = (id) => {
    deleteChatMessage(id)
    pushToast("メッセージを削除しました", "success")
  }

  const handleEdit = (id, txt) => {
    updateChatMessage(id, txt)
    pushToast("メッセージを編集しました", "success")
  }

  return (
    <div className="pt-4">
      <div className="mx-auto w-full max-w-3xl">

        {/* タイトルカード */}
        <div className="rounded-3xl border border-gray-300 bg-white p-4 text-black">
          <div className="text-base font-semibold">チャット</div>
          <div className="mt-1 text-xs">自動投稿: lend / return / stock_zero（Discord通知モック）</div>
        </div>

        {/* タブ */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {GENRE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={[
                "shrink-0 rounded-2xl border px-4 py-2 text-sm font-medium",
                activeTab === t.key
                  ? "border-gray-400 bg-white text-black"
                  : "border-gray-300 bg-white text-black opacity-70"
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* メッセージ一覧 */}
        <div className="mt-3 rounded-3xl border border-gray-300 bg-white p-4">
          <div className="flex flex-col gap-3">
            {ordered.map((m) => (
              <Bubble
                key={m.id}
                msg={m}
                mine={m.type === "user" && m.userName === (session?.userName || "")}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
            {ordered.length === 0 && (
              <div className="text-sm text-black opacity-70">
                まだメッセージがありません。
              </div>
            )}
          </div>
        </div>

        {/* 入力欄 */}
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-3 text-sm text-black placeholder:text-gray-400"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="メッセージを入力"
          />
          <button
            type="submit"
            className="shrink-0 rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm text-black active:scale-[0.99]"
          >
            送信
          </button>
        </form>

      </div>
    </div>
  )
}
