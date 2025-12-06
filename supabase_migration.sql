-- Supabaseデータベースマイグレーション
-- ERDに基づいた在庫管理システムのセットアップ

-- categoryカラムを性質（消耗品、食品、共有物）として使用するための制約を追加
-- 既存のcategoryカラムがある場合は、制約のみ追加
-- 新規の場合は、categoryカラムにCHECK制約を追加

-- categoryカラムにCHECK制約を追加（既存のカラムがある場合）
-- 注意: 既存のデータがある場合は、事前にデータを移行してください
DO $$
BEGIN
  -- categoryカラムが存在するか確認
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'category'
  ) THEN
    -- 既存の制約を削除（存在する場合）
    ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check;
    
    -- 新しいCHECK制約を追加
    ALTER TABLE items 
    ADD CONSTRAINT items_category_check 
    CHECK (category IN ('consumable', 'food', 'shared') OR category IS NULL OR category = '');
  END IF;
END $$;

-- 既存のデータを更新（オプション）
-- categoryが空の場合は'consumable'に設定
UPDATE items 
SET category = 'consumable' 
WHERE (category IS NULL OR category = '') AND category IS NOT NULL;

-- expiry_typeカラムが存在しない場合は追加（食品の期限タイプ用）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'expiry_type'
  ) THEN
    ALTER TABLE items ADD COLUMN expiry_type TEXT;
  END IF;
END $$;

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_expiry_date ON items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_lending_logs_item_id ON lending_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_lending_logs_user_id ON lending_logs(user_id);
