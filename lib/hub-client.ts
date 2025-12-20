/**
 * Polimoney Hub API クライアント
 */

// ============================================
// 環境変数から Hub API の設定を取得
// ============================================

/** 本番/開発の判定 */
// 注意: DENO_ENV は Deno Deploy で予約済みのため APP_ENV を使用
const IS_PRODUCTION = Deno.env.get("APP_ENV") === "production";

/**
 * Hub API URL / API Key
 * - 本番環境 (APP_ENV=production): PROD 設定を使用
 * - 開発環境 (APP_ENV!=production): DEV 設定を使用
 * - テストユーザー: 常に DEV 設定を使用
 */
const HUB_API_URL_PROD =
  Deno.env.get("HUB_API_URL_PROD") || "https://api.polimoney.dd2030.org";
const HUB_API_URL_DEV =
  Deno.env.get("HUB_API_URL_DEV") || "http://localhost:3722";
const HUB_API_KEY_PROD = Deno.env.get("HUB_API_KEY_PROD") || "";
const HUB_API_KEY_DEV = Deno.env.get("HUB_API_KEY_DEV") || "";

// デフォルト URL/Key（後方互換性のため）
const HUB_API_URL = IS_PRODUCTION ? HUB_API_URL_PROD : HUB_API_URL_DEV;
const HUB_API_KEY = IS_PRODUCTION ? HUB_API_KEY_PROD : HUB_API_KEY_DEV;

// API キーが設定されていない場合は起動時に警告
if (!HUB_API_KEY) {
  console.warn(
    `[Hub API] Warning: HUB_API_KEY is not set. API calls will fail. ` +
      `Set ${
        IS_PRODUCTION ? "HUB_API_KEY_PROD" : "HUB_API_KEY_DEV"
      } environment variable.`
  );
}

// ============================================
// テストユーザー定数（開発用ダミーデータの所有者）
// ============================================

/** テストユーザー ID（seed-supabase.ts と一致させる） */
export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * 指定されたユーザー ID がテストユーザーかどうかを判定
 */
export function isTestUser(userId: string | null | undefined): boolean {
  return userId === TEST_USER_ID;
}

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
  // 詳細情報【v2.1 追加】
  official_url: string | null;
  registration_authority: string | null;
  established_date: string | null;
  office_address: string | null;
  representative_name: string | null;
  accountant_name: string | null;
  contact_email: string | null;
  description: string | null;
  // SNS【v2.1 追加】
  sns_x: string | null;
  sns_instagram: string | null;
  sns_facebook: string | null;
  sns_tiktok: string | null;
  // ロゴ【v2.2 追加】
  logo_url: string | null;
  // 認証情報【v2.1 追加】
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 政治団体更新用入力【v2.1 追加, v2.2 logo_url追加】 */
export interface UpdateOrganizationInput {
  name?: string;
  type?: string;
  politician_id?: string | null;
  official_url?: string | null;
  registration_authority?: string | null;
  established_date?: string | null;
  office_address?: string | null;
  representative_name?: string | null;
  accountant_name?: string | null;
  contact_email?: string | null;
  description?: string | null;
  sns_x?: string | null;
  sns_instagram?: string | null;
  sns_facebook?: string | null;
  sns_tiktok?: string | null;
  logo_url?: string | null;
}

export interface Politician {
  id: string;
  name: string;
  name_kana: string | null;
  ledger_user_id: string | null;
  official_url: string | null;
  party: string | null;
  photo_url: string | null;
  is_verified: boolean;
  verified_at: string | null;
  verified_domain: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// 政治家認証申請 API【v2 追加】
// ============================================

export interface PoliticianVerification {
  id: string;
  ledger_user_id: string;
  politician_id: string | null;
  name: string;
  official_email: string;
  official_url: string | null;
  party: string | null;
  email_verified: boolean;
  status: "pending" | "email_sent" | "email_verified" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePoliticianVerificationInput {
  ledger_user_id: string;
  name: string;
  official_email: string;
  official_url?: string;
  party?: string;
  politician_id?: string;
}

// ============================================
// 政治団体管理者認証申請 API【v2 追加】
// ============================================

export interface OrganizationManagerVerification {
  id: string;
  ledger_user_id: string;
  organization_id: string | null;
  organization_name: string;
  official_email: string;
  role_in_organization: string | null;
  email_verified: boolean;
  status: "pending" | "email_sent" | "email_verified" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationManagerVerificationInput {
  ledger_user_id: string;
  organization_id?: string;
  organization_name: string;
  official_email: string;
  role_in_organization?: string;
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

interface FetchApiOptions extends RequestInit {
  /** テストユーザー判定用の userId（指定時はDEV環境を使用） */
  userId?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchApiOptions = {}
): Promise<T> {
  const { userId, ...fetchOptions } = options;

  // テストユーザーの場合は常に DEV 環境を使用
  const useDevEnv = userId ? isTestUser(userId) : !IS_PRODUCTION;
  const apiUrl = useDevEnv ? HUB_API_URL_DEV : HUB_API_URL_PROD;
  const apiKey = useDevEnv ? HUB_API_KEY_DEV : HUB_API_KEY_PROD;

  // API キーのバリデーション
  if (!apiKey) {
    throw new Error(
      `Hub API key is not configured. Set ${
        useDevEnv ? "HUB_API_KEY_DEV" : "HUB_API_KEY_PROD"
      } environment variable.`
    );
  }

  const headers = new Headers(fetchOptions.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-API-Key", apiKey);

  const url = `${apiUrl}${endpoint}`;
  console.log(
    `[Hub API] Fetching: ${url} (env: ${useDevEnv ? "DEV" : "PROD"})`
  );

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // レスポンスのContent-Typeを確認
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    console.error(
      `[Hub API] Non-JSON response from ${url}:`,
      text.slice(0, 200)
    );
    throw new Error(`Hub API returned non-JSON response (${response.status})`);
  }

  const json = await response.json();

  if (!response.ok) {
    throw new Error((json as ApiError).error || "API request failed");
  }

  return json as T;
}

// ============================================
// 選挙 API
// ============================================

export async function getElections(): Promise<Election[]> {
  const result = await fetchApi<ApiResponse<Election[]>>("/api/v1/elections");
  return result.data;
}

export async function getElection(id: string): Promise<Election> {
  const result = await fetchApi<ApiResponse<Election>>(
    `/api/v1/elections/${id}`
  );
  return result.data;
}

// ============================================
// 政治団体 API
// ============================================

export async function getOrganizations(): Promise<Organization[]> {
  const result = await fetchApi<ApiResponse<Organization[]>>(
    "/api/v1/organizations"
  );
  return result.data;
}

export async function getOrganization(
  id: string,
  options: { userId?: string } = {}
): Promise<Organization> {
  const result = await fetchApi<ApiResponse<Organization>>(
    `/api/v1/organizations/${id}`,
    { userId: options.userId }
  );
  return result.data;
}

/**
 * 政治団体を更新【v2.1 追加】
 */
export async function updateOrganization(
  id: string,
  data: UpdateOrganizationInput,
  options: { userId?: string } = {}
): Promise<Organization> {
  const result = await fetchApi<ApiResponse<Organization>>(
    `/api/v1/organizations/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
      userId: options.userId,
    }
  );
  return result.data;
}

/** 管理する政治団体（認証済み）【v2.1 更新】 */
export interface ManagedOrganization extends Organization {
  manager_verified_at: string;
  manager_verified_domain: string;
}

/**
 * ユーザーが管理する政治団体一覧を取得
 * Hub の organization_managers テーブルを参照
 */
export async function getManagedOrganizations(
  ledgerUserId: string
): Promise<ManagedOrganization[]> {
  try {
    const result = await fetchApi<ApiResponse<ManagedOrganization[]>>(
      `/api/v1/organizations/managed?ledger_user_id=${ledgerUserId}`,
      { userId: ledgerUserId }
    );
    return result.data;
  } catch (error) {
    // API が未実装の場合は空配列を返す
    console.warn("getManagedOrganizations API not implemented:", error);
    return [];
  }
}

// ============================================
// マスタデータ API（勘定科目など）
// ============================================

/** 勘定科目マスタ */
export interface AccountCode {
  code: string;
  name: string;
  name_kana: string | null;
  type: string; // 'asset', 'liability', 'equity', 'revenue', 'expense', 'subsidy'
  report_category: string; // '経常経費', '政治活動費', '選挙運動費用'
  ledger_type: string; // 'both', 'organization', 'election'
  is_public_subsidy_eligible: boolean;
  display_order: number;
  polimoney_category: string | null;
  parent_code: string | null;
  description: string | null;
}

/**
 * 勘定科目一覧を取得
 * @param params.ledgerType 台帳タイプでフィルタ ('organization' | 'election')
 * @param params.type 勘定科目タイプでフィルタ ('asset' | 'liability' | 'equity' | 'revenue' | 'expense')
 */
export async function getAccountCodes(params?: {
  ledgerType?: string;
  type?: string;
}): Promise<AccountCode[]> {
  const searchParams = new URLSearchParams();
  if (params?.ledgerType) searchParams.set("ledger_type", params.ledgerType);
  if (params?.type) searchParams.set("type", params.type);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const result = await fetchApi<ApiResponse<AccountCode[]>>(
    `/api/v1/master/account-codes${query}`
  );
  return result.data;
}

/**
 * 特定の勘定科目を取得
 */
export async function getAccountCode(code: string): Promise<AccountCode> {
  const result = await fetchApi<ApiResponse<AccountCode>>(
    `/api/v1/master/account-codes/${code}`
  );
  return result.data;
}

// ============================================
// 政治家 API
// ============================================

export async function getPoliticians(
  options: { userId?: string } = {}
): Promise<Politician[]> {
  const result = await fetchApi<ApiResponse<Politician[]>>(
    "/api/v1/politicians",
    { userId: options.userId }
  );
  return result.data;
}

export async function getPolitician(
  id: string,
  options: { userId?: string } = {}
): Promise<Politician> {
  const result = await fetchApi<ApiResponse<Politician>>(
    `/api/v1/politicians/${id}`,
    { userId: options.userId }
  );
  return result.data;
}

export async function createPolitician(
  data: {
    name: string;
    name_kana?: string;
  },
  options: { userId?: string } = {}
): Promise<Politician> {
  const result = await fetchApi<ApiResponse<Politician>>(
    "/api/v1/politicians",
    {
      method: "POST",
      body: JSON.stringify(data),
      userId: options.userId,
    }
  );
  return result.data;
}

/** 政治家更新用入力 */
export interface UpdatePoliticianInput {
  name?: string;
  name_kana?: string | null;
  official_url?: string | null;
  party?: string | null;
  photo_url?: string | null;
}

/**
 * 政治家情報を更新（認証済み政治家のみ）
 */
export async function updatePolitician(
  id: string,
  data: UpdatePoliticianInput,
  options: { userId?: string } = {}
): Promise<Politician> {
  const result = await fetchApi<ApiResponse<Politician>>(
    `/api/v1/politicians/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
      userId: options.userId,
    }
  );
  return result.data;
}

/**
 * 認証済み政治家かどうかをチェック
 * ledger_user_id で Hub を検索し、認証済みの政治家を返す
 */
export async function getVerifiedPoliticianByUserId(
  ledgerUserId: string
): Promise<Politician | null> {
  try {
    const politicians = await getPoliticians({ userId: ledgerUserId });
    const verified = politicians.find(
      (p) => p.ledger_user_id === ledgerUserId && p.is_verified
    );
    return verified || null;
  } catch (error) {
    console.warn("Failed to get verified politician:", error);
    return null;
  }
}

// ============================================
// 政治家認証申請 API【v2 追加】
// ============================================

/**
 * 政治家認証申請を作成
 */
export async function createPoliticianVerification(
  data: CreatePoliticianVerificationInput
): Promise<PoliticianVerification> {
  const result = await fetchApi<ApiResponse<PoliticianVerification>>(
    "/api/v1/politician-verifications",
    {
      method: "POST",
      body: JSON.stringify(data),
      userId: data.ledger_user_id,
    }
  );
  return result.data;
}

/**
 * ユーザーの政治家認証申請一覧を取得
 */
export async function getPoliticianVerificationsByUser(
  ledgerUserId: string
): Promise<PoliticianVerification[]> {
  const result = await fetchApi<ApiResponse<PoliticianVerification[]>>(
    `/api/v1/politician-verifications/user/${ledgerUserId}`,
    { userId: ledgerUserId }
  );
  return result.data;
}

/**
 * メール認証コードを送信
 */
export async function sendPoliticianVerificationCode(
  verificationId: string,
  options: { userId?: string } = {}
): Promise<{ message: string; code?: string }> {
  const result = await fetchApi<{ message: string; code?: string }>(
    `/api/v1/politician-verifications/${verificationId}/send-verification`,
    { method: "POST", userId: options.userId }
  );
  return result;
}

/**
 * メール認証コードを検証
 */
export async function verifyPoliticianEmail(
  verificationId: string,
  code: string,
  options: { userId?: string } = {}
): Promise<{ message: string }> {
  const result = await fetchApi<{ message: string }>(
    `/api/v1/politician-verifications/${verificationId}/verify-email`,
    {
      method: "POST",
      body: JSON.stringify({ code }),
      userId: options.userId,
    }
  );
  return result;
}

// ============================================
// 政治団体管理者認証申請 API【v2 追加】
// ============================================

/**
 * 政治団体管理者認証申請を作成
 */
export async function createOrganizationManagerVerification(
  data: CreateOrganizationManagerVerificationInput
): Promise<OrganizationManagerVerification> {
  const result = await fetchApi<ApiResponse<OrganizationManagerVerification>>(
    "/api/v1/organization-manager-verifications",
    {
      method: "POST",
      body: JSON.stringify(data),
      userId: data.ledger_user_id,
    }
  );
  return result.data;
}

/**
 * ユーザーの政治団体管理者認証申請一覧を取得
 */
export async function getOrganizationManagerVerificationsByUser(
  ledgerUserId: string
): Promise<OrganizationManagerVerification[]> {
  const result = await fetchApi<ApiResponse<OrganizationManagerVerification[]>>(
    `/api/v1/organization-manager-verifications/user/${ledgerUserId}`,
    { userId: ledgerUserId }
  );
  return result.data;
}

/**
 * メール認証コードを送信
 */
export async function sendOrganizationManagerVerificationCode(
  verificationId: string,
  options: { userId?: string } = {}
): Promise<{ message: string; code?: string }> {
  const result = await fetchApi<{ message: string; code?: string }>(
    `/api/v1/organization-manager-verifications/${verificationId}/send-verification`,
    { method: "POST", userId: options.userId }
  );
  return result;
}

/**
 * メール認証コードを検証
 */
export async function verifyOrganizationManagerEmail(
  verificationId: string,
  code: string,
  options: { userId?: string } = {}
): Promise<{ message: string }> {
  const result = await fetchApi<{ message: string }>(
    `/api/v1/organization-manager-verifications/${verificationId}/verify-email`,
    {
      method: "POST",
      body: JSON.stringify({ code }),
      userId: options.userId,
    }
  );
  return result;
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
  if (params?.politician_id) {
    searchParams.set("politician_id", params.politician_id);
  }
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
  if (params?.politician_id) {
    searchParams.set("politician_id", params.politician_id);
  }
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
  /** テストデータフラグ */
  is_test?: boolean;
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
  /** テストデータフラグ */
  is_test?: boolean;
}

export interface SyncLedgerResult {
  data: Record<string, unknown>;
  action: "created" | "updated";
}

/**
 * 仕訳データを Hub に同期
 */
export async function syncJournals(
  journals: SyncJournalInput[],
  options: { userId?: string } = {}
): Promise<SyncResult> {
  const result = await fetchApi<ApiResponse<SyncResult>>(
    "/api/v1/sync/journals",
    {
      method: "POST",
      body: JSON.stringify({ journals }),
      userId: options.userId,
    }
  );
  return result.data;
}

/**
 * 台帳データを Hub に同期
 */
export async function syncLedger(
  ledger: SyncLedgerInput,
  options: { userId?: string } = {}
): Promise<SyncLedgerResult> {
  const result = await fetchApi<SyncLedgerResult>("/api/v1/sync/ledger", {
    method: "POST",
    body: JSON.stringify({ ledger }),
    userId: options.userId,
  });
  return result;
}

/**
 * 同期ステータスを確認
 */
export async function getSyncStatus(
  options: { userId?: string } = {}
): Promise<SyncStatus> {
  const result = await fetchApi<SyncStatus>("/api/v1/sync/status", {
    userId: options.userId,
  });
  return result;
}

/**
 * 変更ログを記録
 */
export async function recordChangeLog(
  data: {
    ledger_source_id: string;
    change_summary: string;
    change_details?: Record<string, unknown>;
  },
  options: { userId?: string } = {}
): Promise<void> {
  await fetchApi("/api/v1/sync/change-log", {
    method: "POST",
    body: JSON.stringify(data),
    userId: options.userId,
  });
}
