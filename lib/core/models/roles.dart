/// ユーザーに割り当てられる役割。
/// この enum の `name` (例: 'admin') が DB の `ledger_members.role` (text) に保存される。
enum AppRole {
  admin,
  approver,
  submitter,
  viewer,
}

/// DB の文字列から AppRole enum に変換するヘルパー
AppRole roleFromString(String roleString) {
  return AppRole.values.firstWhere(
    (role) => role.name == roleString,
    orElse: () => AppRole.viewer, // 不正な値の場合は閲覧者扱い
  );
}

/// UI 表示用の役割名（日本語）
String getRoleDisplayName(AppRole role) {
  switch (role) {
    case AppRole.admin:
      return '管理者';
    case AppRole.approver:
      return '承認者';
    case AppRole.submitter:
      return '起票者';
    case AppRole.viewer:
      return '閲覧者';
  }
}
