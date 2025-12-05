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
// このページの責務: 画像アップロードで item 画面へ遷移する（手入力fallbackも維持）
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { IconCameraOff } from "../components/Icons.jsx"
import { parseQrValue } from "../lib/utils.js"
import { useToast } from "../components/Toast.jsx"

export default function Scan() {
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const [status, setStatus] = useState("init")
  const [manual, setManual] = useState("")
  const [error, setError] = useState("")
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileChange = (e) => {
    setError("")
    const f = e.target.files?.[0] || null
    setFile(f)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (f) {
      setPreviewUrl(URL.createObjectURL(f))
    }
  }

  const uploadImage = async () => {
    setError("")
    if (!file) {
      pushToast("画像を選択してください", "danger")
      return
    }
    setStatus("uploading")
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch("http://localhost:5000/parse-image", {
        method: "POST",
        body: fd
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Server error")
      }
      const json = await res.json()
      const id = json?.id
      if (id) {
        pushToast("画像送信成功", "success")
        navigate(`/item/${encodeURIComponent(id)}`, { replace: true })
      } else {
        throw new Error("IDが返却されませんでした")
      }
    } catch (err) {
      console.error(err)
      setError("画像送信中にエラーが発生しました")
      setStatus("error")
    }
  }

  const submitManual = (e) => {
    e.preventDefault()
    const id = parseQrValue(manual)
    if (!id) {
      pushToast("IDを入力してください", "danger")
      return
    }
    navigate(`/item/${encodeURIComponent(id)}`)
  }

  return (
    <div className="pt-4">
      <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">画像アップロード</h2>
            <p className="mt-1 text-xs text-zinc-500">画像をアップロードして中のQRや画像からIDを抽出します。手入力での遷移も可能です。</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-900 bg-black">
          {previewUrl ? (
            <img src={previewUrl} alt="preview" className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <IconCameraOff className="h-10 w-10 text-zinc-500" />
              <div className="text-sm font-semibold text-zinc-100">画像を選択してください</div>
              <div className="text-xs text-zinc-500">アップロード後、サーバで解析して自動で遷移します。</div>
            </div>
          )}
        </div>

        {error ? <div className="mt-3 text-xs text-red-300">{error}</div> : null}

        <div className="mt-4 flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload-input"
          />
          <label htmlFor="image-upload-input" className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 text-center cursor-pointer">
            {file ? file.name : "画像を選択（またはドラッグ＆ドロップ）"}
          </label>
          <button
            className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-100 active:scale-[0.99]"
            type="button"
            onClick={uploadImage}
          >
            {status === "uploading" ? "送信中..." : "送信"}
          </button>
        </div>

        <form onSubmit={submitManual} className="mt-4 flex gap-2">
          <input
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            placeholder="手入力（例: item_... / item:xxx / URL）"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-100 active:scale-[0.99]" type="submit">
            開く
          </button>
        </form>

        <div className="mt-4 text-[11px] text-zinc-500">
          ヒント: 本番はQRの中身を <span className="text-zinc-300">/item/:id</span> のURLにすると運用が楽です。
        </div>
      </div>
    </div>
  )
}
