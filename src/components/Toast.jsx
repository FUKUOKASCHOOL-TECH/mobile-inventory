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
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { generateId } from "../lib/utils.js"

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const pushToast = useCallback((message, variant = "default") => {
    const id = generateId("t_")
    const toast = { id, message, variant, at: Date.now() }
    setToasts((prev) => [toast, ...prev].slice(0, 5))

    const t = window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
      timersRef.current.delete(id)
    }, 3000)
    timersRef.current.set(id, t)
  }, [])

  const removeToast = useCallback((id) => {
    const t = timersRef.current.get(id)
    if (t) window.clearTimeout(t)
    timersRef.current.delete(id)
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  useEffect(() => {
    const onToast = (e) => {
      const detail = e?.detail || {}
      if (typeof detail.message === "string") pushToast(detail.message, detail.variant || "default")
    }
    window.addEventListener("sh-toast", onToast)
    return () => window.removeEventListener("sh-toast", onToast)
  }, [pushToast])

  const value = useMemo(() => ({ toasts, pushToast, removeToast }), [toasts, pushToast, removeToast])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("ToastProviderが必要です")
  return ctx
}

export function ToastViewport() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          className={[
            "pointer-events-auto rounded-2xl border px-4 py-3 text-left shadow-lg transition active:scale-[0.98]",
            t.variant === "danger"
              ? "border-red-900/60 bg-red-950/70 text-red-50"
              : t.variant === "success"
              ? "border-emerald-900/60 bg-emerald-950/60 text-emerald-50"
              : "border-zinc-800 bg-zinc-950/80 text-zinc-100"
          ].join(" ")}
          onClick={() => removeToast(t.id)}
          type="button"
        >
          <div className="text-sm font-semibold">{t.message}</div>
          <div className="mt-1 text-[11px] opacity-70">{new Date(t.at).toLocaleTimeString("ja-JP")}</div>
        </button>
      ))}
    </div>
  )
}
