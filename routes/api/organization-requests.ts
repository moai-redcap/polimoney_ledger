import { Handlers } from "$fresh/server.ts";
import {
  createOrganizationRequest,
  type CreateOrganizationRequestInput,
} from "../../lib/hub-client.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = (await req.json()) as CreateOrganizationRequestInput;

      // バリデーション
      if (
        !body.name ||
        !body.type ||
        !body.evidence_type ||
        !body.evidence_file_url
      ) {
        return new Response(
          JSON.stringify({
            error: "name, type, evidence_type, evidence_file_url は必須です",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 団体タイプのバリデーション
      const validTypes = [
        "political_party",
        "support_group",
        "fund_management",
        "other",
      ];
      if (!validTypes.includes(body.type)) {
        return new Response(
          JSON.stringify({
            error: `type は ${validTypes.join(
              ", "
            )} のいずれかである必要があります`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 証明書タイプのバリデーション
      const validEvidenceTypes = [
        "registration_form",
        "name_list",
        "financial_report",
      ];
      if (!validEvidenceTypes.includes(body.evidence_type)) {
        return new Response(
          JSON.stringify({
            error: `evidence_type は ${validEvidenceTypes.join(
              ", "
            )} のいずれかである必要があります`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Hub API にリクエストを送信
      const result = await createOrganizationRequest(body);

      return new Response(JSON.stringify({ data: result }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Organization request creation failed:", error);
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "リクエストの作成に失敗しました",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
