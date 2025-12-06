/**
 * タグ（ジャンル）管理フック
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTags, addTag as addTagApi } from "../lib/supabaseItems.js";
import { useToast } from "../components/Toast.jsx";

const useSupabase = () => {
  return !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );
};

export function useTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();
  const isSupabase = useSupabase();

  // タグ一覧を取得
  const fetchTags = useCallback(async () => {
    if (!isSupabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getTags();
      setTags(data);
    } catch (error) {
      console.error("タグ取得エラー:", error);
      pushToast("タグの取得に失敗しました", "danger");
    } finally {
      setLoading(false);
    }
  }, [isSupabase, pushToast]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // タグを追加
  const addTag = useCallback(
    async (tagName) => {
      if (!isSupabase) {
        pushToast("Supabaseが設定されていません", "danger");
        return { success: false };
      }

      if (!tagName || !tagName.trim()) {
        pushToast("タグ名を入力してください", "danger");
        return { success: false };
      }

      try {
        const result = await addTagApi(tagName.trim());
        if (result.success) {
          pushToast("タグを追加しました", "success");
          await fetchTags();
          return { success: true, data: result.data };
        } else {
          pushToast(result.error || "タグの追加に失敗しました", "danger");
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error("タグ追加エラー:", error);
        pushToast("タグの追加に失敗しました", "danger");
        return { success: false, error: error.message };
      }
    },
    [isSupabase, fetchTags, pushToast]
  );

  return useMemo(
    () => ({
      tags,
      loading,
      addTag,
      refreshTags: fetchTags,
    }),
    [tags, loading, addTag, fetchTags]
  );
}
