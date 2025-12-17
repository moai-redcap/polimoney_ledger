-- Polimoney Ledger - Supabase Storage 設定
-- 本人確認書類などのファイル保存用

-- ============================================
-- Storage バケット作成
-- ============================================

-- 本人確認書類用バケット
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verification-documents',
    'verification-documents',
    false,  -- 非公開（認証必要）
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 領収書・証憑用バケット（将来用）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false,  -- 非公開（認証必要）
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- Storage RLS ポリシー
-- ============================================

-- verification-documents バケット
-- 自分のフォルダにのみアップロード可能
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 自分のファイルのみ読み取り可能
CREATE POLICY "Users can read own verification documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- service_role は全てアクセス可能
CREATE POLICY "Service role can access all verification documents"
ON storage.objects FOR ALL
USING (
    bucket_id = 'verification-documents'
    AND auth.role() = 'service_role'
);

-- receipts バケット
-- 自分のフォルダにのみアップロード可能
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 自分のファイルのみ読み取り可能
CREATE POLICY "Users can read own receipts"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 自分のファイルのみ削除可能
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- service_role は全てアクセス可能
CREATE POLICY "Service role can access all receipts"
ON storage.objects FOR ALL
USING (
    bucket_id = 'receipts'
    AND auth.role() = 'service_role'
);

-- ============================================
-- 注意事項
-- ============================================
-- このマイグレーションは Supabase Dashboard の SQL Editor で実行してください
-- または supabase CLI: supabase db push
