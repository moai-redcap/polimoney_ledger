import 'package:polimoney_ledger/core/models/roles.dart';
import 'package:polimoney_ledger/core/models/permissions.dart';

/// 各役割が持つ権限の静的な定義マップ
const Map<AppRole, Set<AppPermission>> rolePermissions = {
  // 管理者
  AppRole.admin: {
    AppPermission.viewLedger,
    AppPermission.registerJournal,
    AppPermission.approveJournal,
    AppPermission.manageMembers,
    AppPermission.editLedgerSettings,
    AppPermission.manageContacts,
  },
  // 承認者
  AppRole.approver: {
    AppPermission.viewLedger,
    AppPermission.submitJournal,
    AppPermission.approveJournal,
    AppPermission.manageContacts,
  },
  // 起票者
  AppRole.submitter: {
    AppPermission.viewLedger,
    AppPermission.submitJournal,
    AppPermission.manageContacts,
  },
  // 閲覧者
  AppRole.viewer: {
    AppPermission.viewLedger,
  },
};

/// 権限チェックを行うためのヘルパークラス（または Provider）
class PermissionService {
  /// 現在のユーザー（`myRole`）が、指定された権限（`permission`）を持つかチェックする
  bool hasPermission(AppRole myRole, AppPermission permission) {
    final permissions = rolePermissions[myRole];
    if (permissions == null) {
      return false;
    }
    return permissions.contains(permission);
  }
}
