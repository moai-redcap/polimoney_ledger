/// 勘定科目の主要な5分類
enum AccountType {
  asset,
  liability,
  equity,
  revenue,
  expense,
  unknown, // For safety
}

/// データベースの`account_master`テーブルに対応するモデル
class AccountMaster {
  final String code;
  final String name;
  final AccountType type;
  final String reportCategory;
  final List<String> availableLedgerTypes;

  const AccountMaster({
    required this.code,
    required this.name,
    required this.type,
    required this.reportCategory,
    required this.availableLedgerTypes,
  });

  factory AccountMaster.fromJson(Map<String, dynamic> json) {
    return AccountMaster(
      code: json['code'] as String,
      name: json['name'] as String,
      type: _parseAccountType(json['type'] as String?),
      reportCategory: json['report_category'] as String,
      availableLedgerTypes: (json['available_ledger_types'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );
  }

  static AccountType _parseAccountType(String? type) {
    switch (type) {
      case 'asset':
        return AccountType.asset;
      case 'liability':
        return AccountType.liability;
      case 'equity':
        return AccountType.equity;
      case 'revenue':
        return AccountType.revenue;
      case 'expense':
        return AccountType.expense;
      default:
        return AccountType.unknown;
    }
  }
}
