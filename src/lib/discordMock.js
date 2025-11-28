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
import { addChatMessage } from "./storage.js"
import { dispatchToast, genreToDiscordChannelKey, generateId, nowIso } from "./utils.js"

function buildText(payload) {
  const ch = genreToDiscordChannelKey(payload.genre)
  if (payload.type === "stock_zero") return `[${ch}] 在庫切れ: ${payload.itemName}`
  if (payload.type === "lend") return `[${ch}] ${payload.userName} が ${payload.itemName} を貸出`
  if (payload.type === "return") return `[${ch}] ${payload.userName} が ${payload.itemName} を返却`
  return `[${ch}] 通知: ${payload.itemName}`
}

export function sendDiscordNotification(payload) {
  // 将来ここで Webhook / Bot API を呼び出す
  // MVP時点ではアプリ内チャットへ自動投稿し、トースト通知を出すだけ
  const msg = { id: generateId("msg_"), type: "system", text: buildText(payload), at: payload.timestamp || nowIso(), payload }
  addChatMessage(msg)
  dispatchToast("Discordに同期しました(モック)", "success")
}
