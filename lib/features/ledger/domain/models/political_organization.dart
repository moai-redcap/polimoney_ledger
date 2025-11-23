class PoliticalOrganization {
  final String id;
  final String ownerUserId;
  final String name;
  final DateTime createdAt;

  PoliticalOrganization({
    required this.id,
    required this.ownerUserId,
    required this.name,
    required this.createdAt,
  });

  factory PoliticalOrganization.fromJson(Map<String, dynamic> json) {
    return PoliticalOrganization(
      id: json['id'] as String,
      ownerUserId: json['owner_user_id'] as String,
      name: json['name'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'owner_user_id': ownerUserId,
      'name': name,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
