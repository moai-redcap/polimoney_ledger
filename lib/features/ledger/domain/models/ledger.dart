class Ledger {
  final String id;
  final String name;
  final String type; // 'organization' or 'election'
  final DateTime createdAt;

  Ledger({
    required this.id,
    required this.name,
    required this.type,
    required this.createdAt,
  });

  factory Ledger.fromJson(Map<String, dynamic> json) {
    return Ledger(
      id: json['id'],
      name: json['name'],
      type: json['type'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}
