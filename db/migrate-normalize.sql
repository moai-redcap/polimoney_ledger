-- ============================================
-- Polimoney Ledger: 正規化マイグレーション
-- 実行前に必ずバックアップを取得すること！
-- ============================================

BEGIN;

-- ============================================
-- Step 1: 中間テーブル作成
-- ============================================

-- 政治家 ↔ 政治団体
CREATE TABLE IF NOT EXISTS politician_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID NOT NULL REFERENCES politicians(id),
    organization_id UUID NOT NULL REFERENCES political_organizations(id),
    hub_politician_organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (politician_id, organization_id)
);

-- 政治家 ↔ 選挙
CREATE TABLE IF NOT EXISTS politician_elections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID NOT NULL REFERENCES politicians(id),
    election_id UUID NOT NULL REFERENCES elections(id),
    hub_politician_election_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (politician_id, election_id)
);

-- 台帳テーブル
CREATE TABLE IF NOT EXISTS ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES auth.users(id) NOT NULL,
    ledger_type TEXT NOT NULL,
    politician_organization_id UUID REFERENCES politician_organizations(id),
    politician_election_id UUID REFERENCES politician_elections(id),
    hub_ledger_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_ledger_type CHECK (
        (ledger_type = 'political_fund' AND politician_organization_id IS NOT NULL AND politician_election_id IS NULL)
        OR
        (ledger_type = 'election_fund' AND politician_election_id IS NOT NULL AND politician_organization_id IS NULL)
    )
);

-- RLS
ALTER TABLE politician_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE politician_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their politician_organizations" ON politician_organizations;
CREATE POLICY "Users can manage their politician_organizations" ON politician_organizations
    FOR ALL USING (
        politician_id IN (SELECT id FROM politicians WHERE owner_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage their politician_elections" ON politician_elections;
CREATE POLICY "Users can manage their politician_elections" ON politician_elections
    FOR ALL USING (
        politician_id IN (SELECT id FROM politicians WHERE owner_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can CRUD their own ledgers" ON ledgers;
CREATE POLICY "Users can CRUD their own ledgers" ON ledgers
    FOR ALL USING (auth.uid() = owner_user_id);

-- ============================================
-- Step 2: 既存データを中間テーブルに移行
-- ============================================

-- elections.politician_id → politician_elections
-- 注意: elections テーブルに politician_id がある場合のみ
INSERT INTO politician_elections (politician_id, election_id)
SELECT politician_id, id
FROM elections
WHERE politician_id IS NOT NULL
ON CONFLICT (politician_id, election_id) DO NOTHING;

-- ============================================
-- Step 3: 既存の journals から台帳を生成
-- ============================================

-- 政治団体台帳: organization_id が設定されている journals からユニークな台帳を作成
-- 注意: 既存の journals では「同じ organization_id の仕訳群」が1つの台帳を構成
INSERT INTO ledgers (owner_user_id, ledger_type, politician_organization_id)
SELECT DISTINCT
    j.submitted_by_user_id,
    'political_fund',
    -- politician_organizations 中間テーブルはまだ空の場合がある
    -- ので、一旦 NULL で作成し、後で紐付ける
    NULL
FROM journals j
WHERE j.organization_id IS NOT NULL;

-- 選挙台帳: election_id が設定されている journals からユニークな台帳を作成
INSERT INTO ledgers (owner_user_id, ledger_type, politician_election_id)
SELECT DISTINCT
    j.submitted_by_user_id,
    'election_fund',
    pe.id
FROM journals j
JOIN elections e ON j.election_id = e.id
LEFT JOIN politician_elections pe ON pe.election_id = e.id
WHERE j.election_id IS NOT NULL;

-- ============================================
-- Step 4: journals に ledger_id カラム追加 & データ移行
-- ============================================

ALTER TABLE journals ADD COLUMN IF NOT EXISTS ledger_id UUID REFERENCES ledgers(id);

-- 政治団体台帳の仕訳を紐付け
UPDATE journals j SET ledger_id = (
    SELECT l.id FROM ledgers l
    WHERE l.ledger_type = 'political_fund'
      AND l.owner_user_id = j.submitted_by_user_id
    LIMIT 1
)
WHERE j.organization_id IS NOT NULL AND j.ledger_id IS NULL;

-- 選挙台帳の仕訳を紐付け
UPDATE journals j SET ledger_id = (
    SELECT l.id FROM ledgers l
    JOIN politician_elections pe ON l.politician_election_id = pe.id
    WHERE l.ledger_type = 'election_fund'
      AND pe.election_id = j.election_id
      AND l.owner_user_id = j.submitted_by_user_id
    LIMIT 1
)
WHERE j.election_id IS NOT NULL AND j.ledger_id IS NULL;

-- ============================================
-- Step 5: contacts に ledger_id カラム追加 & データ移行
-- ============================================

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ledger_id UUID REFERENCES ledgers(id);

-- 選挙台帳の関係者を紐付け
UPDATE contacts c SET ledger_id = (
    SELECT l.id FROM ledgers l
    JOIN politician_elections pe ON l.politician_election_id = pe.id
    WHERE l.ledger_type = 'election_fund'
      AND pe.election_id = c.election_id
      AND l.owner_user_id = c.owner_user_id
    LIMIT 1
)
WHERE c.election_id IS NOT NULL AND c.ledger_id IS NULL;

-- 政治団体台帳の関係者を紐付け
UPDATE contacts c SET ledger_id = (
    SELECT l.id FROM ledgers l
    WHERE l.ledger_type = 'political_fund'
      AND l.owner_user_id = c.owner_user_id
    LIMIT 1
)
WHERE c.organization_id IS NOT NULL AND c.ledger_id IS NULL;

-- ============================================
-- Step 6: ledger_members / transaction_drafts / ledger_year_closures
--         に ledger_id カラム追加 & データ移行
-- ============================================

ALTER TABLE ledger_members ADD COLUMN IF NOT EXISTS ledger_id UUID REFERENCES ledgers(id);

UPDATE ledger_members lm SET ledger_id = (
    SELECT l.id FROM ledgers l
    JOIN politician_elections pe ON l.politician_election_id = pe.id
    WHERE pe.election_id = lm.election_id
    LIMIT 1
)
WHERE lm.election_id IS NOT NULL AND lm.ledger_id IS NULL;

UPDATE ledger_members lm SET ledger_id = (
    SELECT l.id FROM ledgers l
    WHERE l.ledger_type = 'political_fund'
    LIMIT 1
)
WHERE lm.organization_id IS NOT NULL AND lm.ledger_id IS NULL;

ALTER TABLE transaction_drafts ADD COLUMN IF NOT EXISTS ledger_id UUID REFERENCES ledgers(id);

UPDATE transaction_drafts td SET ledger_id = (
    SELECT l.id FROM ledgers l
    JOIN politician_elections pe ON l.politician_election_id = pe.id
    WHERE pe.election_id = td.election_id
      AND l.owner_user_id = td.owner_user_id
    LIMIT 1
)
WHERE td.election_id IS NOT NULL AND td.ledger_id IS NULL;

UPDATE transaction_drafts td SET ledger_id = (
    SELECT l.id FROM ledgers l
    WHERE l.ledger_type = 'political_fund'
      AND l.owner_user_id = td.owner_user_id
    LIMIT 1
)
WHERE td.organization_id IS NOT NULL AND td.ledger_id IS NULL;

-- ledger_year_closures: organization_id → ledger_id
ALTER TABLE ledger_year_closures ADD COLUMN IF NOT EXISTS ledger_id_new UUID REFERENCES ledgers(id);

UPDATE ledger_year_closures lyc SET ledger_id_new = (
    SELECT l.id FROM ledgers l
    WHERE l.ledger_type = 'political_fund'
    LIMIT 1
)
WHERE lyc.organization_id IS NOT NULL AND lyc.ledger_id_new IS NULL;

-- ============================================
-- Step 7: 旧カラム削除
-- ============================================

-- journals
ALTER TABLE journals DROP COLUMN IF EXISTS organization_id;
ALTER TABLE journals DROP COLUMN IF EXISTS election_id;

-- contacts
ALTER TABLE contacts DROP COLUMN IF EXISTS organization_id;
ALTER TABLE contacts DROP COLUMN IF EXISTS election_id;

-- elections
ALTER TABLE elections DROP COLUMN IF EXISTS politician_id;

-- ledger_members
ALTER TABLE ledger_members DROP COLUMN IF EXISTS organization_id;
ALTER TABLE ledger_members DROP COLUMN IF EXISTS election_id;

-- transaction_drafts
ALTER TABLE transaction_drafts DROP COLUMN IF EXISTS organization_id;
ALTER TABLE transaction_drafts DROP COLUMN IF EXISTS election_id;

-- ledger_year_closures: organization_id → ledger_id
ALTER TABLE ledger_year_closures DROP COLUMN IF EXISTS organization_id;
ALTER TABLE ledger_year_closures RENAME COLUMN ledger_id_new TO ledger_id;

-- ============================================
-- Step 8: CHECK 制約を一時的に無効化してデータ修正
-- （ledgers テーブルの valid_ledger_type 制約用）
-- ============================================

-- ledger_type の CHECK 制約は CREATE TABLE 時に設定済みなので、
-- ここでは journals.ledger_id の NOT NULL 制約を追加
-- 注意: 既存データが全て移行済みであることを確認してから実行
-- ALTER TABLE journals ALTER COLUMN ledger_id SET NOT NULL;

COMMIT;
