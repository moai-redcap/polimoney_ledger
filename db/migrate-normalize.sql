-- =====================================================
-- Polimoney Ledger - DB初期化 & 新スキーマ構築
-- =====================================================
-- 注意: このスクリプトは既存データを全て削除します。
-- テストデータのみの環境でのみ実行してください。
-- 
-- 実行方法: Supabase SQL Editor に貼り付けて実行
-- =====================================================

-- ============================================
-- Step 1: 既存テーブルを全て削除（依存順序）
-- ============================================

-- RLS ポリシーを先に削除（テーブルが存在する場合のみ）
DO $$ BEGIN
    -- ledger_year_closures
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_year_closures') THEN
        DROP POLICY IF EXISTS "Users can manage closures for their ledgers" ON ledger_year_closures;
    END IF;
    -- transaction_drafts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_drafts') THEN
        DROP POLICY IF EXISTS "Users can CRUD their own drafts" ON transaction_drafts;
    END IF;
    -- ownership_transfers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ownership_transfers') THEN
        DROP POLICY IF EXISTS "Allow individual read access" ON ownership_transfers;
        DROP POLICY IF EXISTS "Allow individual update access" ON ownership_transfers;
    END IF;
    -- ledger_members
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_members') THEN
        DROP POLICY IF EXISTS "Users can manage their ledger_members" ON ledger_members;
    END IF;
    -- media_assets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_assets') THEN
        DROP POLICY IF EXISTS "Users can manage their media assets" ON media_assets;
    END IF;
    -- journal_entries (ポリシーなし)
    -- journals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journals') THEN
        DROP POLICY IF EXISTS "Users can CRUD their own journals" ON journals;
    END IF;
    -- ledger_contacts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_contacts') THEN
        DROP POLICY IF EXISTS "Users can manage their ledger_contacts" ON ledger_contacts;
    END IF;
    -- contacts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        DROP POLICY IF EXISTS "Users can CRUD their own contacts" ON contacts;
    END IF;
    -- sub_accounts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_accounts') THEN
        DROP POLICY IF EXISTS "Users can CRUD their own sub_accounts" ON sub_accounts;
    END IF;
    -- ledgers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledgers') THEN
        DROP POLICY IF EXISTS "Users can CRUD their own ledgers" ON ledgers;
    END IF;
    -- 旧中間テーブル（前回マイグレーションで作成された可能性）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'politician_elections') THEN
        DROP POLICY IF EXISTS "Users can manage their politician_elections" ON politician_elections;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'politician_organizations') THEN
        DROP POLICY IF EXISTS "Users can manage their politician_organizations" ON politician_organizations;
    END IF;
    -- elections
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'elections') THEN
        DROP POLICY IF EXISTS "Users can CRUD their own elections" ON elections;
    END IF;
    -- politicians (旧テーブル)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'politicians') THEN
        DROP POLICY IF EXISTS "Users can CRUD their own politicians" ON politicians;
    END IF;
    -- political_organizations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'political_organizations') THEN
        DROP POLICY IF EXISTS "Users can CRUD their own organizations" ON political_organizations;
    END IF;
    -- profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    END IF;
END $$;

-- テーブル削除（依存順序: 子テーブルから）
DROP TABLE IF EXISTS ledger_year_closures CASCADE;
DROP TABLE IF EXISTS transaction_drafts CASCADE;
DROP TABLE IF EXISTS ownership_transfers CASCADE;
DROP TABLE IF EXISTS ledger_members CASCADE;
DROP TABLE IF EXISTS media_assets CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS journals CASCADE;
DROP TABLE IF EXISTS ledger_contacts CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS sub_accounts CASCADE;
DROP TABLE IF EXISTS ledgers CASCADE;
-- 旧テーブル（前回マイグレーションで作成された可能性）
DROP TABLE IF EXISTS politician_elections CASCADE;
DROP TABLE IF EXISTS politician_organizations CASCADE;
DROP TABLE IF EXISTS politicians CASCADE;
-- マスタ系
DROP TABLE IF EXISTS elections CASCADE;
DROP TABLE IF EXISTS political_organizations CASCADE;
-- profiles は auth.users に依存するため、削除して再作成
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- Step 2: 新スキーマ構築
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- プロフィール
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    hub_politician_id UUID,
    avatar_url TEXT,
    tos_accepted_at TIMESTAMPTZ,
    privacy_policy_accepted_at TIMESTAMPTZ,
    verified_email_domain TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 政治団体
CREATE TABLE political_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    hub_organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 選挙
CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES auth.users(id) NOT NULL,
    hub_politician_id UUID,
    election_name TEXT NOT NULL,
    election_date DATE NOT NULL,
    hub_election_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 台帳
CREATE TABLE ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES auth.users(id) NOT NULL,
    ledger_type TEXT NOT NULL,
    organization_id UUID REFERENCES political_organizations(id),
    election_id UUID REFERENCES elections(id),
    hub_politician_organization_id UUID,
    hub_politician_election_id UUID,
    hub_ledger_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_ledger_type CHECK (
        (ledger_type = 'political_fund' AND organization_id IS NOT NULL AND election_id IS NULL)
        OR
        (ledger_type = 'election_fund' AND election_id IS NOT NULL AND organization_id IS NULL)
    )
);

-- 補助科目
CREATE TABLE sub_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES auth.users(id) NOT NULL,
    ledger_type TEXT NOT NULL,
    parent_account_code TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 関係者（台帳間で共有）
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES auth.users(id) NOT NULL,
    contact_type TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    occupation TEXT,
    hub_organization_id UUID,
    is_name_private BOOLEAN NOT NULL DEFAULT FALSE,
    is_address_private BOOLEAN NOT NULL DEFAULT FALSE,
    is_occupation_private BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_reason_type TEXT,
    privacy_reason_other TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 台帳 ↔ 関係者（M:N）
CREATE TABLE ledger_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID REFERENCES ledgers(id) NOT NULL,
    contact_id UUID REFERENCES contacts(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (ledger_id, contact_id)
);

-- 仕訳
CREATE TABLE journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID REFERENCES ledgers(id) NOT NULL,
    journal_date DATE NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    submitted_by_user_id UUID REFERENCES auth.users(id) NOT NULL,
    approved_by_user_id UUID REFERENCES auth.users(id),
    contact_id UUID REFERENCES contacts(id),
    classification TEXT,
    non_monetary_basis TEXT,
    notes TEXT,
    amount_political_grant INTEGER DEFAULT 0,
    amount_political_fund INTEGER DEFAULT 0,
    amount_public_subsidy INTEGER DEFAULT 0,
    is_receipt_hard_to_collect BOOLEAN NOT NULL DEFAULT FALSE,
    receipt_hard_to_collect_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 仕訳明細
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID REFERENCES journals(id) ON DELETE CASCADE NOT NULL,
    account_code TEXT NOT NULL,
    sub_account_id UUID REFERENCES sub_accounts(id),
    debit_amount INTEGER NOT NULL DEFAULT 0,
    credit_amount INTEGER NOT NULL DEFAULT 0
);

-- メディア
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID REFERENCES auth.users(id),
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_assets_journal ON media_assets(journal_id);
CREATE INDEX idx_media_assets_user ON media_assets(uploaded_by_user_id);

-- 台帳メンバー（M:N）
CREATE TABLE ledger_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    ledger_id UUID REFERENCES ledgers(id) NOT NULL,
    role TEXT NOT NULL,
    invited_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- オーナーシップ移行
CREATE TABLE ownership_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID REFERENCES auth.users(id) NOT NULL,
    to_user_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'declined')),
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 取引下書き
CREATE TABLE transaction_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES auth.users(id) NOT NULL,
    ledger_id UUID REFERENCES ledgers(id),
    transaction_date DATE NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT,
    counterparty TEXT,
    source_type TEXT NOT NULL,
    source_account_name TEXT,
    source_transaction_id TEXT,
    source_raw_data JSONB,
    suggested_account_code TEXT,
    suggested_contact_id UUID REFERENCES contacts(id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'converted', 'ignored')),
    converted_journal_id UUID REFERENCES journals(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (owner_user_id, source_type, source_transaction_id)
);

CREATE INDEX idx_drafts_owner ON transaction_drafts(owner_user_id);
CREATE INDEX idx_drafts_status ON transaction_drafts(status);
CREATE INDEX idx_drafts_date ON transaction_drafts(transaction_date);

-- 年度締めステータス
CREATE TABLE ledger_year_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed', 'locked', 'temporary_unlock')),
    closed_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    storage_migrated_at TIMESTAMPTZ,
    temporary_unlock_at TIMESTAMPTZ,
    temporary_unlock_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ledger_id, fiscal_year)
);

CREATE INDEX idx_year_closures_ledger ON ledger_year_closures(ledger_id);
CREATE INDEX idx_year_closures_status ON ledger_year_closures(status);
CREATE INDEX idx_year_closures_fiscal_year ON ledger_year_closures(fiscal_year);

-- ============================================
-- Step 3: RLS 有効化 & ポリシー作成
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE political_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_year_closures ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- マスタ系
CREATE POLICY "Users can CRUD their own organizations" ON political_organizations
    FOR ALL USING (auth.uid() = owner_user_id);
CREATE POLICY "Users can CRUD their own elections" ON elections
    FOR ALL USING (auth.uid() = owner_user_id);

-- 台帳
CREATE POLICY "Users can CRUD their own ledgers" ON ledgers
    FOR ALL USING (auth.uid() = owner_user_id);

-- 関係者
CREATE POLICY "Users can CRUD their own contacts" ON contacts
    FOR ALL USING (auth.uid() = owner_user_id);

-- 台帳 ↔ 関係者
CREATE POLICY "Users can manage their ledger_contacts" ON ledger_contacts
    FOR ALL USING (
        ledger_id IN (SELECT id FROM ledgers WHERE owner_user_id = auth.uid())
    );

-- 補助科目
CREATE POLICY "Users can CRUD their own sub_accounts" ON sub_accounts
    FOR ALL USING (auth.uid() = owner_user_id);

-- メディア
CREATE POLICY "Users can manage their media assets" ON media_assets
    FOR ALL USING (
        auth.uid() = uploaded_by_user_id
        OR journal_id IN (
            SELECT j.id FROM journals j
            WHERE j.submitted_by_user_id = auth.uid()
        )
    );

-- オーナーシップ移行
CREATE POLICY "Allow individual read access" ON ownership_transfers
    FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Allow individual update access" ON ownership_transfers
    FOR UPDATE USING (auth.uid() = to_user_id);

-- 取引下書き
CREATE POLICY "Users can CRUD their own drafts" ON transaction_drafts
    FOR ALL USING (auth.uid() = owner_user_id);

-- 年度締め
CREATE POLICY "Users can manage closures for their ledgers" ON ledger_year_closures
    FOR ALL USING (
        ledger_id IN (
            SELECT id FROM ledgers WHERE owner_user_id = auth.uid()
        )
    );

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$ BEGIN
    RAISE NOTICE '✅ Ledger DB 初期化完了（v6 正規化スキーマ）';
    RAISE NOTICE '  - politicians / 中間テーブル: 廃止';
    RAISE NOTICE '  - ledgers: 新規作成（organization_id / election_id 直接参照）';
    RAISE NOTICE '  - ledger_contacts: 新規作成（M:N 中間テーブル）';
    RAISE NOTICE '  - contacts: 台帳間共有（プライバシー設定グローバル）';
    RAISE NOTICE '  - journals: ledger_id 直接FK（1:N）';
END $$;
