/**
 * ロール・権限の定義
 *
 * SPECIFICATION.md の 2.11 に基づく
 */

// ロール定義
export type AppRole =
  | "admin"
  | "accountant"
  | "approver"
  | "submitter"
  | "viewer";

// 権限定義
export type AppPermission =
  | "viewLedger"
  | "submitJournal"
  | "registerJournal"
  | "approveJournal"
  | "manageMembers"
  | "manageContacts"
  | "editLedgerSettings";

// 各ロールが持つ権限の定義
export const rolePermissions: Record<AppRole, AppPermission[]> = {
  // 管理者: 全権限（下書きも可能）
  admin: [
    "viewLedger",
    "submitJournal",
    "registerJournal",
    "approveJournal",
    "manageMembers",
    "editLedgerSettings",
    "manageContacts",
  ],
  // 会計担当者: admin からメンバー管理権限を除いた権限
  accountant: [
    "viewLedger",
    "submitJournal",
    "registerJournal",
    "approveJournal",
    "editLedgerSettings",
    "manageContacts",
  ],
  // 承認者: 起票・承認可能（即時登録不可）
  approver: ["viewLedger", "submitJournal", "approveJournal", "manageContacts"],
  // 起票者: 起票のみ
  submitter: ["viewLedger", "submitJournal", "manageContacts"],
  // 閲覧者: 閲覧のみ
  viewer: ["viewLedger"],
};

// 日本語表示名
export const roleDisplayNames: Record<AppRole, string> = {
  admin: "管理者",
  accountant: "会計担当者",
  approver: "承認者",
  submitter: "起票者",
  viewer: "閲覧者",
};

// ロールの説明
export const roleDescriptions: Record<AppRole, string> = {
  admin: "全ての操作が可能。メンバーの招待・削除も可能。",
  accountant: "仕訳の登録・承認、設定変更が可能。メンバー管理は不可。",
  approver: "仕訳の起票・承認が可能。即時登録は不可。",
  submitter: "仕訳の起票のみ可能。承認は不可。",
  viewer: "閲覧のみ可能。編集操作は不可。",
};

// 権限の日本語表示名
export const permissionDisplayNames: Record<AppPermission, string> = {
  viewLedger: "台帳の閲覧",
  submitJournal: "仕訳の起票（下書き保存）",
  registerJournal: "仕訳の即時登録（自己承認）",
  approveJournal: "仕訳の承認・却下",
  manageMembers: "メンバーの招待・削除・権限変更",
  manageContacts: "関係者マスタの編集",
  editLedgerSettings: "台帳設定の編集",
};

/**
 * ロールが特定の権限を持つか確認
 */
export function hasPermission(
  role: AppRole,
  permission: AppPermission
): boolean {
  const permissions = rolePermissions[role];
  return permissions?.includes(permission) ?? false;
}

/**
 * DB の文字列から AppRole に変換
 * 不正な値の場合は viewer を返す
 */
export function roleFromString(roleString: string): AppRole {
  const validRoles: AppRole[] = [
    "admin",
    "accountant",
    "approver",
    "submitter",
    "viewer",
  ];
  if (validRoles.includes(roleString as AppRole)) {
    return roleString as AppRole;
  }
  return "viewer";
}

/**
 * registerJournal 権限を持つロールはセルフ承認が可能
 * （自分の仕訳を即座に承認済みにできる）
 */
export function canSelfApprove(role: AppRole): boolean {
  return hasPermission(role, "registerJournal");
}

/**
 * 選択可能なロール一覧を取得
 * （自分より高い権限のロールは選択不可にする場合などに使用）
 */
export function getAssignableRoles(currentRole: AppRole): AppRole[] {
  const roleHierarchy: AppRole[] = [
    "admin",
    "accountant",
    "approver",
    "submitter",
    "viewer",
  ];
  const currentIndex = roleHierarchy.indexOf(currentRole);

  // admin は全てのロールを割り当て可能
  if (currentRole === "admin") {
    return roleHierarchy;
  }

  // それ以外は自分以下のロールのみ割り当て可能
  return roleHierarchy.slice(currentIndex);
}
