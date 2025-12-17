import { useState, useEffect, useRef } from "preact/hooks";
import type { Election } from "../lib/hub-client.ts";

interface Props {
  initialElections: Election[];
}

const ELECTION_TYPES: Record<string, string> = {
  HR: "衆議院議員選挙",
  HC: "参議院議員選挙",
  PG: "都道府県知事選挙",
  CM: "市区町村長選挙",
  GM: "議会議員選挙",
};

export default function ElectionSelector({ initialElections }: Props) {
  const [elections] = useState<Election[]>(initialElections);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  // フィルタリング
  const filteredElections = elections.filter((election) => {
    const matchesSearch =
      election.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      election.area_code.includes(searchTerm);
    const matchesType = !selectedType || election.type === selectedType;
    return matchesSearch && matchesType;
  });

  // 年でグループ化
  const groupedByYear = filteredElections.reduce((acc, election) => {
    const year = new Date(election.election_date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(election);
    return acc;
  }, {} as Record<number, Election[]>);

  const years = Object.keys(groupedByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div>
      {/* 検索・フィルター */}
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex flex-wrap gap-4">
            <div class="form-control flex-1 min-w-[200px]">
              <label class="label">
                <span class="label-text">🔍 検索</span>
              </label>
              <input
                type="text"
                value={searchTerm}
                onInput={(e) =>
                  setSearchTerm((e.target as HTMLInputElement).value)
                }
                placeholder="選挙名または選挙区コードで検索..."
                class="input input-bordered w-full"
              />
            </div>
            <div class="form-control w-48">
              <label class="label">
                <span class="label-text">種別</span>
              </label>
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType((e.target as HTMLSelectElement).value)
                }
                class="select select-bordered w-full"
              >
                <option value="">すべて</option>
                {Object.entries(ELECTION_TYPES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 選挙一覧 */}
      <div class="space-y-6">
        {years.length > 0 ? (
          years.map((year) => (
            <div key={year}>
              <h2 class="text-xl font-semibold mb-3 flex items-center">
                <span class="mr-2">📅</span>
                {year}年
              </h2>
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body p-0">
                  <ul class="menu p-0">
                    {groupedByYear[year].map((election) => (
                      <li key={election.id}>
                        <button
                          class="flex justify-between items-start py-4 px-6 rounded-none border-b border-base-200 last:border-b-0"
                          onClick={() => {
                            alert(
                              `選挙を選択: ${election.name}\nID: ${election.id}`
                            );
                          }}
                        >
                          <div class="text-left">
                            <h3 class="font-medium">{election.name}</h3>
                            <div class="mt-1 flex flex-wrap gap-2">
                              <span class="badge badge-info">
                                {ELECTION_TYPES[election.type] || election.type}
                              </span>
                              <span class="text-sm opacity-70">
                                選挙区: {election.area_code}
                              </span>
                            </div>
                          </div>
                          <div class="text-sm opacity-70">
                            {new Date(
                              election.election_date
                            ).toLocaleDateString("ja-JP")}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body items-center text-center">
              <p class="text-base-content/70">該当する選挙が見つかりません</p>
            </div>
          </div>
        )}
      </div>

      {/* 登録リクエストセクション */}
      <div role="alert" class="alert alert-warning mt-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h3 class="font-bold">該当する選挙がない場合</h3>
          <p class="text-sm">
            お探しの選挙が見つからない場合は、登録をリクエストできます。
          </p>
        </div>
        <button
          class="btn btn-sm btn-warning"
          onClick={() => setShowRequestForm(true)}
        >
          登録をリクエスト
        </button>
      </div>

      {/* 登録リクエストモーダル */}
      {showRequestForm && (
        <ElectionRequestModal onClose={() => setShowRequestForm(false)} />
      )}
    </div>
  );
}

// 選挙登録リクエストモーダル
function ElectionRequestModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "GM",
    area_description: "",
    election_date: "",
    evidence_url: "",
    notes: "",
    requested_by_email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLElement>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // Cally カレンダーの change イベントをリッスン
  useEffect(() => {
    const calendar = calendarRef.current;
    if (calendar) {
      const handleChange = (e: Event) => {
        const target = e.target as HTMLElement & { value: string };
        if (target.value) {
          setFormData((prev) => ({ ...prev, election_date: target.value }));
          setShowCalendar(false);
        }
      };
      calendar.addEventListener("change", handleChange);
      return () => calendar.removeEventListener("change", handleChange);
    }
  }, [showCalendar]);

  // カレンダー外クリックで閉じる
  useEffect(() => {
    if (!showCalendar) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarContainerRef.current &&
        !calendarContainerRef.current.contains(e.target as Node)
      ) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendar]);

  // 日付を表示用にフォーマット
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "日付を選択";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.election_date) {
      setError("選挙日を入力してください");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/election-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "リクエストの送信に失敗しました");
      }

      alert("登録リクエストを送信しました。承認されるまでお待ちください。");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <form method="dialog">
          <button
            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </form>
        <h3 class="font-bold text-lg mb-4">選挙の登録リクエスト</h3>

        {error && (
          <div role="alert" class="alert alert-error mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                選挙名 <span class="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  name: (e.target as HTMLInputElement).value,
                })
              }
              placeholder="例: 2025年〇〇市議会議員選挙"
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">
                選挙種別 <span class="text-error">*</span>
              </span>
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: (e.target as HTMLSelectElement).value,
                })
              }
              class="select select-bordered w-full"
            >
              {Object.entries(ELECTION_TYPES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">
                選挙区の説明 <span class="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              required
              value={formData.area_description}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  area_description: (e.target as HTMLInputElement).value,
                })
              }
              placeholder="例: 東京都第1区、〇〇市全域"
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">
                選挙日（投開票日） <span class="text-error">*</span>
              </span>
            </label>
            <div class="relative">
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                class="input input-bordered w-full text-left flex items-center justify-between"
              >
                <span class={formData.election_date ? "" : "text-base-content/50"}>
                  {formatDateDisplay(formData.election_date)}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 opacity-70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
              {showCalendar && (
                <div
                  ref={calendarContainerRef}
                  class="absolute z-50 mt-1 bg-base-100 border border-base-300 shadow-lg rounded-box p-2"
                >
                  {/* @ts-ignore Cally web component */}
                  <calendar-date
                    ref={calendarRef}
                    class="cally"
                    value={formData.election_date}
                  >
                    <svg
                      aria-label="Previous"
                      class="fill-current size-4"
                      slot="previous"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    <svg
                      aria-label="Next"
                      class="fill-current size-4"
                      slot="next"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                    {/* @ts-ignore Cally web component */}
                    <calendar-month />
                  </calendar-date>
                </div>
              )}
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">証明URL（選管サイト等）</span>
            </label>
            <input
              type="url"
              value={formData.evidence_url}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  evidence_url: (e.target as HTMLInputElement).value,
                })
              }
              placeholder="https://..."
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">連絡先メールアドレス</span>
            </label>
            <input
              type="email"
              value={formData.requested_by_email}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  requested_by_email: (e.target as HTMLInputElement).value,
                })
              }
              placeholder="example@email.com"
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">備考</span>
            </label>
            <textarea
              value={formData.notes}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  notes: (e.target as HTMLTextAreaElement).value,
                })
              }
              rows={3}
              class="textarea textarea-bordered w-full"
            />
          </div>

          <div class="modal-action">
            <button type="button" class="btn btn-ghost" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              class={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "送信中..." : "リクエストを送信"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
