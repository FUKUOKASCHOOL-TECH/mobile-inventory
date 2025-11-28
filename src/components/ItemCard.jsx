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
import React from "react"
import { Link } from "react-router-dom"
import { badgeByGenre } from "../lib/utils.js"

export default function ItemCard({ item }) {
  const badge = badgeByGenre(item.genre)

  return (
    <Link to={`/item/${encodeURIComponent(item.id)}`} className="group block rounded-3xl border border-zinc-900 bg-zinc-950 p-4 transition hover:border-zinc-800 hover:bg-zinc-900/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-zinc-100">{item.name}</div>
          <div className="mt-1 text-xs text-zinc-500">{item.location}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full border px-2 py-1 text-[11px] ${badge.className}`}>{badge.label}</span>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-sm text-zinc-100">{item.count}</div>
        </div>
      </div>
      <div className="mt-3 text-[11px] text-zinc-500">更新: {new Date(item.updatedAt).toLocaleString("ja-JP")}</div>
    </Link>
  )
}
