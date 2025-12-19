import { useState } from "preact/hooks";
import {
  AppRole,
  roleDisplayNames,
  roleDescriptions,
} from "../lib/permissions.ts";

interface Member {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  invited_by_user_id: string;
  email?: string;
  display_name?: string;
}

interface MemberManagerProps {
  organizationId?: string;
  electionId?: string;
  initialMembers: Member[];
  isOwner: boolean;
  canManageMembers: boolean;
}

interface PendingTransfer {
  id: string;
  to_user_id?: string;
  to_user_name?: string;
  status: string;
  requested_at: string;
}

export default function MemberManager({
  organizationId,
  electionId,
  initialMembers,
  isOwner,
  canManageMembers,
}: MemberManagerProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 招待フォームの状態
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("viewer");

  // オーナー譲渡の状態
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [pendingTransfer, setPendingTransfer] =
    useState<PendingTransfer | null>(null);

  const roles: AppRole[] = [
    "admin",
    "accountant",
    "approver",
    "submitter",
    "viewer",
  ];

  const handleInvite = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!inviteEmail.trim()) {
      setError("メールアドレスを入力してください");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          organization_id: organizationId || undefined,
          election_id: electionId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "招待に失敗しました");
      }

      const { data, message } = await res.json();
      setMembers([...members, { ...data, email: inviteEmail }]);
      setSuccess(message || "招待を送信しました");
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("viewer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: AppRole) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新に失敗しました");
      }

      const { data } = await res.json();
      setMembers(
        members.map((m) => (m.id === memberId ? { ...m, ...data } : m))
      );
      setSuccess("権限を更新しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (member: Member) => {
    if (
      !confirm(
        `${
          member.display_name || member.email || "このメンバー"
        } を削除しますか？`
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "削除に失敗しました");
      }

      setMembers(members.filter((m) => m.id !== member.id));
      setSuccess("メンバーを削除しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // オーナー譲渡申請を作成
  const handleTransfer = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!selectedMemberId) {
      setError("譲渡先のメンバーを選択してください");
      setIsLoading(false);
      return;
    }

    const selectedMember = members.find((m) => m.user_id === selectedMemberId);

    try {
      const res = await fetch("/api/ownership-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: selectedMemberId,
          organization_id: organizationId || undefined,
          election_id: electionId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "譲渡申請の作成に失敗しました");
      }

      const { data, message } = await res.json();
      setPendingTransfer({
        id: data.id,
        to_user_id: selectedMemberId,
        to_user_name:
          selectedMember?.display_name || selectedMember?.email || "メンバー",
        status: data.status,
        requested_at: data.requested_at,
      });
      setSuccess(message || "譲渡申請を作成しました");
      setShowTransferModal(false);
      setSelectedMemberId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 譲渡申請をキャンセル
  const handleCancelTransfer = async () => {
    if (!pendingTransfer) return;
    if (!confirm("譲渡申請をキャンセルしますか？")) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/ownership-transfers/${pendingTransfer.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "キャンセルに失敗しました");
      }

      setPendingTransfer(null);
      setSuccess("譲渡申請をキャンセルしました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* 通知 */}
      {error && (
        <div class="alert alert-error mb-4">
          <span>{error}</span>
          <button class="btn btn-ghost btn-sm" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {success && (
        <div class="alert alert-success mb-4">
          <span>{success}</span>
          <button class="btn btn-ghost btn-sm" onClick={() => setSuccess(null)}>
            ✕
          </button>
        </div>
      )}

      {/* ヘッダー */}
      <div class="flex justify-between items-center mb-6">
        <div>
          <p class="text-base-content/70">
            台帳にアクセスできるメンバーと権限を管理します。
          </p>
        </div>
        {canManageMembers && (
          <button
            class="btn btn-primary"
            onClick={() => setShowInviteModal(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            メンバーを招待
          </button>
        )}
      </div>

      {/* オーナー情報 */}
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="card-title text-base">オーナー</h3>
              <p class="text-base-content/70 text-sm">
                オーナーはこの台帳の所有者です。全ての権限を持ち、削除できません。
              </p>
              <div class="flex items-center gap-2 mt-2">
                <span class="badge badge-primary">オーナー</span>
                {isOwner && (
                  <span class="text-sm text-success">（あなた）</span>
                )}
              </div>
            </div>
            {isOwner && !pendingTransfer && (
              <button
                class="btn btn-outline btn-sm"
                onClick={() => setShowTransferModal(true)}
              >
                オーナーを譲渡
              </button>
            )}
          </div>

          {/* 譲渡申請中の表示 */}
          {pendingTransfer && (
            <div class="alert alert-info mt-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                class="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p class="font-medium">オーナー譲渡申請中</p>
                <p class="text-sm">
                  {pendingTransfer.to_user_name} さんへの譲渡申請が承認待ちです
                </p>
              </div>
              <button
                class="btn btn-ghost btn-sm"
                onClick={handleCancelTransfer}
                disabled={isLoading}
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      </div>

      {/* メンバー一覧 */}
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title text-base">メンバー</h3>

          {members.length === 0 ? (
            <p class="text-base-content/70 py-4">
              まだメンバーがいません。「メンバーを招待」から追加してください。
            </p>
          ) : (
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>メンバー</th>
                    <th>権限</th>
                    <th>招待日</th>
                    {canManageMembers && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} class="hover">
                      <td>
                        <div>
                          <div class="font-medium">
                            {member.display_name || member.email || "未設定"}
                          </div>
                          {member.email && (
                            <div class="text-sm text-base-content/60">
                              {member.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {canManageMembers ? (
                          <select
                            class="select select-bordered select-sm"
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(
                                member.id,
                                (e.target as HTMLSelectElement).value as AppRole
                              )
                            }
                            disabled={isLoading}
                          >
                            {roles.map((role) => (
                              <option key={role} value={role}>
                                {roleDisplayNames[role]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span class="badge">
                            {roleDisplayNames[member.role]}
                          </span>
                        )}
                      </td>
                      <td class="text-sm text-base-content/70">
                        {new Date(member.created_at).toLocaleDateString(
                          "ja-JP"
                        )}
                      </td>
                      {canManageMembers && (
                        <td>
                          <button
                            class="btn btn-ghost btn-sm text-error"
                            onClick={() => handleDelete(member)}
                            disabled={isLoading}
                          >
                            削除
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 権限の説明 */}
      <div class="card bg-base-100 shadow-xl mt-6">
        <div class="card-body">
          <h3 class="card-title text-base">権限の説明</h3>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>権限</th>
                  <th>説明</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role}>
                    <td class="font-medium">{roleDisplayNames[role]}</td>
                    <td class="text-base-content/70">
                      {roleDescriptions[role]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 招待モーダル */}
      {showInviteModal && (
        <dialog class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">メンバーを招待</h3>

            {error && (
              <div class="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleInvite}>
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-medium">
                    メールアドレス<span class="text-error ml-1">*</span>
                  </span>
                </label>
                <input
                  type="email"
                  class="input input-bordered"
                  value={inviteEmail}
                  onChange={(e) =>
                    setInviteEmail((e.target as HTMLInputElement).value)
                  }
                  placeholder="example@example.com"
                />
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-medium">権限</span>
                </label>
                <select
                  class="select select-bordered"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      (e.target as HTMLSelectElement).value as AppRole
                    )
                  }
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {roleDisplayNames[role]} - {roleDescriptions[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div class="modal-action">
                <button
                  type="button"
                  class="btn btn-ghost"
                  onClick={() => {
                    setShowInviteModal(false);
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <span class="loading loading-spinner loading-sm" />
                  )}
                  招待を送信
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button
              onClick={() => {
                setShowInviteModal(false);
                setError(null);
              }}
            >
              close
            </button>
          </form>
        </dialog>
      )}

      {/* オーナー譲渡モーダル */}
      {showTransferModal && (
        <dialog class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">オーナーを譲渡</h3>

            <div class="alert alert-warning mb-4">
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
                <p class="font-medium">注意</p>
                <p class="text-sm">
                  オーナーを譲渡すると、この台帳の所有権が移ります。
                  あなたは管理者として残ります。
                </p>
              </div>
            </div>

            {error && (
              <div class="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleTransfer}>
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-medium">
                    譲渡先のメンバー<span class="text-error ml-1">*</span>
                  </span>
                </label>
                {members.length === 0 ? (
                  <div class="alert alert-info">
                    <span>
                      譲渡先となるメンバーがいません。先にメンバーを招待してください。
                    </span>
                  </div>
                ) : (
                  <select
                    class="select select-bordered"
                    value={selectedMemberId}
                    onChange={(e) =>
                      setSelectedMemberId((e.target as HTMLSelectElement).value)
                    }
                  >
                    <option value="">選択してください</option>
                    {members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.display_name || member.email || "未設定"} (
                        {roleDisplayNames[member.role]})
                      </option>
                    ))}
                  </select>
                )}
                <label class="label">
                  <span class="label-text-alt text-base-content/60">
                    選択したメンバーに譲渡申請メールが送信されます
                  </span>
                </label>
              </div>

              <div class="modal-action">
                <button
                  type="button"
                  class="btn btn-ghost"
                  onClick={() => {
                    setShowTransferModal(false);
                    setError(null);
                    setSelectedMemberId("");
                  }}
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  class="btn btn-warning"
                  disabled={isLoading || members.length === 0}
                >
                  {isLoading && (
                    <span class="loading loading-spinner loading-sm" />
                  )}
                  譲渡申請を送信
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button
              onClick={() => {
                setShowTransferModal(false);
                setError(null);
                setSelectedMemberId("");
              }}
            >
              close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
