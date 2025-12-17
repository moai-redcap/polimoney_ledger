/**
 * Polimoney Hub API クライアント
 */

// ============================================
// 環境変数から Hub API の設定を取得
// ============================================

/** モックモード: true の場合はテストユーザーのデータを使用 */
export const USE_MOCK_MODE = Deno.env.get("USE_MOCK_MODE") === "true";

/** 本番/開発の判定 */
const IS_PRODUCTION = Deno.env.get("DENO_ENV") === "production";

/**
 * Hub API URL
 * - USE_MOCK_MODE=true: 常に開発環境 URL を使用
 * - USE_MOCK_MODE=false: DENO_ENV に応じて切り替え
 */
const HUB_API_URL = USE_MOCK_MODE
  ? Deno.env.get("HUB_API_URL_DEV") || "http://localhost:3722"
  : IS_PRODUCTION
  ? Deno.env.get("HUB_API_URL_PROD") || "https://api.polimoney.dd2030.org"
  : Deno.env.get("HUB_API_URL_DEV") || "http://localhost:3722";

/**
 * Hub API キー
 * - USE_MOCK_MODE=true: 常に DEV キーを使用（テストデータは Hub の DEV 側に同期）
 * - USE_MOCK_MODE=false: DENO_ENV に応じて切り替え
 */
const HUB_API_KEY = USE_MOCK_MODE
  ? Deno.env.get("HUB_API_KEY_DEV") || ""
  : IS_PRODUCTION
  ? Deno.env.get("HUB_API_KEY_PROD") || ""
  : Deno.env.get("HUB_API_KEY_DEV") || "";

// ============================================
// テストユーザー定数（開発用ダミーデータの所有者）
// ============================================

/** テストユーザー ID（seed-supabase.ts と一致させる） */
export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// ============================================
// 型定義
// ============================================

export interface Election {
  id: string;
  name: string;
  type: string; // HR, HC, PG, CM, GM
  area_code: string;
  election_date: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  type: string; // political_party, support_group, fund_management, other
  politician_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Politician {
  id: string;
  name: string;
  name_kana: string | null;
  created_at: string;
  updated_at: string;
}

export interface ElectionRequest {
  id: string;
  name: string;
  type: string;
  area_description: string;
  election_date: string;
  requested_by_politician_id: string | null;
  requested_by_email: string | null;
  evidence_url: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "needs_info";
  rejection_reason: string | null;
  approved_election_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface OrganizationRequest {
  id: string;
  name: string;
  type: string;
  registration_authority: string | null;
  requested_by_politician_id: string | null;
  requested_by_email: string | null;
  evidence_type: string;
  evidence_file_url: string;
  evidence_file_name: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "needs_info";
  rejection_reason: string | null;
  approved_organization_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}

// ============================================
// ヘルパー関数
// ============================================

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-API-Key", HUB_API_KEY);

  const response = await fetch(`${HUB_API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error((json as ApiError).error || "API request failed");
  }

  return json as T;
}

// ============================================
// モックデータ（開発用）
// ============================================

const MOCK_ELECTIONS: Election[] = [
  {
    id: "mock-election-1",
    name: "第50回衆議院議員総選挙",
    type: "HR",
    area_code: "13101",
    election_date: "2024-10-27",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "mock-election-2",
    name: "令和7年東京都知事選挙",
    type: "PG",
    area_code: "13000",
    election_date: "2025-07-06",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "mock-election-3",
    name: "令和7年千代田区議会議員選挙",
    type: "CM",
    area_code: "13101",
    election_date: "2025-04-20",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: "mock-org-1",
    name: "○○後援会",
    type: "support_group",
    politician_id: "mock-pol-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "mock-org-2",
    name: "△△を応援する会",
    type: "fund_management",
    politician_id: "mock-pol-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// ============================================
// 選挙 API
// ============================================

export async function getElections(): Promise<Election[]> {
  if (USE_MOCK_MODE) {
    console.log("[Mock] getElections");
    return MOCK_ELECTIONS;
  }
  const result = await fetchApi<ApiResponse<Election[]>>("/api/v1/elections");
  return result.data;
}

export async function getElection(id: string): Promise<Election> {
  if (USE_MOCK_MODE) {
    console.log("[Mock] getElection:", id);
    const election = MOCK_ELECTIONS.find((e) => e.id === id);
    if (!election) throw new Error("Election not found");
    return election;
  }
  const result = await fetchApi<ApiResponse<Election>>(
    `/api/v1/elections/${id}`
  );
  return result.data;
}

// ============================================
// 政治団体 API
// ============================================

export async function getOrganizations(): Promise<Organization[]> {
  if (USE_MOCK_MODE) {
    console.log("[Mock] getOrganizations");
    return MOCK_ORGANIZATIONS;
  }
  const result = await fetchApi<ApiResponse<Organization[]>>(
    "/api/v1/organizations"
  );
  return result.data;
}

export async function getOrganization(id: string): Promise<Organization> {
  if (USE_MOCK_MODE) {
    console.log("[Mock] getOrganization:", id);
    const org = MOCK_ORGANIZATIONS.find((o) => o.id === id);
    if (!org) throw new Error("Organization not found");
    return org;
  }
  const result = await fetchApi<ApiResponse<Organization>>(
    `/api/v1/organizations/${id}`
  );
  return result.data;
}

// ============================================
// 政治家 API
// ============================================

export async function getPoliticians(): Promise<Politician[]> {
  const result = await fetchApi<ApiResponse<Politician[]>>(
    "/api/v1/politicians"
  );
  return result.data;
}

export async function createPolitician(data: {
  name: string;
  name_kana?: string;
}): Promise<Politician> {
  const result = await fetchApi<ApiResponse<Politician>>(
    "/api/v1/politicians",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  return result.data;
}

// ============================================
// 選挙登録リクエスト API
// ============================================

export interface CreateElectionRequestInput {
  name: string;
  type: string;
  area_description: string;
  election_date: string;
  requested_by_politician_id?: string;
  requested_by_email?: string;
  evidence_url?: string;
  notes?: string;
}

export async function createElectionRequest(
  data: CreateElectionRequestInput
): Promise<ElectionRequest> {
  const result = await fetchApi<ApiResponse<ElectionRequest>>(
    "/api/v1/election-requests",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  return result.data;
}

export async function getElectionRequests(params?: {
  politician_id?: string;
  status?: string;
}): Promise<ElectionRequest[]> {
  const searchParams = new URLSearchParams();
  if (params?.politician_id)
    searchParams.set("politician_id", params.politician_id);
  if (params?.status) searchParams.set("status", params.status);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const result = await fetchApi<ApiResponse<ElectionRequest[]>>(
    `/api/v1/election-requests${query}`
  );
  return result.data;
}

export async function getElectionRequest(id: string): Promise<ElectionRequest> {
  const result = await fetchApi<ApiResponse<ElectionRequest>>(
    `/api/v1/election-requests/${id}`
  );
  return result.data;
}

// ============================================
// 政治団体登録リクエスト API
// ============================================

export interface CreateOrganizationRequestInput {
  name: string;
  type: string;
  registration_authority?: string;
  requested_by_politician_id?: string;
  requested_by_email?: string;
  evidence_type: string;
  evidence_file_url: string;
  evidence_file_name?: string;
  notes?: string;
}

export async function createOrganizationRequest(
  data: CreateOrganizationRequestInput
): Promise<OrganizationRequest> {
  const result = await fetchApi<ApiResponse<OrganizationRequest>>(
    "/api/v1/organization-requests",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  return result.data;
}

export async function getOrganizationRequests(params?: {
  politician_id?: string;
  status?: string;
}): Promise<OrganizationRequest[]> {
  const searchParams = new URLSearchParams();
  if (params?.politician_id)
    searchParams.set("politician_id", params.politician_id);
  if (params?.status) searchParams.set("status", params.status);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const result = await fetchApi<ApiResponse<OrganizationRequest[]>>(
    `/api/v1/organization-requests${query}`
  );
  return result.data;
}

export async function getOrganizationRequest(
  id: string
): Promise<OrganizationRequest> {
  const result = await fetchApi<ApiResponse<OrganizationRequest>>(
    `/api/v1/organization-requests/${id}`
  );
  return result.data;
}

// ============================================
// 同期 API
// ============================================

/** Ledger から Hub に送信する同期データ */
export interface SyncJournalInput {
  /** Ledger 側の仕訳 ID */
  journal_source_id: string;
  /** Ledger 側の台帳 ID（Hub では ledger_source_id として使用） */
  ledger_source_id: string;
  /** 取引日 */
  date: string | null;
  /** 摘要（目的） */
  description: string | null;
  /** 金額 */
  amount: number;
  /** 関係者名（匿名化済み） */
  contact_name: string | null;
  /** 関係者種別 */
  contact_type: string | null;
  /** 勘定科目コード */
  account_code: string;
  /** 活動区分 (campaign / pre-campaign) */
  classification: string | null;
  /** 金銭以外の寄附の見積根拠 */
  non_monetary_basis: string | null;
  /** 備考 */
  note: string | null;
  /** 公費負担額 */
  public_expense_amount: number | null;
  /** コンテンツハッシュ（重複検知用） */
  content_hash: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  error_details?: { journal_source_id: string; error: string }[];
}

export interface SyncStatus {
  status: "ready" | "error";
  message: string;
  stats?: {
    public_ledgers: number;
    public_journals: number;
  };
}

/** Hub に送信する台帳データ */
export interface SyncLedgerInput {
  /** Ledger 側の台帳 ID */
  ledger_source_id: string;
  /** 政治家 ID (Hub の politicians.id) */
  politician_id: string;
  /** 政治団体 ID - 団体台帳の場合 */
  organization_id?: string;
  /** 選挙 ID - 選挙台帳の場合 */
  election_id?: string;
  /** 会計年度 */
  fiscal_year: number;
  /** 収入合計 */
  total_income: number;
  /** 支出合計 */
  total_expense: number;
  /** 仕訳件数 */
  journal_count: number;
}

export interface SyncLedgerResult {
  data: Record<string, unknown>;
  action: "created" | "updated";
}

/**
 * 仕訳データを Hub に同期
 */
export async function syncJournals(
  journals: SyncJournalInput[]
): Promise<SyncResult> {
  if (USE_MOCK_MODE) {
    console.log("[Mock] syncJournals:", journals.length, "件");
    return { created: journals.length, updated: 0, skipped: 0, errors: 0 };
  }
  const result = await fetchApi<ApiResponse<SyncResult>>(
    "/api/v1/sync/journals",
    {
      method: "POST",
      body: JSON.stringify({ journals }),
    }
  );
  return result.data;
}

/**
 * 台帳データを Hub に同期
 */
export async function syncLedger(
  ledger: SyncLedgerInput
): Promise<SyncLedgerResult> {
  if (USE_MOCK_MODE) {
    console.log("[Mock] syncLedger:", ledger.ledger_source_id);
    return { data: { id: "mock-ledger-id" }, action: "created" };
  }
  const result = await fetchApi<SyncLedgerResult>("/api/v1/sync/ledger", {
    method: "POST",
    body: JSON.stringify({ ledger }),
  });
  return result;
}

/**
 * 同期ステータスを確認
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  if (USE_MOCK_MODE) {
    console.log("[Mock] getSyncStatus");
    return { status: "ready", message: "Mock mode" };
  }
  const result = await fetchApi<SyncStatus>("/api/v1/sync/status");
  return result;
}

/**
 * 変更ログを記録
 */
export async function recordChangeLog(data: {
  ledger_source_id: string;
  change_summary: string;
  change_details?: Record<string, unknown>;
}): Promise<void> {
  if (USE_MOCK_MODE) {
    console.log("[Mock] recordChangeLog:", data.change_summary);
    return;
  }
  await fetchApi("/api/v1/sync/change-log", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
