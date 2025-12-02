class LedgerMember {
  final String id;
  final String userId;
  final String? organizationId;
  final String? electionId;
  final String role;
  final String invitedByUserId;
  final DateTime createdAt;

  LedgerMember({
    required this.id,
    required this.userId,
    this.organizationId,
    this.electionId,
    required this.role,
    required this.invitedByUserId,
    required this.createdAt,
  });

  factory LedgerMember.fromJson(Map<String, dynamic> json) {
    return LedgerMember(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      organizationId: json['organization_id'] as String?,
      electionId: json['election_id'] as String?,
      role: json['role'] as String,
      invitedByUserId: json['invited_by_user_id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'organization_id': organizationId,
      'election_id': electionId,
      'role': role,
      'invited_by_user_id': invitedByUserId,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
