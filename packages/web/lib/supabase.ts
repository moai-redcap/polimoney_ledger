/**
 * Supabase クライアント（Ledger 用）
 *
 * USE_MOCK_MODE に応じてテストユーザーのデータを取得するためのヘルパー
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { USE_MOCK_MODE, TEST_USER_ID } from "./hub-client.ts";

// ============================================
// 環境変数
// ============================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ============================================
// Supabase クライアント（遅延初期化）
// ============================================

let _publicClient: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

/**
 * 公開クライアント（anon key / publishable key）
 * RLS が適用される通常のクライアント
 */
export function getPublicClient(): SupabaseClient {
  if (!_publicClient) {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is not set");
    }
    _publicClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return _publicClient;
}

/**
 * サービスクライアント（service_role key）
 * RLS をバイパスする管理用クライアント
 * ⚠️ サーバーサイドでのみ使用すること
 */
export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
    }
    _serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _serviceClient;
}

/**
 * モードに応じた Supabase クライアントを取得
 *
 * - USE_MOCK_MODE=true: service_role クライアント（テストユーザーのデータにアクセス）
 * - USE_MOCK_MODE=false: 公開クライアント（RLS 適用）
 */
export function getSupabaseClient(): SupabaseClient {
  if (USE_MOCK_MODE) {
    return getServiceClient();
  }
  return getPublicClient();
}

/**
 * テストユーザー ID を取得
 * USE_MOCK_MODE=true の場合は固定のテストユーザー ID を返す
 */
export function getEffectiveUserId(actualUserId: string | null): string {
  if (USE_MOCK_MODE) {
    return TEST_USER_ID;
  }
  if (!actualUserId) {
    throw new Error("User ID is required");
  }
  return actualUserId;
}

// ============================================
// データ取得ヘルパー（USE_MOCK_MODE 対応）
// ============================================

/**
 * 政治家一覧を取得
 */
export async function getPoliticians(userId: string | null) {
  const client = getSupabaseClient();
  const effectiveUserId = getEffectiveUserId(userId);

  const { data, error } = await client
    .from("politicians")
    .select("*")
    .eq("owner_user_id", effectiveUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 政治団体一覧を取得
 */
export async function getOrganizations(userId: string | null) {
  const client = getSupabaseClient();
  const effectiveUserId = getEffectiveUserId(userId);

  const { data, error } = await client
    .from("political_organizations")
    .select("*")
    .eq("owner_user_id", effectiveUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 選挙一覧を取得
 */
export async function getElections(userId: string | null) {
  const client = getSupabaseClient();
  const effectiveUserId = getEffectiveUserId(userId);

  const { data, error } = await client
    .from("elections")
    .select("*, politicians(name)")
    .eq("owner_user_id", effectiveUserId)
    .order("election_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 関係者（取引先）一覧を取得
 */
export async function getContacts(userId: string | null) {
  const client = getSupabaseClient();
  const effectiveUserId = getEffectiveUserId(userId);

  const { data, error } = await client
    .from("contacts")
    .select("*")
    .eq("owner_user_id", effectiveUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 仕訳一覧を取得（選挙 or 政治団体）
 */
export async function getJournals(
  userId: string | null,
  filter: { electionId?: string; organizationId?: string }
) {
  const client = getSupabaseClient();
  const effectiveUserId = getEffectiveUserId(userId);

  let query = client
    .from("journals")
    .select("*, contacts(name), journal_entries(*)")
    .eq("submitted_by_user_id", effectiveUserId);

  if (filter.electionId) {
    query = query.eq("election_id", filter.electionId);
  }
  if (filter.organizationId) {
    query = query.eq("organization_id", filter.organizationId);
  }

  const { data, error } = await query.order("journal_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 仕訳詳細を取得
 */
export async function getJournal(userId: string | null, journalId: string) {
  const client = getSupabaseClient();
  const effectiveUserId = getEffectiveUserId(userId);

  const { data, error } = await client
    .from("journals")
    .select("*, contacts(*), journal_entries(*), media_assets(*)")
    .eq("id", journalId)
    .eq("submitted_by_user_id", effectiveUserId)
    .single();

  if (error) throw error;
  return data;
}
