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

import React, { useMemo, useState, useEffect, useRef } from "react"
import { useChat } from "../hooks/useChat.js"
import { useSession } from "../hooks/useSession.js"
import { generateId, nowIso } from "../lib/utils.js"
import { deleteChatMessage, updateChatMessage } from "../lib/storage.js"
import { useToast } from "../components/Toast.jsx"
import { IconTrash, IconEdit } from "../components/Icons.jsx"

const GENRE_TABS = [
  { key: "all", label: "全体" },
  { key: "food", label: "食品" },
  { key: "consumable", label: "消耗品" },
  { key: "shared", label: "共有物" }
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
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  // タブによるフィルタ
  const filteredMessages = useMemo(() => {
    // 全体タブはすべてのメッセージを表示（システム通知とユーザーメッセージの両方）
    if (activeTab === "all") {
      return messages
    }

    // その他タブは item_type（category）によるフィルタ
    return messages.filter((m) => {
      if (m.type === "system" && m.payload) {
        // payloadにitem_typeまたはcategoryがある場合はそれを使用
        const itemType = m.payload.item_type || m.payload.category || m.payload.genre
        return String(itemType || "").toLowerCase() === activeTab
      }
      if (m.type === "user") {
        // ユーザーメッセージはitem_typeまたはgenreでフィルタ
        const itemType = m.item_type || m.category || m.genre
        return String(itemType || "").toLowerCase() === activeTab
      }
      return false
    })
  }, [messages, activeTab])


  // 最新のメッセージ順にソート（新しいものが最後）
  const sortedMessages = useMemo(() => {
    return [...filteredMessages].sort((a, b) => {
      const dateA = new Date(a.at || 0).getTime()
      const dateB = new Date(b.at || 0).getTime()
      return dateA - dateB
    })
  }, [filteredMessages])

  // 最新10件を表示（残りはスクロールで見られる）
  // 最新のメッセージを下に表示するため、時系列順（古い→新しい）
  const displayedMessages = useMemo(() => {
    const total = sortedMessages.length
    if (total <= 10) {
      return sortedMessages
    }
    return sortedMessages.slice(-10)
  }, [sortedMessages])

  // 過去のメッセージ（最新10件より前）
  const pastMessages = useMemo(() => {
    const total = sortedMessages.length
    if (total <= 10) {
      return []
    }
    return sortedMessages.slice(0, -10)
  }, [sortedMessages])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) {
      pushToast("メッセージを入力してください", "danger")
      return
    }
    // 送信時に genre を付与（全体タブは genre を付けない）
    const msg = {
      id: generateId("msg_"),
      type: "user",
      text: text.trim(),
      at: nowIso(),
      userName: session?.userName || "unknown",
      edited: false,
      genre: activeTab === "all" ? undefined : activeTab
    }
    send(msg) // [`useChat`](src/hooks/useChat.js) の send がローカルに保存する
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

  // 最新メッセージに自動スクロール
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [displayedMessages, activeTab])

  // 最新メッセージに自動スクロール
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [displayedMessages, activeTab])

  return (
    <div className="pt-4">
      <div className="mx-auto w-full max-w-3xl">

        {/* タイトルカード */}
        <div className="rounded-3xl border border-gray-300 bg-white p-4 text-black">
          <div className="text-base font-semibold">チャット</div>
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
          <div 
            ref={messagesContainerRef}
            className="max-h-[600px] overflow-y-auto flex flex-col gap-3"
          >
            {/* 過去のメッセージ（上にスクロールで見られる） */}
            {pastMessages.length > 0 && (
              <div className="text-xs text-gray-500 text-center py-2 border-b border-gray-200">
                過去のメッセージ {pastMessages.length}件（上にスクロール）
              </div>
            )}
            {pastMessages.map((m) => (
              <Bubble
                key={m.id}
                msg={m}
                mine={m.type === "user" && m.userName === (session?.userName || "")}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
            {/* 最新10件（下に表示） */}
            {displayedMessages.map((m) => (
              <Bubble
                key={m.id}
                msg={m}
                mine={m.type === "user" && m.userName === (session?.userName || "")}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
            {/* スクロール位置の基準点（最新メッセージの下） */}
            <div ref={messagesEndRef} />
            {sortedMessages.length === 0 && (
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
