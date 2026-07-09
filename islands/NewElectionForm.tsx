import { useState } from "preact/hooks";

interface Election {
  id: string;
  name: string;
  type: string;
  election_date: string;
}

interface VerifiedPolitician {
  id: string;
  name: string;
  name_kana: string | null;
  party: string | null;
}

interface NewElectionFormProps {
  hubElections: Election[];
  verifiedPolitician: VerifiedPolitician | null;
}

const ELECTION_TYPES: Record<string, string> = {
  HR: "衆議院議員選挙",
  HC: "参議院議員選挙",
  PG: "都道府県知事選挙",
  PA: "都道府県議会選挙",
  GM: "市区町村長選挙",
  CM: "市区町村議会選挙",
};

// 年ごとにグループ化
function groupByYear(elections: Election[]): Record<string, Election[]> {
  return elections.reduce((acc, election) => {
    const year = new Date(election.election_date).getFullYear().toString();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(election);
    return acc;
  }, {} as Record<string, Election[]>);
}

export default function NewElectionForm({
  hubElections,
  verifiedPolitician,
}: NewElectionFormProps) {
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const groupedByYear = groupByYear(hubElections);
  const years = Object.keys(groupedByYear).sort(
    (a, b) => Number(b) - Number(a),
  );

  // フィルタリング
  const filteredElections = hubElections.filter((election) => {
    const matchesSearch = searchQuery === "" ||
      election.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || election.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredGroupedByYear = groupByYear(filteredElections);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!selectedElectionId) {
      setError("選挙を選択してください");
      return;
    }

    if (!verifiedPolitician) {
      setError("政治家として認証されていません");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedElection = hubElections.find(
        (e) => e.id === selectedElectionId,
      );

      const response = await fetch("/api/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hub_election_id: selectedElectionId,
          election_name: selectedElection?.name,
          election_date: selectedElection?.election_date,
          hub_politician_id: verifiedPolitician.id,
          politician_name: verifiedPolitician.name,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "選挙台帳の作成に失敗しました");
      }

      const result = await response.json();
      // 作成した選挙台帳ページにリダイレクト
      window.location.href = `/elections/${result.election_id}/ledger`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: 選挙を選択 */}
      <div style="margin-bottom: var(--st-sys-spacing-6);">
        <h3 class="font-bold text-lg mb-4">1. 選挙を選択</h3>

        {/* 検索・フィルター */}
        <div class="flex flex-col md:flex-row gap-4 mb-4">
          <div class="form-control flex-1">
            <label class="st-field__label-wrapper">
              <span class="st-field__label">🔍 検索</span>
            </label>
            <input
              type="text"
              placeholder="選挙名で検索..."
              class="st-input"
              value={searchQuery}
              onInput={(e) =>
                setSearchQuery((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="st-field">
            <label class="st-field__label-wrapper">
              <span class="st-field__label">種別</span>
            </label>
            <select
              class="st-select"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter((e.target as HTMLSelectElement).value)}
            >
              <option value="all">すべて</option>
              {Object.entries(ELECTION_TYPES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 選挙一覧 */}
        <div class="max-h-96 overflow-y-auto border rounded-lg">
          {filteredElections.length === 0
            ? (
              <div class="p-8 text-center text-base-content/70">
                該当する選挙が見つかりません
              </div>
            )
            : (
              Object.keys(filteredGroupedByYear)
                .sort((a, b) => Number(b) - Number(a))
                .map((year) => (
                  <div key={year}>
                    <div class="sticky top-0 bg-base-200 px-4 py-2 font-bold border-b">
                      📅 {year}年
                    </div>
                    {filteredGroupedByYear[year].map((election) => (
                      <label
                        key={election.id}
                        class={`flex items-center gap-4 p-4 cursor-pointer hover:bg-base-200 border-b ${
                          selectedElectionId === election.id
                            ? "bg-primary/10"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="election"
                          style="accent-color: var(--st-sys-color-primary);"
                          checked={selectedElectionId === election.id}
                          onChange={() => setSelectedElectionId(election.id)}
                        />
                        <div style="flex: 1;">
                          <div style="font-weight: 500;">{election.name}</div>
                          <div class="flex gap-2 mt-1">
                            <span class="st-badge st-badge--sm st-badge--primary">
                              {ELECTION_TYPES[election.type] || election.type}
                            </span>
                            <span class="text-xs text-base-content/70">
                              {new Date(
                                election.election_date,
                              ).toLocaleDateString("ja-JP")}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ))
            )}
        </div>

        {/* 選挙が見つからない場合 */}
        <div class="alert alert-warning mt-4">
          <span>
            該当する選挙がない場合は、
            <a href="/elections/request" style="color: var(--st-sys-color-primary); text-decoration: underline;">
              登録をリクエスト
            </a>
            してください。
          </span>
        </div>
      </div>

      {/* 送信ボタン */}
      <div class="st-flex st-gap-4">
        <a href="/elections" class="st-button st-button--outlined">
          キャンセル
        </a>
        <button
          type="submit"
          class={`btn btn-primary flex-1 ${isSubmitting ? "loading" : ""}`}
          disabled={isSubmitting || !selectedElectionId || !verifiedPolitician}
        >
          {isSubmitting ? "作成中..." : "選挙台帳を作成"}
        </button>
      </div>
    </form>
  );
}
