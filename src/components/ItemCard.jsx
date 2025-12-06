/**
@typedef {Object} InventoryItem
@property {string} id
@property {string} name
@property {number} stock
@property {number} threshold
@property {string} location
@property {string} item_type
@property {Array} tags
@property {string} status
@property {string} borrowed_by
@property {string} expiry_date
@property {string} expiry_type
*/

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { IconPlus, IconMinus } from "./Icons.jsx";
import { nowIso } from "../lib/utils.js";
import { 
  addLendingLog, 
  getLendingLogs, 
  updateLendingLog, 
  deleteLendingLog 
} from "../lib/supabaseItems.js";
import { useToast } from "./Toast.jsx";
import { sendDiscordNotification } from "../lib/discordMock.js";

// ItemCard component - Premium UX design with white background and black text

function getTagBadge(tag) {
  if (!tag)
    return {
      label: "未分類",
      className: "border-gray-200 bg-gray-50 text-gray-600",
    };
  // タグ名に基づいて色を決定（簡易版）
  const name = String(tag.name || "").toLowerCase();
  if (name.includes("キッチン") || name.includes("kitchen")) {
    return {
      label: tag.name,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (name.includes("バス") || name.includes("bath")) {
    return {
      label: tag.name,
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  if (name.includes("消耗") || name.includes("consumable")) {
    return {
      label: tag.name,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (name.includes("工具") || name.includes("tool")) {
    return {
      label: tag.name,
      className: "border-violet-200 bg-violet-50 text-violet-700",
    };
  }
  return {
    label: tag.name,
    className: "border-gray-200 bg-gray-50 text-gray-600",
  };
}

function getItemTypeBadge(itemType) {
  const type = String(itemType || "").toLowerCase();
  if (type === "food") {
    return {
      label: "食品",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }
  if (type === "shared") {
    return {
      label: "共有物",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }
  return {
    label: "消耗品",
    className: "border-gray-200 bg-gray-50 text-gray-600",
  };
}

export default function ItemCard({ item, onStockChange, onSharedAction }) {
  const tag = item.tags && item.tags.length > 0 ? item.tags[0] : null;
  const tagBadge = getTagBadge(tag);
  const typeBadge = getItemTypeBadge(item.item_type);
  const { pushToast } = useToast();
  
  const isConsumableOrFood = item.item_type === "consumable" || item.item_type === "food";
  const isShared = item.item_type === "shared";
  const stock = item.stock || 0;
  const threshold = item.threshold || 0;
  const isLowStock = stock <= threshold && stock > 0;
  const isOutOfStock = stock === 0;
  
  // 共有物用の状態
  const [lendingLogs, setLendingLogs] = useState([]);
  const [showSharedModal, setShowSharedModal] = useState(false);
  const [sharedAction, setSharedAction] = useState("borrow"); // "borrow" | "reserve"
  const [userName, setUserName] = useState("");
  const [reserveDate, setReserveDate] = useState("");
  const [reserveQuantity, setReserveQuantity] = useState(1);
  const [borrowQuantity, setBorrowQuantity] = useState(1);
  
  // 貸出ログを取得（初回のみ）
  useEffect(() => {
    if (isShared && item.id) {
      const fetchLogs = async () => {
        const logs = await getLendingLogs(Number.parseInt(item.id, 10));
        setLendingLogs(logs);
      };
      fetchLogs();
    }
  }, [isShared, item.id]);
  
  const handleStockChange = async (delta) => {
    if (!onStockChange) return;
    const newStock = Math.max(0, stock + delta);
    await onStockChange(item.id, newStock);
  };

  // 共有物の借りる処理（新規）
  const handleBorrow = async () => {
    if (!userName.trim()) {
      pushToast("名前を入力してください", "danger");
      return;
    }
    if (borrowQuantity < 1) {
      pushToast("借りる個数は1以上です", "danger");
      return;
    }
    if (borrowQuantity > stock) {
      pushToast("在庫が不足しています", "danger");
      return;
    }

    try {
      // 在庫数を減らす
      if (onStockChange) {
        await onStockChange(item.id, stock - borrowQuantity);
      }

      // 貸出ログを追加
      const result = await addLendingLog({
        item_id: Number.parseInt(item.id, 10),
        status: "lending",
        start_date: nowIso(),
        quantity: borrowQuantity,
        user_name: userName.trim(),
        memo: "",
      });

      if (!result || !result.success) {
        throw new Error(result?.error || "貸出ログの追加に失敗しました");
      }

      // 共有物を借りた時に通知を送信
      await sendDiscordNotification({
        type: "lending",
        itemName: item.name,
        userName: userName.trim(),
        item_type: item.item_type || item.category || "shared",
        category: item.item_type || item.category || "shared",
        quantity: borrowQuantity,
        timestamp: new Date().toISOString(),
      });

      pushToast(`${borrowQuantity}個を借りました`, "success");
      
      // モーダルを閉じて状態をリセット
      setShowSharedModal(false);
      setUserName("");
      setBorrowQuantity(1);
      
      if (onSharedAction) {
        await onSharedAction();
      }
      // ログを再取得（借りた情報の欄が表示される）
      const logs = await getLendingLogs(Number.parseInt(item.id, 10));
      setLendingLogs(logs);
    } catch (error) {
      console.error("貸出エラー:", error);
      pushToast(error.message || "貸出に失敗しました", "danger");
      // エラー時は在庫を戻す
      if (onStockChange) {
        await onStockChange(item.id, stock);
      }
    }
  };

  // 共有物の予約処理
  const handleReserve = async () => {
    if (!userName.trim()) {
      pushToast("名前を入力してください", "danger");
      return;
    }
    if (!reserveDate) {
      pushToast("予約予定日を入力してください", "danger");
      return;
    }

    try {
      // 予約ログを追加（在庫数は減らさない）
      const result = await addLendingLog({
        item_id: Number.parseInt(item.id, 10),
        status: "reserved",
        start_date: null,
        reserved_date: reserveDate,
        quantity: reserveQuantity,
        user_name: userName.trim(),
        memo: "",
      });

      if (!result || !result.success) {
        throw new Error(result?.error || "予約ログの追加に失敗しました");
      }

      pushToast("予約しました", "success");
      setShowSharedModal(false);
      setUserName("");
      setReserveDate("");
      setReserveQuantity(1);
      
      if (onSharedAction) {
        await onSharedAction();
      }
      // ログを再取得
      const logs = await getLendingLogs(Number.parseInt(item.id, 10));
      setLendingLogs(logs);
    } catch (error) {
      console.error("予約エラー:", error);
      pushToast(error.message || "予約に失敗しました", "danger");
    }
  };

  // 予約から借りるへの移行
  const handleReserveToBorrow = async (logId, quantity) => {
    if (quantity > stock) {
      pushToast("在庫が不足しています", "danger");
      return;
    }

    try {
      // 既存の予約ログを取得
      const existingLog = lendingLogs.find(log => log.id === logId);
      if (!existingLog) {
        throw new Error("予約ログが見つかりません");
      }

      // 在庫数を減らす
      if (onStockChange) {
        await onStockChange(item.id, stock - quantity);
      }

      // 予約ログを削除
      const deleteResult = await deleteLendingLog(logId);
      if (!deleteResult || !deleteResult.success) {
        throw new Error(deleteResult?.error || "予約ログの削除に失敗しました");
      }

      // 新しい借りるログを作成
      const addResult = await addLendingLog({
        item_id: Number.parseInt(item.id, 10),
        status: "lending",
        start_date: nowIso(),
        quantity: quantity,
        user_name: existingLog.user_name || "",
        memo: existingLog.memo || "",
        reserved_date: null, // statusが"lending"の時はreserved_dateをnullに
      });

      if (!addResult || !addResult.success) {
        throw new Error(addResult?.error || "貸出ログの追加に失敗しました");
      }

      // 予約から借りる時に通知を送信
      await sendDiscordNotification({
        type: "lending",
        itemName: item.name,
        userName: existingLog.user_name || "不明",
        item_type: item.item_type || item.category || "shared",
        category: item.item_type || item.category || "shared",
        quantity: quantity,
        timestamp: new Date().toISOString(),
      });

      pushToast(`${quantity}個を借りました`, "success");
      
      if (onSharedAction) {
        await onSharedAction();
      }
      // ログを再取得
      const logs = await getLendingLogs(Number.parseInt(item.id, 10));
      setLendingLogs(logs);
    } catch (error) {
      console.error("貸出エラー:", error);
      pushToast(error.message || "貸出に失敗しました", "danger");
      // エラー時は在庫を戻す
      if (onStockChange) {
        await onStockChange(item.id, stock);
      }
    }
  };

  // 予約解除
  const handleCancelReserve = async (logId) => {
    try {
      const result = await deleteLendingLog(logId);
      if (!result || !result.success) {
        throw new Error(result?.error || "予約解除に失敗しました");
      }

      pushToast("予約を解除しました", "success");
      
      if (onSharedAction) {
        await onSharedAction();
      }
      // ログを再取得
      const logs = await getLendingLogs(Number.parseInt(item.id, 10));
      setLendingLogs(logs);
    } catch (error) {
      console.error("予約解除エラー:", error);
      pushToast(error.message || "予約解除に失敗しました", "danger");
    }
  };

  // 返却処理
  const handleReturn = async (logId, returnQuantity) => {
    try {
      // 在庫数を戻す
      if (onStockChange) {
        await onStockChange(item.id, stock + returnQuantity);
      }

      // ログを更新（貸出→返却）
      const result = await updateLendingLog(logId, {
        status: "returned",
        returned_date: nowIso(),
        quantity: returnQuantity,
      });

      if (!result || !result.success) {
        throw new Error(result?.error || "返却ログの更新に失敗しました");
      }

      // 返却時に通知を送信
      const returnLog = lendingLogs.find(log => log.id === logId);
      await sendDiscordNotification({
        type: "returned",
        itemName: item.name,
        userName: returnLog?.user_name || "不明",
        item_type: item.item_type || item.category || "shared",
        category: item.item_type || item.category || "shared",
        quantity: returnQuantity,
        timestamp: new Date().toISOString(),
      });

      pushToast(`${returnQuantity}個を返却しました`, "success");
      
      if (onSharedAction) {
        await onSharedAction();
      }
      // ログを再取得
      const logs = await getLendingLogs(Number.parseInt(item.id, 10));
      setLendingLogs(logs);
    } catch (error) {
      console.error("返却エラー:", error);
      pushToast(error.message || "返却に失敗しました", "danger");
      // エラー時は在庫を戻す
      if (onStockChange) {
        await onStockChange(item.id, stock);
      }
    }
  };

  // 期限が近いかチェック（食品の場合）
  const isExpiringSoon = item.item_type === "food" && item.expiry_date && (() => {
    const expiryDate = new Date(item.expiry_date);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  })();

  const isExpired = item.item_type === "food" && item.expiry_date && (() => {
    const expiryDate = new Date(item.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate < today;
  })();

  // 共有物の場合もLinkを使用（詳細ページに遷移可能）
  const CardWrapper = Link;

  // 予約中と貸出中のログを分ける
  const reservedLogs = lendingLogs.filter(log => log.status === "reserved");
  const borrowedLogs = lendingLogs.filter(log => log.status === "lending");

  return (
    <>
      <CardWrapper
        to={`/item/${encodeURIComponent(item.id)}`}
        className="group relative block overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:scale-[0.99]"
      >
        {/* 低在庫・在庫切れの警告バー */}
        {(isLowStock || isOutOfStock) && (
          <div className={`absolute top-0 left-0 right-0 h-1 ${
            isOutOfStock ? "bg-red-500" : "bg-yellow-400"
          }`} />
        )}

        <div className="relative">
          {/* ヘッダー部分：名前 */}
          <div className="mb-3 pr-20">
            <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-1 line-clamp-2 group-hover:text-black transition-colors">
              {item.name}
            </h3>
            {item.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{item.location}</span>
              </div>
            )}
          </div>

          {/* 在庫数表示（右上に固定） */}
          <div className="absolute top-5 right-5">
            <div className={`
              flex flex-col items-center justify-center
              rounded-lg px-3 py-2 w-[65px]
              transition-all duration-200
              ${
                isOutOfStock
                  ? "bg-red-50 border-2 border-red-200"
                  : isLowStock
                  ? "bg-yellow-50 border-2 border-yellow-200"
                  : "bg-gray-50 border border-gray-200"
              }
            `}>
              <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                在庫
              </div>
              <div className={`
                text-xl font-bold leading-none
                ${
                  isOutOfStock
                    ? "text-red-600"
                    : isLowStock
                    ? "text-yellow-700"
                    : "text-gray-900"
                }
              `}>
                {stock}
              </div>
              {threshold > 0 && (
                <div className="text-[9px] text-gray-400 mt-0.5">
                  閾値: {threshold}
                </div>
              )}
            </div>
          </div>

          {/* バッジ（ジャンル・性質） */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span
              className={`
                inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium
                ${tagBadge.className}
              `}
            >
              {tagBadge.label}
            </span>
            <span
              className={`
                inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium
                ${typeBadge.className}
              `}
            >
              {typeBadge.label}
            </span>
          </div>

          {/* 消耗品・食品の場合は増減ボタン */}
          {isConsumableOrFood && onStockChange && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStockChange(-1);
                  }}
                  disabled={stock === 0}
                  className="
                    flex items-center justify-center
                    rounded-lg border-2 border-gray-300
                    bg-white px-4 py-2.5 min-w-[48px]
                    text-gray-700 font-medium
                    hover:bg-gray-50 hover:border-gray-400
                    active:scale-[0.96] transition-all duration-150
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300
                  "
                  type="button"
                  aria-label="在庫を減らす"
                >
                  <IconMinus className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStockChange(1);
                  }}
                  className="
                    flex items-center justify-center
                    rounded-lg border-2 border-gray-300
                    bg-white px-4 py-2.5 min-w-[48px]
                    text-gray-700 font-medium
                    hover:bg-gray-50 hover:border-gray-400
                    active:scale-[0.96] transition-all duration-150
                  "
                  type="button"
                  aria-label="在庫を増やす"
                >
                  <IconPlus className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* 共有物の場合は予約・貸出情報を表示 */}
          {isShared && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              {/* 貸出中の欄 */}
              {borrowedLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {log.user_name || "不明"}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        借りた日時: {new Date(log.start_date).toLocaleString("ja-JP")}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-600">
                        個数: {log.quantity}個
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleReturn(log.id, log.quantity);
                      }}
                      className="
                        rounded-lg border-2 border-green-300
                        bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700
                        hover:bg-green-100 hover:border-green-400
                        active:scale-[0.96] transition-all duration-150
                      "
                      type="button"
                    >
                      返却
                    </button>
                  </div>
                </div>
              ))}

              {/* 予約中の欄 */}
              {reservedLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {log.user_name || "不明"}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        予約予定日時: {new Date(log.reserved_date).toLocaleString("ja-JP")}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-600">
                        予約個数: {log.quantity}個
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleReserveToBorrow(log.id, log.quantity);
                        }}
                        disabled={log.quantity > stock}
                        className="
                          rounded-lg border-2 border-blue-300
                          bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700
                          hover:bg-blue-100 hover:border-blue-400
                          active:scale-[0.96] transition-all duration-150
                          disabled:opacity-40 disabled:cursor-not-allowed
                        "
                        type="button"
                      >
                        借りる
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCancelReserve(log.id);
                        }}
                        className="
                          rounded-lg border-2 border-red-300
                          bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700
                          hover:bg-red-100 hover:border-red-400
                          active:scale-[0.96] transition-all duration-150
                        "
                        type="button"
                      >
                        解除
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* 新規予約・借りるボタン */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSharedModal(true);
                    setSharedAction("reserve");
                  }}
                  className="
                    flex-1 rounded-lg border-2 border-yellow-300
                    bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700
                    hover:bg-yellow-100 hover:border-yellow-400
                    active:scale-[0.96] transition-all duration-150
                  "
                  type="button"
                >
                  予約
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSharedModal(true);
                    setSharedAction("borrow");
                  }}
                  disabled={stock === 0}
                  className="
                    flex-1 rounded-lg border-2 border-blue-300
                    bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700
                    hover:bg-blue-100 hover:border-blue-400
                    active:scale-[0.96] transition-all duration-150
                    disabled:opacity-40 disabled:cursor-not-allowed
                  "
                  type="button"
                >
                  借りる
                </button>
              </div>
            </div>
          )}

          {/* 食品の場合は期限表示 */}
          {item.item_type === "food" && item.expiry_date && (
            <div className={`
              mt-4 pt-4 border-t border-gray-100
              flex items-center gap-2 rounded-lg px-3 py-2.5
              ${
                isExpired
                  ? "bg-red-50 border-red-200"
                  : isExpiringSoon
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-orange-50 border-orange-200"
              }
            `}>
              <svg className={`h-4 w-4 flex-shrink-0 ${
                isExpired ? "text-red-600" : isExpiringSoon ? "text-yellow-600" : "text-orange-600"
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold ${
                  isExpired ? "text-red-700" : isExpiringSoon ? "text-yellow-700" : "text-orange-700"
                }`}>
                  {item.expiry_type === "use_by" ? "消費期限" : "賞味期限"}
                  {isExpired && " (期限切れ)"}
                  {isExpiringSoon && !isExpired && " (期限間近)"}
                </div>
                <div className={`text-xs mt-0.5 ${
                  isExpired ? "text-red-600" : isExpiringSoon ? "text-yellow-600" : "text-orange-600"
                }`}>
                  {new Date(item.expiry_date).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardWrapper>

      {/* 共有物用のモーダル */}
      {isShared && showSharedModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSharedModal(false);
            }
          }}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-gray-300 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {sharedAction === "borrow" && "借りる"}
                {sharedAction === "reserve" && "予約する"}
              </h3>
              <button
                onClick={() => setShowSharedModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                type="button"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {sharedAction === "borrow" && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      名前（必須）
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      placeholder="名前を入力"
                    />
                  </div>
                  {stock > 1 && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        借りる個数（1〜{stock}）
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={stock}
                        value={borrowQuantity}
                        onChange={(e) => setBorrowQuantity(Math.max(1, Math.min(stock, Number.parseInt(e.target.value, 10) || 1)))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      />
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    ※ 借りた日付は自動で記録されます
                  </div>
                  <button
                    onClick={handleBorrow}
                    disabled={!userName.trim() || stock === 0}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    借りる
                  </button>
                </>
              )}

              {sharedAction === "reserve" && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      名前（必須）
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      placeholder="名前を入力"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      予約予定日時（必須）
                    </label>
                    <input
                      type="datetime-local"
                      value={reserveDate}
                      onChange={(e) => setReserveDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    />
                  </div>
                  {stock > 1 && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        予約個数（1〜{stock}）
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={stock}
                        value={reserveQuantity}
                        onChange={(e) => setReserveQuantity(Math.max(1, Math.min(stock, Number.parseInt(e.target.value, 10) || 1)))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      />
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    ※ 予約時は在庫数は減りません
                  </div>
                  <button
                    onClick={handleReserve}
                    disabled={!userName.trim() || !reserveDate}
                    className="w-full rounded-lg bg-yellow-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    予約する
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
