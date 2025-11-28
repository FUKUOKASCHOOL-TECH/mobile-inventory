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
// このページの責務: ログイン情報をlocalStorageに保存して /scan へ遷移する
import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useSession } from "../hooks/useSession.js"
import { nowIso, dispatchToast } from "../lib/utils.js"

function LoginButton({ label, provider, onClick }) {
  return (
    <button
      className="w-full rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/40 active:scale-[0.99]"
      onClick={onClick}
      type="button"
    >
      <div className="text-sm font-semibold text-zinc-100">{label}</div>
      <div className="mt-1 text-xs text-zinc-500">provider: {provider}</div>
    </button>
  )
}

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { set } = useSession()
  const from = location.state?.from || "/scan"

  const login = (provider) => {
    const userName = provider === "guest" ? "ゲスト" : provider === "google" ? "Googleユーザー" : "Discordユーザー"
    // localStorage同期
    set({ userName, provider, loggedInAt: nowIso() })
    dispatchToast("ログインしました", "success")
    navigate(from, { replace: true })
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-xl font-bold text-zinc-100">ログイン</h1>
        <p className="mt-2 text-sm text-zinc-400">MVPのため認証はモックです。将来はGoogle/Discord OAuthへ差し替え可能。</p>

        <div className="mt-6 space-y-3">
          <LoginButton label="Googleでログイン（モック）" provider="google" onClick={() => login("google")} />
          <LoginButton label="Discordでログイン（モック）" provider="discord" onClick={() => login("discord")} />
          <LoginButton label="ゲストで開始" provider="guest" onClick={() => login("guest")} />
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 text-xs text-zinc-400">
          <div className="font-semibold text-zinc-300">業界視点</div>
          <div className="mt-1 leading-relaxed">本番のログインは「誰が借りた/返した」を追える監査性の核。MVPはモックでフロー検証→後で認証を実装するのが鉄板。</div>
        </div>
      </div>
    </div>
  )
}
