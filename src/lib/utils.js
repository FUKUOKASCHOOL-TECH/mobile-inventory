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
export function nowIso() {
  return new Date().toISOString()
}

export function generateId(prefix = "") {
  const rand = Math.random().toString(16).slice(2)
  return prefix + Date.now().toString(16) + "_" + rand
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function toIntSafe(v, fallback = 0) {
  const n = Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : fallback
}

export function badgeByGenre(genre) {
  const g = String(genre || "").toLowerCase()
  if (g === "kitchen") return { label: "kitchen", className: "border-amber-900/50 bg-amber-950/30 text-amber-200" }
  if (g === "bath") return { label: "bath", className: "border-sky-900/50 bg-sky-950/30 text-sky-200" }
  if (g === "consumable") return { label: "consumable", className: "border-emerald-900/50 bg-emerald-950/30 text-emerald-200" }
  if (g === "tool") return { label: "tool", className: "border-violet-900/50 bg-violet-950/30 text-violet-200" }
  return { label: g || "other", className: "border-zinc-800 bg-zinc-900/40 text-zinc-200" }
}

export function parseQrValue(raw) {
  const v = String(raw || "").trim()
  if (!v) return null
  try {
    const url = new URL(v)
    const m = url.pathname.match(/\/item\/(.+)$/)
    if (m) return decodeURIComponent(m[1])
    const p = url.searchParams.get("id")
    if (p) return p
  } catch {}
  if (v.startsWith("item:")) return v.slice(5).trim() || null
  return v
}

export function genreToDiscordChannelKey(genre) {
  const g = String(genre || "").toLowerCase()
  if (g === "kitchen") return "kitchen"
  if (g === "bath") return "bath"
  if (g === "consumable") return "consumable"
  if (g === "tool") return "tool"
  return "other"
}

export function dispatchToast(message, variant = "default") {
  window.dispatchEvent(new CustomEvent("sh-toast", { detail: { message, variant } }))
}
