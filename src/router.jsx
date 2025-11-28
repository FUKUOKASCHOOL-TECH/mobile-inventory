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
import { createBrowserRouter, Navigate } from "react-router-dom"
import App from "./App.jsx"
import Auth from "./pages/auth.jsx"
import Scan from "./pages/scan.jsx"
import Item from "./pages/item.jsx"
import Inventory from "./pages/inventory.jsx"
import Chat from "./pages/chat.jsx"

export const router = createBrowserRouter([
  {
    path: "/auth",
    element: <Auth />
  },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/scan" replace /> },
      { path: "scan", element: <Scan /> },
      { path: "item/:id", element: <Item /> },
      { path: "inventory", element: <Inventory /> },
      { path: "chat", element: <Chat /> }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/scan" replace />
  }
])
