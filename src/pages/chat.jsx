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
import { generateId, nowIso } from "../lib/utils.js"
import { useToast } from "../components/Toast.jsx"

function Bubble({ msg, mine }) {
  return (
    <div className={["flex", mine ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[85%] rounded-3xl border px-4 py-3 text-sm leading-relaxed",
          mine ? "border-zinc-700 bg-zinc-900/60 text-zinc-100" : msg.type === "system" ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-100" : "border-zinc-900 bg-zinc-950 text-zinc-200"
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap break-words">{msg.text}</div>
        <div className="mt-2 text-[11px] opacity-70">{new Date(msg.at).toLocaleString("ja-JP")}</div>
      </div>
    </div>
  )
}

export default function Chat() {
  const { messages, send } = useChat()
  const { session } = useSession()
  const { pushToast } = useToast()
  const [text, setText] = useState("")

  const ordered = useMemo(() => [...messages].reverse(), [messages])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) {
      pushToast("メッセージを入力してください", "danger")
      return
    }
    const msg = { id: generateId("msg_"), type: "user", text: text.trim(), at: nowIso(), userName: session?.userName || "unknown" }
    // localStorage同期
    send(msg)
    setText("")
  }

  return (
    <div className="pt-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
          <div className="text-base font-semibold text-zinc-100">チャット</div>
          <div className="mt-1 text-xs text-zinc-500">自動投稿: lend / return / stock_zero（Discord通知モック）</div>
        </div>

        <div className="mt-3 rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
          <div className="flex flex-col gap-3">
            {ordered.map((m) => (
              <Bubble key={m.id} msg={m} mine={m.type === "user" && m.userName === (session?.userName || "")} />
            ))}
            {ordered.length === 0 ? <div className="text-sm text-zinc-500">まだメッセージがありません。</div> : null}
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
