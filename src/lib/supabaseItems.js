/**
 * Supabase用の在庫アイテム管理
 */
import { supabase } from "./supabase.js";
import { nowIso } from "./utils.js";

/**
 * 在庫アイテムを取得
 */
export async function getItems(filters = {}) {
  try {
    let itemIds = null;

    // ジャンルでフィルターする場合、まずitem_tagsから該当するitem_idを取得
    if (filters.tagId) {
      const { data: tagRelations, error: tagError } = await supabase
        .from("item_tags")
        .select("item_id")
        .eq("tag_id", filters.tagId);

      if (tagError) {
        console.error("タグフィルターエラー:", tagError);
        return [];
      }

      itemIds = (tagRelations || []).map((r) => r.item_id);
      if (itemIds.length === 0) {
        return []; // 該当するアイテムがない
      }
    }

    let query = supabase
      .from("items")
      .select(
        `
        *,
        item_tags (
          tag_id,
          tags (
            id,
            name
          )
        )
      `
      )
      .order("created_at", { ascending: false });

    // フィルターされたitem_idで絞り込み
    if (itemIds) {
      query = query.in("id", itemIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("アイテム取得エラー:", error);
      return [];
    }

    // タグ情報を整形
    return (data || []).map((item) => ({
      id: String(item.id),
      name: item.name || "",
      stock: item.stock || 0,
      threshold: item.threshold || 0,
      location: item.location || "",
      description: item.description || "",
      image_url: item.image_url || "",
      expiry_date: item.expiry_date || null,
      category: item.category || "",
      alert_enabled: item.alert_enabled || false,
      expiry_type: item.expiry_type || null,
      status: item.status || "available",
      borrowed_by: item.borrowed_by || null,
      reserved_by: item.reserved_by || null,
      lent_date: item.lent_date || null,
      returned_date: item.returned_date || null,
      lending_history: item.lending_history || null,
      reservation_history: item.reservation_history || null,
      created_at: item.created_at || nowIso(),
      updated_at: item.updated_at || nowIso(),
      // 性質（category）を使用: 'consumable' | 'food' | 'shared'
      item_type: item.category || "consumable", // categoryカラムをitem_typeとして使用
      // タグ情報
      tags: (item.item_tags || []).map((it) => ({
        id: it.tags?.id,
        name: it.tags?.name || "",
      })),
    }));
  } catch (error) {
    console.error("アイテム取得エラー:", error);
    return [];
  }
}

/**
 * 在庫アイテムを追加
 */
export async function addItem(itemData) {
  try {
    const { tags, ...itemFields } = itemData;

    // アイテムを追加
    const { data: item, error: itemError } = await supabase
      .from("items")
      .insert({
        name: itemFields.name,
        stock: itemFields.stock || 0,
        threshold: itemFields.threshold || 0,
        location: itemFields.location || "",
        description: itemFields.description || "",
        image_url: itemFields.image_url || "",
        expiry_date: itemFields.expiry_date || null,
        category: itemFields.item_type || "consumable", // 性質をcategoryカラムに保存
        alert_enabled: itemFields.alert_enabled || false,
        expiry_type: itemFields.expiry_type || null,
        status: itemFields.status || "available",
      })
      .select()
      .single();

    if (itemError) {
      console.error("アイテム追加エラー:", itemError);
      return { success: false, error: itemError.message };
    }

    // タグを関連付け
    if (tags && tags.length > 0 && item) {
      const tagRelations = tags.map((tagId) => ({
        item_id: item.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from("item_tags")
        .insert(tagRelations);

      if (tagError) {
        console.error("タグ関連付けエラー:", tagError);
        // アイテムは追加されているので、エラーを返すが成功として扱う
      }
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("アイテム追加エラー:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 在庫アイテムを更新
 */
export async function updateItem(itemId, itemData) {
  try {
    const { tags, ...itemFields } = itemData;

    // アイテムを更新
    const { data: item, error: itemError } = await supabase
      .from("items")
      .update({
        name: itemFields.name,
        stock: itemFields.stock,
        threshold: itemFields.threshold,
        location: itemFields.location,
        description: itemFields.description,
        image_url: itemFields.image_url,
        expiry_date: itemFields.expiry_date,
        category: itemFields.item_type || itemFields.category || "consumable", // 性質をcategoryカラムに保存
        alert_enabled: itemFields.alert_enabled,
        expiry_type: itemFields.expiry_type,
        status: itemFields.status,
        borrowed_by: itemFields.borrowed_by,
        reserved_by: itemFields.reserved_by,
        lent_date: itemFields.lent_date,
        returned_date: itemFields.returned_date,
        updated_at: nowIso(),
      })
      .eq("id", itemId)
      .select()
      .single();

    if (itemError) {
      console.error("アイテム更新エラー:", itemError);
      return { success: false, error: itemError.message };
    }

    // タグを更新（既存のタグを削除してから新しいタグを追加）
    if (tags !== undefined && item) {
      // 既存のタグを削除
      await supabase.from("item_tags").delete().eq("item_id", itemId);

      // 新しいタグを追加
      if (tags.length > 0) {
        const tagRelations = tags.map((tagId) => ({
          item_id: itemId,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from("item_tags")
          .insert(tagRelations);

        if (tagError) {
          console.error("タグ更新エラー:", tagError);
        }
      }
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("アイテム更新エラー:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 在庫アイテムを削除
 */
export async function deleteItem(itemId) {
  try {
    // 関連する貸出ログを削除（外部キー制約のため）
    const { error: lendingLogsError } = await supabase
      .from("lending_logs")
      .delete()
      .eq("item_id", itemId);

    if (lendingLogsError) {
      console.error("貸出ログ削除エラー:", lendingLogsError);
      // エラーをログに記録するが、続行する
    }

    // 関連するタグを削除
    await supabase.from("item_tags").delete().eq("item_id", itemId);

    // アイテムを削除
    const { error } = await supabase.from("items").delete().eq("id", itemId);

    if (error) {
      console.error("アイテム削除エラー:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("アイテム削除エラー:", error);
    return { success: false, error: error.message };
  }
}

/**
 * タグ一覧を取得
 */
export async function getTags() {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("タグ取得エラー:", error);
      return [];
    }

    return (data || []).map((tag) => ({
      id: tag.id,
      name: tag.name || "",
    }));
  } catch (error) {
    console.error("タグ取得エラー:", error);
    return [];
  }
}

/**
 * タグを追加
 */
export async function addTag(tagName) {
  try {
    const { data, error } = await supabase
      .from("tags")
      .insert({
        name: tagName.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("タグ追加エラー:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("タグ追加エラー:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 貸出ログを追加
 */
export async function addLendingLog(logData) {
  try {
    // Supabaseが設定されていない場合は成功として扱う（フォールバック）
    if (
      !import.meta.env.VITE_SUPABASE_URL ||
      !import.meta.env.VITE_SUPABASE_ANON_KEY
    ) {
      console.log("Supabaseが設定されていないため、貸出ログをスキップします");
      return { success: true, data: null };
    }

    // statusの値を検証（CHECK制約に合致する値のみ許可）
    const validStatuses = ["lending", "reserved", "returned", "canceled"];
    const status =
      logData.status && validStatuses.includes(logData.status)
        ? logData.status
        : "lending";

    // デバッグ用ログ
    console.log("addLendingLog - status:", status, "logData:", logData);

    // reserved_dateは明示的に設定されている場合のみ使用
    // statusが"lending"の時はreserved_dateをnullにする必要がある可能性があるため
    const reservedDate =
      logData.reserved_date !== undefined ? logData.reserved_date : null;

    const insertData = {
      user_id: logData.user_id || null,
      item_id: logData.item_id,
      status: status,
      start_date: logData.start_date || nowIso(),
      due_date: logData.due_date || null,
      returned_date: logData.returned_date || null,
      quantity: logData.quantity || 1,
      user_name: logData.user_name || "",
      memo: logData.memo || "",
      reserved_date: reservedDate,
    };

    // デバッグ用ログ
    console.log(
      "addLendingLog - insertData:",
      JSON.stringify(insertData, null, 2)
    );
    console.log("addLendingLog - status:", status);
    console.log("addLendingLog - reserved_date:", reservedDate);

    const { data, error } = await supabase
      .from("lending_logs")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("貸出ログ追加エラー:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("貸出ログ追加エラー:", error);
    // ネットワークエラーの場合も詳細を返す
    const errorMessage = error.message || "ネットワークエラーが発生しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * アイテムの貸出ログを取得
 */
export async function getLendingLogs(itemId) {
  try {
    // Supabaseが設定されていない場合は空配列を返す
    if (
      !import.meta.env.VITE_SUPABASE_URL ||
      !import.meta.env.VITE_SUPABASE_ANON_KEY
    ) {
      return [];
    }

    const { data, error } = await supabase
      .from("lending_logs")
      .select("*")
      .eq("item_id", itemId)
      .in("status", ["reserved", "lending"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("貸出ログ取得エラー:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("貸出ログ取得エラー:", error);
    return [];
  }
}

/**
 * 貸出ログを更新
 */
export async function updateLendingLog(logId, logData) {
  try {
    // Supabaseが設定されていない場合は成功として扱う
    if (
      !import.meta.env.VITE_SUPABASE_URL ||
      !import.meta.env.VITE_SUPABASE_ANON_KEY
    ) {
      return { success: true, data: null };
    }

    // 更新するフィールドのみを構築（undefinedのフィールドは除外）
    const updateData = {};

    // statusの値を検証（CHECK制約に合致する値のみ許可）
    if (logData.status !== undefined) {
      const validStatuses = ["lending", "reserved", "returned", "canceled"];
      if (validStatuses.includes(logData.status)) {
        updateData.status = logData.status;
      } else {
        console.warn(
          "無効なstatus値:",
          logData.status,
          "デフォルト値'lending'を使用"
        );
        updateData.status = "lending";
      }
    }

    if (logData.start_date !== undefined)
      updateData.start_date = logData.start_date;
    if (logData.returned_date !== undefined)
      updateData.returned_date = logData.returned_date;
    if (logData.quantity !== undefined) updateData.quantity = logData.quantity;
    if (logData.user_name !== undefined)
      updateData.user_name = logData.user_name;
    if (logData.memo !== undefined) updateData.memo = logData.memo;
    // reserved_dateは更新しない（CHECK制約により、status変更時はreserved_dateを変更できない可能性があるため）

    // デバッグ用ログ
    console.log("updateLendingLog - updateData:", updateData, "logId:", logId);
    console.log("updateLendingLog - status値:", updateData.status);

    // まず既存のログを取得して確認
    const { data: existingLog, error: existingError } = await supabase
      .from("lending_logs")
      .select("*")
      .eq("id", logId)
      .single();

    if (existingError) {
      console.error("既存ログ取得エラー:", existingError);
      return { success: false, error: existingError.message };
    }

    console.log("既存ログ:", existingLog);

    // updateのみ実行（select()は使わない）
    const { error } = await supabase
      .from("lending_logs")
      .update(updateData)
      .eq("id", logId);

    if (error) {
      console.error("貸出ログ更新エラー:", error);
      console.error("エラー詳細:", JSON.stringify(error, null, 2));
      console.error("エラーコード:", error.code);
      console.error("エラーメッセージ:", error.message);
      console.error("エラーヒント:", error.hint);
      console.error("エラー詳細情報:", error.details);
      console.error("送信したupdateData:", JSON.stringify(updateData, null, 2));
      console.error("既存ログ:", JSON.stringify(existingLog, null, 2));
      console.error("既存ログのstatus:", existingLog?.status);
      return { success: false, error: error.message || "更新に失敗しました" };
    }

    // 更新後のログを取得
    const { data: updatedLog, error: updatedError } = await supabase
      .from("lending_logs")
      .select("*")
      .eq("id", logId)
      .single();

    if (updatedError) {
      console.error("更新後ログ取得エラー:", updatedError);
      // 更新は成功しているので、エラーを無視
    }

    return { success: true, data: updatedLog || existingLog };
  } catch (error) {
    console.error("貸出ログ更新エラー:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 貸出ログを削除
 */
export async function deleteLendingLog(logId) {
  try {
    // Supabaseが設定されていない場合は成功として扱う
    if (
      !import.meta.env.VITE_SUPABASE_URL ||
      !import.meta.env.VITE_SUPABASE_ANON_KEY
    ) {
      return { success: true };
    }

    const { error } = await supabase
      .from("lending_logs")
      .delete()
      .eq("id", logId);

    if (error) {
      console.error("貸出ログ削除エラー:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("貸出ログ削除エラー:", error);
    return { success: false, error: error.message };
  }
}
