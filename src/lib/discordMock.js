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

// 性質別 Webhook URL マッピング（テスト用・ローカル開発時）
// 実際のテスト用 Webhook URL を環境変数から取得、または直接ここに貼り付け
// 環境変数名:
// - VITE_WEBHOOK_ALL: 全体の通知用Webhook URL
// - VITE_WEBHOOK_FOOD: 食品の通知用Webhook URL
// - VITE_WEBHOOK_CONSUMABLE: 消耗品の通知用Webhook URL
// - VITE_WEBHOOK_SHARED: 共有物の通知用Webhook URL
const WEBHOOK_URLS = {
  all: import.meta.env.VITE_WEBHOOK_ALL || "",
  food: import.meta.env.VITE_WEBHOOK_FOOD || "",
  consumable: import.meta.env.VITE_WEBHOOK_CONSUMABLE || "",
  shared: import.meta.env.VITE_WEBHOOK_SHARED || "",
  // 後方互換性のため、旧ジャンルもサポート
  kitchen: import.meta.env.VITE_WEBHOOK_KITCHEN || "",
  bath: import.meta.env.VITE_WEBHOOK_BATH || "",
  tool: import.meta.env.VITE_WEBHOOK_TOOL || "",
  other: import.meta.env.VITE_WEBHOOK_OTHER || ""
}

function buildText(payload) {
  // item_typeまたはcategoryを使用（通知の性質を決定）
  const itemType = payload.item_type || payload.category || payload.genre || "consumable"
  if (payload.type === "stock_zero") return `${payload.itemName} の在庫がなくなりました。`
  if (payload.type === "lend" || payload.type === "lending") return `${payload.userName} さんに ${payload.itemName} を貸出しました。`
  if (payload.type === "return" || payload.type === "returned") return `${payload.userName} さんが ${payload.itemName} を返却しました。`
  return `通知: ${payload.itemName}`
}

/**
 * Discord Webhook に直接通知を送信（ローカルテスト用）
 */
async function sendToWebhook(payload) {
  try {
    // item_typeまたはcategoryを使用
    const itemType = String(payload.item_type || payload.category || payload.genre || "consumable").toLowerCase()
    // 全体の通知の場合は"all"を使用、それ以外はitem_typeを使用
    const webhookKey = itemType === "all" ? "all" : itemType
    const webhookUrl = WEBHOOK_URLS[webhookKey]

    if (!webhookUrl) {
      console.warn(`⚠️ Webhook URL not found for item_type: ${itemType}`)
      return false
    }

    const discordMessage = buildText(payload)

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: discordMessage })
    })

    if (!response.ok) {
      console.error(`❌ Discord Webhook error: ${response.status}`)
      return false
    }

    console.log("✅ Discord に通知を送信しました")
    return true
  } catch (error) {
    console.error("❌ Webhook送信エラー:", error)
    return false
  }
}

export async function sendDiscordNotification(payload) {
  // アプリ内チャットへ自動投稿
  // payloadにitem_typeまたはcategoryを含める（通知の性質を決定）
  const itemType = payload.item_type || payload.category || payload.genre || "consumable"
  const msgPayload = { ...payload, item_type: itemType, category: itemType }
  const msg = { id: generateId("msg_"), type: "system", text: buildText(payload), at: payload.timestamp || nowIso(), payload: msgPayload }
  addChatMessage(msg)

  // Webhook に直接送信（テスト用・環境変数に URL がある場合のみ）
  const hasWebhook = Object.values(WEBHOOK_URLS).some(url => url)
  if (hasWebhook) {
    const success = await sendToWebhook(payload)
    if (success) {
      dispatchToast("Discordに通知を送信しました", "success")
    } else {
      dispatchToast("Discord送信に失敗しました", "danger")
    }
  } else {
    // Webhook URL が設定されていない場合はモック表示
    dispatchToast("Discordに同期しました(モック)", "success")
  }
}

/**
 * テスト用: ブラウザコンソールから呼び出し可能
 * window.testDiscordWebhook({ type: "lend", itemName: "テスト", userName: "テスト太郎", genre: "kitchen" })
 */
window.testDiscordWebhook = sendDiscordNotification
