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
    <Link
      to={`/item/${encodeURIComponent(item.id)}`}
      className="
        group block rounded-3xl
        border border-gray-300
        bg-white
        p-4
        shadow-sm
        transition
        hover:shadow-md
        hover:border-gray-400
      "
    >
      <div className="flex items-start justify-between gap-3">
        {/* 左側（名前 + 場所） */}
        <div>
          <div className="text-base font-semibold text-gray-900">
            {item.name}
          </div>
          <div className="mt-1 text-xs text-gray-600">{item.location}</div>
        </div>

        {/* 右側（ジャンルバッジ + 個数） */}
        <div className="flex flex-col items-end gap-2">
          <span
            className={`
              rounded-full border px-2 py-1 text-[11px]
              ${badge.className}
            `}
          >
            {badge.label}
          </span>

          <div
            className="
              rounded-2xl
              border border-gray-300
              bg-white
              px-3 py-1
              text-sm text-gray-900
            "
          >
            {item.count}
          </div>
        </div>
      </div>

      {/* 更新日時 */}
      <div className="mt-3 text-[11px] text-gray-500">
        更新: {new Date(item.updatedAt).toLocaleString("ja-JP")}
      </div>
    </Link>
  )
}
