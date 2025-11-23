class SubAccount {
  final String id;
  final String ownerUserId;
  final String ledgerType;
  final String parentAccountCode;
  final String name;
  final DateTime createdAt;

  SubAccount({
    required this.id,
    required this.ownerUserId,
    required this.ledgerType,
    required this.parentAccountCode,
    required this.name,
    required this.createdAt,
  });

  factory SubAccount.fromJson(Map<String, dynamic> json) {
    return SubAccount(
      id: json['id'] as String,
      ownerUserId: json['owner_user_id'] as String,
      ledgerType: json['ledger_type'] as String,
      parentAccountCode: json['parent_account_code'] as String,
      name: json['name'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'owner_user_id': ownerUserId,
      'ledger_type': ledgerType,
      'parent_account_code': parentAccountCode,
      'name': name,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
