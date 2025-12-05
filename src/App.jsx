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
import React, { useEffect, useMemo, useState } from "react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import Navbar from "./components/Navbar.jsx"
import Sidebar from "./components/Sidebar.jsx"
import BottomNav from "./components/BottomNav.jsx"
import { useSession } from "./hooks/useSession.js"
import { clamp } from "./lib/utils.js"

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, clear, loading } = useSession()
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener("resize", onResize, { passive: true })
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const isMobile = useMemo(() => width < 768, [width])
  const contentPaddingBottom = useMemo(() => clamp(isMobile ? 76 : 16, 16, 96), [isMobile])

  // セッション読み込み中は何も表示しない（またはローディング表示）
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-400">読み込み中...</div>
      </div>
    )
  }

  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl">
        <Navbar
          isMobile={isMobile}
          userName={session.userName}
          provider={session.provider}
          onLogout={async () => {
            await clear()
            // ログアウト後に確実に認証ページにリダイレクト
            window.location.href = "/auth"
          }}
        />
        <div className="flex gap-4 px-3 pb-6">
          {!isMobile ? <Sidebar /> : null}
          <main className="w-full" style={{ paddingBottom: contentPaddingBottom }}>
            <Outlet />
          </main>
        </div>
      </div>
      {isMobile ? <BottomNav /> : null}
    </div>
  )
}
