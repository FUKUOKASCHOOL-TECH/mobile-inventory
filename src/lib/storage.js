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
import { generateId, nowIso } from "./utils.js"

const KEY_INVENTORY = "inventory_v1"
const KEY_CHAT = "chat_v1"
const KEY_SESSION = "session_v1"
const KEY_LENDING = "lending_v1"

const STORAGE_EVENT = "sh-storage"
const listeners = new Set()

function emit(kind) {
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { kind } }))
  for (const fn of listeners) fn(kind)
}

export function onStorageEvent(kind, handler) {
  const fn = (k) => {
    if (k === kind) handler()
  }
  listeners.add(fn)
  const onEvt = (e) => {
    const k = e?.detail?.kind
    if (k === kind) handler()
  }
  window.addEventListener(STORAGE_EVENT, onEvt)
  return () => {
    listeners.delete(fn)
    window.removeEventListener(STORAGE_EVENT, onEvt)
  }
}

function safeParse(raw, fallback) {
  try {
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return safeParse(raw, fallback)
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function normalizeInventory(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((x) => x && typeof x.id === "string")
    .map((x) => ({
      id: String(x.id),
      name: String(x.name || ""),
      count: typeof x.count === "number" ? x.count : Number.parseInt(String(x.count || 0), 10) || 0,
      location: String(x.location || ""),
      genre: String(x.genre || "other"),
      updatedAt: String(x.updatedAt || nowIso())
    }))
}

function seedInventoryIfEmpty() {
  const current = safeGet(KEY_INVENTORY, null)
  if (current != null) return
  const sample = [
    { id: generateId("item_"), name: "ティッシュ", count: 2, location: "リビング棚", genre: "consumable", updatedAt: nowIso() },
    { id: generateId("item_"), name: "食器用洗剤", count: 1, location: "キッチン下", genre: "kitchen", updatedAt: nowIso() },
    { id: generateId("item_"), name: "キッチンタオル", count: 3, location: "キッチン引き出し", genre: "kitchen", updatedAt: nowIso() }
  ]
  safeSet(KEY_INVENTORY, sample)
  emit("inventory")
}

export function getInventory() {
  seedInventoryIfEmpty()
  const list = normalizeInventory(safeGet(KEY_INVENTORY, []))
  if (!Array.isArray(list)) return []
  return list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ja"))
}

export function setInventory(list) {
  const normalized = normalizeInventory(list)
  safeSet(KEY_INVENTORY, normalized)
  emit("inventory")
}

export function addItem(item) {
  const list = getInventory()
  const next = [item, ...list]
  setInventory(next)
}

export function updateItem(item) {
  const list = getInventory()
  const next = list.map((x) => (x.id === item.id ? item : x))
  setInventory(next)
}

export function deleteItem(id) {
  const list = getInventory()
  const next = list.filter((x) => x.id !== id)
  setInventory(next)
}

export function getChat() {
  const list = safeGet(KEY_CHAT, [])
  if (!Array.isArray(list)) {
    safeSet(KEY_CHAT, [])
    return []
  }
  return list
}

export function addChatMessage(msg) {
  const list = getChat()
  const next = [msg, ...list].slice(0, 300)
  safeSet(KEY_CHAT, next)
  emit("chat")
}

export function getLending() {
  const list = safeGet(KEY_LENDING, [])
  if (!Array.isArray(list)) {
    safeSet(KEY_LENDING, [])
    return []
  }
  return list
}

export function addLendingRecord(record) {
  const list = getLending()
  const next = [record, ...list].slice(0, 500)
  safeSet(KEY_LENDING, next)
  emit("lending")
}

export function getSession() {
  const v = safeGet(KEY_SESSION, null)
  if (!v || typeof v !== "object") return null
  const userName = String(v.userName || "")
  const provider = String(v.provider || "")
  if (!userName || !provider) return null
  return { userName, provider, loggedInAt: String(v.loggedInAt || nowIso()) }
}

export function setSession(data) {
  safeSet(KEY_SESSION, data)
  emit("session")
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY_SESSION)
  } catch {}
  emit("session")
}

export const StorageKeys = { KEY_INVENTORY, KEY_CHAT, KEY_SESSION, KEY_LENDING }
