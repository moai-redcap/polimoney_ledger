class Journal {
  final String id;
  final String? organizationId;
  final String? electionId;
  final DateTime journalDate;
  final String description;
  final String status;
  final String submittedByUserId;
  final String? approvedByUserId;
  final String contactId;
  final String? classification;
  final String? nonMonetaryBasis;
  final String? notes;
  final int amountPoliticalGrant;
  final int amountPoliticalFund;
  final bool isReceiptHardToCollect;
  final String? receiptHardToCollectReason;
  final DateTime createdAt;
  final int? totalAmount; // New field for the calculated amount

  Journal({
    required this.id,
    this.organizationId,
    this.electionId,
    required this.journalDate,
    required this.description,
    required this.status,
    required this.submittedByUserId,
    this.approvedByUserId,
    required this.contactId,
    this.classification,
    this.nonMonetaryBasis,
    this.notes,
    this.amountPoliticalGrant = 0,
    this.amountPoliticalFund = 0,
    this.isReceiptHardToCollect = false,
    this.receiptHardToCollectReason,
    required this.createdAt,
    this.totalAmount, // Add to constructor
  });

  factory Journal.fromJson(Map<String, dynamic> json) {
    return Journal(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String?,
      electionId: json['election_id'] as String?,
      journalDate: DateTime.parse(json['journal_date'] as String),
      description: json['description'] as String,
      status: json['status'] as String,
      submittedByUserId: json['submitted_by_user_id'] as String,
      approvedByUserId: json['approved_by_user_id'] as String?,
      contactId: json['contact_id'] as String,
      classification: json['classification'] as String?,
      nonMonetaryBasis: json['non_monetary_basis'] as String?,
      notes: json['notes'] as String?,
      amountPoliticalGrant: json['amount_political_grant'] as int? ?? 0,
      amountPoliticalFund: json['amount_political_fund'] as int? ?? 0,
      isReceiptHardToCollect:
          json['is_receipt_hard_to_collect'] as bool? ?? false,
      receiptHardToCollectReason:
          json['receipt_hard_to_collect_reason'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      // Parse the new field from the RPC response
      totalAmount: json['total_amount'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organization_id': organizationId,
      'election_id': electionId,
      'journal_date': journalDate.toIso8601String(),
      'description': description,
      'status': status,
      'submitted_by_user_id': submittedByUserId,
      'approved_by_user_id': approvedByUserId,
      'contact_id': contactId,
      'classification': classification,
      'non_monetary_basis': nonMonetaryBasis,
      'notes': notes,
      'amount_political_grant': amountPoliticalGrant,
      'amount_political_fund': amountPoliticalFund,
      'is_receipt_hard_to_collect': isReceiptHardToCollect,
      'receipt_hard_to_collect_reason': receiptHardToCollectReason,
      'created_at': createdAt.toIso8601String(),
      'total_amount': totalAmount,
    };
  }
}
