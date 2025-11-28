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
// このページの責務: QRを読み取り item 画面へ遷移する（非対応時は手入力fallback）
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { IconCameraOff } from "../components/Icons.jsx"
import { parseQrValue } from "../lib/utils.js"
import { useToast } from "../components/Toast.jsx"

export default function Scan() {
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const [status, setStatus] = useState("init")
  const [manual, setManual] = useState("")
  const [error, setError] = useState("")

  const supported = useMemo(() => typeof window.BarcodeDetector !== "undefined", [])

  const stopCamera = () => {
    // カメラ停止
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    const s = streamRef.current
    if (s) s.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  const startScan = async () => {
    setError("")
    if (!supported) {
      setStatus("fallback")
      return
    }

    try {
      setStatus("starting")
      // QR開始（カメラ起動）
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus("scanning")

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] })

      const tick = async () => {
        if (!videoRef.current) return
        try {
          const video = videoRef.current
          if (video.readyState >= 2) {
            const bitmap = await createImageBitmap(video)
            const codes = await detector.detect(bitmap)
            bitmap.close()
            if (codes && codes.length > 0) {
              const raw = codes[0]?.rawValue || ""
              const id = parseQrValue(raw)
              if (id) {
                stopCamera()
                setStatus("success")
                pushToast("読み取り成功", "success")
                navigate(`/item/${encodeURIComponent(id)}`, { replace: true })
                return
              }
            }
          }
        } catch {
          setError("読み取りでエラーが発生しました")
          setStatus("fallback")
          stopCamera()
          return
        }
        // 読み取りループ
        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    } catch {
      // 権限拒否またはエラー → fallback
      setError("カメラ権限が拒否されたか、起動できませんでした")
      setStatus("fallback")
      stopCamera()
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
            <h2 className="text-base font-semibold text-zinc-100">QRスキャン</h2>
            <p className="mt-1 text-xs text-zinc-500">対応ブラウザではカメラでQRを読み取ります。非対応/拒否時は手入力に切り替えます。</p>
          </div>
          <button
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-100 active:scale-[0.99]"
            onClick={startScan}
            type="button"
          >
            スキャン開始
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-900 bg-black">
          {status === "fallback" ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <IconCameraOff className="h-10 w-10 text-zinc-500" />
              <div className="text-sm font-semibold text-zinc-100">手入力モード</div>
              <div className="text-xs text-zinc-500">BarcodeDetector非対応、またはカメラ起動に失敗しました。</div>
            </div>
          ) : (
            <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
          )}
        </div>

        {error ? <div className="mt-3 text-xs text-red-300">{error}</div> : null}

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
