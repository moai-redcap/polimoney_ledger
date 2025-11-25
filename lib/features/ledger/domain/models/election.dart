import 'package:polimoney_ledger/features/ledger/domain/models/politician.dart';

class Election {
  final String id;
  final String ownerUserId;
  final String politicianId;
  final String electionName;
  final DateTime electionDate;
  final DateTime createdAt;
  final Politician? politician; // Can be null

  Election({
    required this.id,
    required this.ownerUserId,
    required this.politicianId,
    required this.electionName,
    required this.electionDate,
    required this.createdAt,
    this.politician, // Make politician optional in constructor
  });

  factory Election.fromJson(Map<String, dynamic> json) {
    return Election(
      id: json['id'] as String,
      ownerUserId: json['owner_user_id'] as String,
      politicianId: json['politician_id'] as String,
      electionName: json['election_name'] as String,
      electionDate: DateTime.parse(json['election_date'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      // If politician data is nested in the JSON, parse it
      politician: json['politician'] != null
          ? Politician.fromJson(json['politician'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'owner_user_id': ownerUserId,
      'politician_id': politicianId,
      'election_name': electionName,
      'election_date': electionDate.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'politician': politician?.toJson(),
    };
  }
}
