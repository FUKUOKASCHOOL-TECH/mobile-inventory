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
import { useToast } from "../components/Toast.jsx"

export default function Scan() {
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const [error, setError] = useState("")
  const [files, setFiles] = useState([]) // 複数ファイル
  const [previewUrl, setPreviewUrl] = useState(null) // 最初のプレビュー表示用
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileChange = (e) => {
    setError("")
    setFiles(Array.from(e.target.files || []))
    const first = e.target.files?.[0] || null
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (first) {
      setPreviewUrl(URL.createObjectURL(first))
    }
  }

  // ユーティリティ: 指定ミリ秒だけ待つ
  const delay = (ms) => new Promise((res) => setTimeout(res, ms))

  // バッチ処理関数: 1ファイルずつ /transcribe-image に送信し、各処理の間に90秒(90000ms)待つ
  const processBatch = async () => {
    setError("")
    if (!files || files.length === 0) {
      pushToast("画像を選択してください", "danger")
      return
    }

    setProcessing(true)
    setProgress({ current: 0, total: files.length })

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress({ current: i + 1, total: files.length })
        pushToast(`処理開始 ${i + 1}/${files.length}: ${file.name}`, "info")

        try {
          const fd = new FormData()
          fd.append("image", file)
          const res = await fetch("http://localhost:5000/transcribe-image", {
            method: "POST",
            body: fd
          })

          const text = await res.text().catch(() => "")

          if (!res.ok) {
            let json = null
            try { json = JSON.parse(text) } catch (e) { /* ignore */ }
            const serverMsg = json?.error ? `${json.error}${json?.detail?.message ? `: ${json.detail.message}` : ""}` : (text || `HTTP ${res.status}`)
            pushToast(`処理失敗 (${i + 1}): ${serverMsg}`, "danger")
            console.error("transcribe error detail:", json || text)
          } else {
            // 正常応答 — サーバ側で JSON を保存している想定
            pushToast(`処理完了 ${i + 1}/${files.length}`, "success")
          }
        } catch (err) {
          console.error("transcribe fetch error:", err)
          pushToast(`通信エラー (${i + 1}): ${err.message}`, "danger")
        }

        // 最後以外は90秒待つ
        if (i < files.length - 1) {
          // ユーザに分かりやすいように小さなトースト
          pushToast("次のファイルは90秒後に処理されます", "info")
          await delay(90000)
        }
      }
    } finally {
      setProcessing(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  return (
    <div className="pt-4">
      <div className="rounded-3xl border border-gray-300 bg-white p-4 text-black">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">画像アップロード</h2>
            <p className="mt-1 text-xs text-zinc-500">複数のレシート画像を選択して順次サーバで解析します。一回の処理ごとに90秒の間隔をおきます。</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-900 bg-black">
          {previewUrl ? (
            <img src={previewUrl} alt="preview" className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <IconCameraOff className="h-10 w-10 text-zinc-500" />
              <div className="text-sm font-semibold text-zinc-100">画像を選択してください</div>
              <div className="text-xs text-zinc-500">選択した画像は順に解析されます。</div>
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-3 text-xs text-red-300">{error}</div>
        ) : null}

        <div className="mt-4 flex gap-2 items-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload-input"
            multiple
          />
          <label htmlFor="image-upload-input" className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 text-center cursor-pointer">
            {files && files.length > 0 ? `${files.length} ファイルを選択: ${files[0].name}` : "画像を選択（複数選択可）"}
          </label>

          <button
            className="shrink-0 rounded-2xl border border-zinc-800 bg-blue-700/80 px-4 py-2 text-sm text-white active:scale-[0.99]"
            type="button"
            onClick={processBatch}
            disabled={processing}
          >
            {processing ? `処理中 ${progress.current}/${progress.total}` : "一括処理を開始"}
          </button>
        </div>

        {files && files.length > 1 ? (
          <div className="mt-3 text-xs text-zinc-500">
            選択ファイル:
            <ul className="list-disc ml-5">
              {files.map((f, idx) => (
                <li key={idx} className="text-xs">{f.name}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 text-[11px] text-black">
          ヒント: サーバは各ファイルごとに解析して `outputs/jsons` に JSON を保存します。
        </div>
      </div>
    </div>
  )
}
