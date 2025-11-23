class JournalEntry {
  final String id;
  final String journalId;
  final String accountCode;
  final String? subAccountId;
  final int debitAmount;
  final int creditAmount;

  JournalEntry({
    required this.id,
    required this.journalId,
    required this.accountCode,
    this.subAccountId,
    this.debitAmount = 0,
    this.creditAmount = 0,
  });

  factory JournalEntry.fromJson(Map<String, dynamic> json) {
    return JournalEntry(
      id: json['id'] as String,
      journalId: json['journal_id'] as String,
      accountCode: json['account_code'] as String,
      subAccountId: json['sub_account_id'] as String?,
      debitAmount: json['debit_amount'] as int? ?? 0,
      creditAmount: json['credit_amount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'journal_id': journalId,
      'account_code': accountCode,
      'sub_account_id': subAccountId,
      'debit_amount': debitAmount,
      'credit_amount': creditAmount,
    };
  }
}
