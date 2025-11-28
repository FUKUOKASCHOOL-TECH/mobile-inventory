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

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => ["flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs", isActive ? "text-zinc-100" : "text-zinc-400"].join(" ")}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  )
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl px-2">
        <NavItem to="/scan" icon={IconScan} label="スキャン" />
        <NavItem to="/inventory" icon={IconBox} label="在庫" />
        <NavItem to="/chat" icon={IconChat} label="チャット" />
      </div>
    </nav>
  )
}
