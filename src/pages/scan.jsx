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
// 追加: 画像をサーバへ送り文字起こし（OCR + optional GenAI 整形）を行う
import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { IconCameraOff } from "../components/Icons.jsx"
import { parseQrValue } from "../lib/utils.js"
import { useToast } from "../components/Toast.jsx"
const SERVER_URL = import.meta.env.VITE_SERVER_URL

export default function Scan() {
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const [status, setStatus] = useState("init")
  const [manual, setManual] = useState("")
  const [error, setError] = useState("")
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [transcribedText, setTranscribedText] = useState(null)
  const [transcribing, setTranscribing] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileChange = (e) => {
    setError("")
    setTranscribedText(null)
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
      const res = await fetch(`${SERVER_URL}/parse-image`, {
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

  // 新規: 文字起こし処理を呼ぶ
  const transcribeImage = async () => {
    setError("");
    setTranscribedText(null);
    if (!file) {
      pushToast("画像を選択してください", "danger");
      return;
    }
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${SERVER_URL}/transcribe`, {
        method: "POST",
        body: fd
      });
      const text = await res.text();
      // HTTPエラー時は可能なら JSON をパースして詳細を抽出
      if (!res.ok) {
        let json = null;
        try { json = JSON.parse(text); } catch(e) { /* not json */ }
        const serverMsg =
          json?.error + (json?.detail?.message ? `: ${json.detail.message}` : "") ||
          text || `HTTP ${res.status}`;
        setError(serverMsg);
        // 詳細表示用に full JSON を保持する場合は state に入れる
        console.error("transcribe error detail:", json || text);
        return;
      }

      const json = JSON.parse(text);
      // 新サーバは { text, parsed } を返す想定
      const aiText = json?.parsed ? JSON.stringify(json.parsed, null, 2) : json?.text;
      if (aiText) {
        setTranscribedText(aiText);
        pushToast("文字起こし完了", "success");
      } else {
        setError("文字起こしは成功しましたが結果が見つかりませんでした");
      }
    } catch (err) {
      // fetch/network エラーなど
      console.error("transcribe fetch error:", err);
      setError(`通信エラー: ${err.message}`);
    } finally {
      setTranscribing(false);
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
      <div className="rounded-3xl border border-gray-300 bg-white p-4 text-black">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-black">画像アップロード</h2>
            <p className="mt-1 text-xs text-black">画像をアップロードして中のQRや画像からIDを抽出します。手入力での遷移も可能です。</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-900 bg-black">
          {previewUrl ? (
            <img src={previewUrl} alt="preview" className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <IconCameraOff className="h-10 w-10 text-zinc-500" />
              <div className="text-sm font-semibold text-zinc-100">画像を選択してください</div>
              <div className="text-xs text-zinc-300">アップロード後、サーバで解析して自動で遷移します。</div>
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-3 text-xs text-red-300">
            {error}
            {/* 開発時に詳細 JSON を出したいならここに追加で表示 */}
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload-input"
          />
          <label htmlFor="image-upload-input" className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 text-center cursor-pointer">
            {file ? file.name : "画像を選択（またはドラッグ＆ドロップ）"}
          </label>

          {/* 追加: 文字起こしボタン */}
          <button
            className="shrink-0 rounded-2xl border border-zinc-800 bg-blue-700/80 px-4 py-2 text-sm text-white active:scale-[0.99]"
            type="button"
            onClick={transcribeImage}
            disabled={transcribing}
          >
            {transcribing ? "文字起こし中..." : "文字起こし"}
          </button>
        </div>

        <form onSubmit={submitManual} className="mt-4 flex gap-2">
          <input
            className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500"
            placeholder="手入力（例: item_... / item:xxx / URL）"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button className="shrink-0 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm text-black active:scale-[0.99]" type="submit">
            開く
          </button>
        </form>


        {/* 文字起こし結果表示 */}
        {transcribedText ? (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100">
            <div className="font-semibold mb-2">文字起こし結果</div>
            <pre className="whitespace-pre-wrap text-xs">{transcribedText}</pre>
          </div>
        ) : null}
      </div>
    </div>
  )
}
