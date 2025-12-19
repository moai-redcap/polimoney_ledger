/**
 * オーナー譲渡申請 API
 *
 * GET /api/ownership-transfers - 自分宛ての申請一覧を取得
 * POST /api/ownership-transfers - 譲渡申請を作成
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface CreateTransferRequest {
  to_user_id: string;
  organization_id?: string;
  election_id?: string;
}

export const handler: Handlers = {
  // 自分宛ての申請一覧を取得
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const supabase = getSupabaseClient(userId);

      // 自分宛ての pending 申請を取得
      const { data: transfers, error } = await supabase
        .from("ownership_transfers")
        .select(
          `
          id,
          from_user_id,
          to_user_id,
          organization_id,
          election_id,
          status,
          requested_at,
          political_organizations (
            id,
            name
          ),
          elections (
            id,
            election_name
          )
        `
        )
        .eq("to_user_id", userId)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch transfers:", error);
        return new Response(
          JSON.stringify({ error: "申請の取得に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data: transfers }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching transfers:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  // 譲渡申請を作成
  async POST(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body: CreateTransferRequest = await req.json();

      // バリデーション
      if (!body.to_user_id?.trim()) {
        return new Response(
          JSON.stringify({ error: "譲渡先のユーザーを選択してください" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!body.organization_id && !body.election_id) {
        return new Response(
          JSON.stringify({ error: "政治団体または選挙のIDが必要です" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (body.organization_id && body.election_id) {
        return new Response(
          JSON.stringify({
            error: "政治団体と選挙のIDは同時に指定できません",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (body.to_user_id === userId) {
        return new Response(
          JSON.stringify({ error: "自分自身には譲渡できません" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const supabase = getSupabaseClient(userId);

      // オーナー権限の確認と既存申請チェック
      if (body.organization_id) {
        const { data: org, error: orgError } = await supabase
          .from("political_organizations")
          .select("id, owner_user_id")
          .eq("id", body.organization_id)
          .single();

        if (orgError || !org) {
          return new Response(
            JSON.stringify({ error: "政治団体が見つかりません" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }

        if (org.owner_user_id !== userId) {
          return new Response(
            JSON.stringify({ error: "オーナーのみが譲渡申請を作成できます" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }

        const { data: existingTransfer } = await supabase
          .from("ownership_transfers")
          .select("id")
          .eq("organization_id", body.organization_id)
          .eq("status", "pending")
          .single();

        if (existingTransfer) {
          return new Response(
            JSON.stringify({
              error: "この台帳には既に保留中の譲渡申請があります",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      if (body.election_id) {
        const { data: election, error: elecError } = await supabase
          .from("elections")
          .select("id, owner_user_id")
          .eq("id", body.election_id)
          .single();

        if (elecError || !election) {
          return new Response(
            JSON.stringify({ error: "選挙が見つかりません" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }

        if (election.owner_user_id !== userId) {
          return new Response(
            JSON.stringify({ error: "オーナーのみが譲渡申請を作成できます" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }

        const { data: existingTransfer } = await supabase
          .from("ownership_transfers")
          .select("id")
          .eq("election_id", body.election_id)
          .eq("status", "pending")
          .single();

        if (existingTransfer) {
          return new Response(
            JSON.stringify({
              error: "この台帳には既に保留中の譲渡申請があります",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // 譲渡申請を作成
      const { data: transfer, error: insertError } = await supabase
        .from("ownership_transfers")
        .insert({
          from_user_id: userId,
          to_user_id: body.to_user_id,
          organization_id: body.organization_id || null,
          election_id: body.election_id || null,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create transfer:", insertError);
        return new Response(
          JSON.stringify({ error: "譲渡申請の作成に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data: transfer, message: "譲渡申請を作成しました" }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error creating transfer:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
