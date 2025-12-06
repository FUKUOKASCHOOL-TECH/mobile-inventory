/**
@typedef {Object} InventoryItem
@property {string} id
@property {string} name
@property {number} stock
@property {string} location
@property {string} item_type // 'consumable' | 'food' | 'shared'
@property {Array} tags
@property {string} expiry_date
@property {string} expiry_type
@property {string} status
@property {string} borrowed_by
*/

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  getInventory,
  setInventory,
  addItem as addItemStorage,
  updateItem as updateItemStorage,
  deleteItem as deleteItemStorage,
  onStorageEvent,
} from "../lib/storage.js";
import {
  getItems,
  addItem as addItemSupabase,
  updateItem as updateItemSupabase,
  deleteItem as deleteItemSupabase,
} from "../lib/supabaseItems.js";
import { useToast } from "../components/Toast.jsx";

const useSupabase = () => {
  return !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );
};

export function useInventory(filters = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();
  const isSupabase = useSupabase();
  const isInitialMount = useRef(true);

  // アイテム一覧を取得
  const fetchItems = useCallback(
    async (showLoading = false) => {
      try {
        // 初回読み込み時、または明示的にshowLoadingがtrueの場合のみloadingを表示
        if (isInitialMount.current || showLoading) {
          setLoading(true);
        }
        if (isSupabase) {
          const data = await getItems(filters);
          setItems(data);
        } else {
          // フォールバック: localStorage
          const data = getInventory();
          setItems(data);
        }
      } catch (error) {
        console.error("アイテム取得エラー:", error);
        pushToast("アイテムの取得に失敗しました", "danger");
      } finally {
        if (isInitialMount.current || showLoading) {
          setLoading(false);
        }
        isInitialMount.current = false;
      }
    },
    [isSupabase, filters, pushToast]
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // localStorageのイベント監視（フォールバック時）
  useEffect(() => {
    if (!isSupabase) {
      return onStorageEvent("inventory", () => {
        setItems(getInventory());
      });
    }
  }, [isSupabase]);

  const setAll = useCallback(
    async (list) => {
      if (isSupabase) {
        // Supabaseでは個別に更新する必要があるため、このメソッドは使用しない
        pushToast(
          "Supabaseモードではこの操作はサポートされていません",
          "danger"
        );
      } else {
        setInventory(list);
      }
    },
    [isSupabase, pushToast]
  );

  const addItem = useCallback(
    async (item) => {
      try {
        if (isSupabase) {
          const result = await addItemSupabase(item);
          if (result.success) {
            pushToast("アイテムを追加しました", "success");
            // 明示的にloadingを表示せずに更新
            await fetchItems(false);
            return { success: true };
          } else {
            pushToast(result.error || "アイテムの追加に失敗しました", "danger");
            return { success: false, error: result.error };
          }
        } else {
          addItemStorage(item);
          pushToast("アイテムを追加しました", "success");
          // localStorageの場合は即座に反映
          const data = getInventory();
          setItems(data);
          return { success: true };
        }
      } catch (error) {
        console.error("アイテム追加エラー:", error);
        pushToast("アイテムの追加に失敗しました", "danger");
        return { success: false, error: error.message };
      }
    },
    [isSupabase, fetchItems, pushToast]
  );

  const updateItem = useCallback(
    async (item) => {
      try {
        if (isSupabase) {
          const result = await updateItemSupabase(item.id, item);
          if (result.success) {
            pushToast("アイテムを更新しました", "success");
            // 明示的にloadingを表示せずに更新
            await fetchItems(false);
            return { success: true };
          } else {
            pushToast(result.error || "アイテムの更新に失敗しました", "danger");
            return { success: false, error: result.error };
          }
        } else {
          updateItemStorage(item);
          pushToast("アイテムを更新しました", "success");
          // localStorageの場合は即座に反映
          const data = getInventory();
          setItems(data);
          return { success: true };
        }
      } catch (error) {
        console.error("アイテム更新エラー:", error);
        pushToast("アイテムの更新に失敗しました", "danger");
        return { success: false, error: error.message };
      }
    },
    [isSupabase, fetchItems, pushToast]
  );

  const deleteItem = useCallback(
    async (id) => {
      try {
        if (isSupabase) {
          const result = await deleteItemSupabase(id);
          if (result.success) {
            pushToast("アイテムを削除しました", "success");
            // 明示的にloadingを表示せずに更新
            await fetchItems(false);
            return { success: true };
          } else {
            pushToast(result.error || "アイテムの削除に失敗しました", "danger");
            return { success: false, error: result.error };
          }
        } else {
          deleteItemStorage(id);
          pushToast("アイテムを削除しました", "success");
          // localStorageの場合は即座に反映
          const data = getInventory();
          setItems(data);
          return { success: true };
        }
      } catch (error) {
        console.error("アイテム削除エラー:", error);
        pushToast("アイテムの削除に失敗しました", "danger");
        return { success: false, error: error.message };
      }
    },
    [isSupabase, fetchItems, pushToast]
  );

  return useMemo(
    () => ({
      items,
      loading,
      setAll,
      addItem,
      updateItem,
      deleteItem,
      refreshItems: fetchItems,
    }),
    [items, loading, setAll, addItem, updateItem, deleteItem, fetchItems]
  );
}
