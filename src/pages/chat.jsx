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
// このページの責務: アプリ内チャット表示と送信（通知モックの自動投稿もここで確認できる）
import React, { useMemo, useState } from "react"
import { useChat } from "../hooks/useChat.js"
import { useSession } from "../hooks/useSession.js"
import { generateId, nowIso, genreToDiscordChannelKey } from "../lib/utils.js"
import { useToast } from "../components/Toast.jsx"
import { deleteChatMessage, updateChatMessage } from "../lib/storage.js"
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

  // system メッセージの "[channel_xxx] " を削除して表示用に加工
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
    <div className={["flex gap-2 items-end", mine ? "justify-end" : "justify-start"].join(" ")}>
      {/* 削除・編集ボタン（自分のメッセージのみ） */}
      {mine && !isEditing && (
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 active:scale-[0.95]"
            title="編集"
            type="button"
          >
            <IconEdit className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              const ok = window.confirm("本当に削除しますか？")
              if (ok) onDelete(msg.id)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-red-400 active:scale-[0.95]"
            title="削除"
            type="button"
          >
            <IconTrash className="h-3 w-3" />
          </button>
        </div>
      )}

      <div
        className={[
          "max-w-[85%] rounded-3xl border px-4 py-3 text-sm leading-relaxed",
          mine
            ? "border-zinc-700 bg-zinc-900/60 text-zinc-100"
            : msg.type === "system"
            ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-100"
            : "border-zinc-900 bg-zinc-950 text-zinc-200"
        ].join(" ")}
      >
        {isEditing ? (
          // 編集モード
          <div className="space-y-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleEditSubmit}
                className="flex-1 rounded-lg border border-emerald-800 bg-emerald-950/50 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-950 active:scale-[0.95]"
                type="button"
              >
                保存
              </button>
              <button
                onClick={handleEditCancel}
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900 active:scale-[0.95]"
                type="button"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          // 表示モード
          <>
            <div className="whitespace-pre-wrap break-words">
              {displayText}
            </div>
            {msg.edited && (
              <div className="mt-1 text-[10px] opacity-60">
                編集済み {new Date(msg.editedAt).toLocaleString("ja-JP")}
              </div>
            )}
            <div className="mt-2 text-[11px] opacity-70">
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

  // アクティブタブに応じてメッセージをフィルタ
  const filteredMessages = useMemo(() => {
    // 全体タブ：通常チャット（user メッセージ）だけを表示
    if (activeTab === "all") {
      return messages.filter((msg) => msg.type === "user")
    }

    // その他のタブ：system メッセージのみをジャンルでフィルタ
    return messages.filter((msg) => {
      if (msg.type !== "system" || !msg.payload) return false
      const msgGenre = String(msg.payload.genre || "other").toLowerCase()
      return msgGenre === activeTab
    })
  }, [messages, activeTab])

  const ordered = useMemo(() => [...filteredMessages].reverse(), [filteredMessages])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) {
      pushToast("メッセージを入力してください", "danger")
      return
    }
    const msg = { id: generateId("msg_"), type: "user", text: text.trim(), at: nowIso(), userName: session?.userName || "unknown", edited: false }
    // localStorage同期
    send(msg)
    setText("")
  }

  const handleDelete = (msgId) => {
    deleteChatMessage(msgId)
    pushToast("メッセージを削除しました", "success")
  }

  const handleEdit = (msgId, newText) => {
    updateChatMessage(msgId, newText)
    pushToast("メッセージを編集しました", "success")
  }

  return (
    <div className="pt-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
          <div className="text-base font-semibold text-zinc-100">チャット</div>
          <div className="mt-1 text-xs text-zinc-500">ジャンル別タブでコミュニケーションができます。</div>
        </div>

        {/* タブボタン */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {GENRE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                "shrink-0 rounded-2xl border px-4 py-2 text-sm font-medium transition",
                activeTab === tab.key
                  ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50"
              ].join(" ")}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
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
            {ordered.length === 0 ? <div className="text-sm text-zinc-500">このタブにメッセージはありません。</div> : null}
          </div>
        </div>

        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-600"
            placeholder="メッセージを入力"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-3 text-sm text-zinc-100 active:scale-[0.99]" type="submit">
            送信
          </button>
        </form>
      </div>
    </div>
  )
}