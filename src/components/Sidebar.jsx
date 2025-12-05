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
import { NavLink } from "react-router-dom"
import { IconScan, IconBox, IconChat } from "./Icons.jsx"

function LinkItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition",
          isActive
            ? "border-zinc-700 bg-zinc-900 text-zinc-100"
            : "border-zinc-900 bg-zinc-950 text-zinc-300 hover:border-zinc-800 hover:bg-zinc-900/50"
        ].join(" ")
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside className="sticky top-[66px] hidden h-[calc(100vh-76px)] w-[220px] shrink-0 md:block">
      <div className="flex flex-col gap-2 pt-4">
        <LinkItem to="/scan" icon={IconScan} label="スキャン" />
        <LinkItem to="/inventory" icon={IconBox} label="在庫" />
        <LinkItem to="/chat" icon={IconChat} label="チャット" />
      </div>
    </aside>
  )
}
