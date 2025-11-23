class Contact {
  final String id;
  final String ownerUserId;
  final String contactType;
  final String name;
  final String? address;
  final String? occupation;
  final bool isNamePrivate;
  final bool isAddressPrivate;
  final bool isOccupationPrivate;
  final String? privacyReasonType;
  final String? privacyReasonOther;
  final DateTime createdAt;

  Contact({
    required this.id,
    required this.ownerUserId,
    required this.contactType,
    required this.name,
    this.address,
    this.occupation,
    required this.isNamePrivate,
    required this.isAddressPrivate,
    required this.isOccupationPrivate,
    this.privacyReasonType,
    this.privacyReasonOther,
    required this.createdAt,
  });

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json['id'] as String,
      ownerUserId: json['owner_user_id'] as String,
      contactType: json['contact_type'] as String,
      name: json['name'] as String,
      address: json['address'] as String?,
      occupation: json['occupation'] as String?,
      isNamePrivate: json['is_name_private'] as bool,
      isAddressPrivate: json['is_address_private'] as bool,
      isOccupationPrivate: json['is_occupation_private'] as bool,
      privacyReasonType: json['privacy_reason_type'] as String?,
      privacyReasonOther: json['privacy_reason_other'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'owner_user_id': ownerUserId,
      'contact_type': contactType,
      'name': name,
      'address': address,
      'occupation': occupation,
      'is_name_private': isNamePrivate,
      'is_address_private': isAddressPrivate,
      'is_occupation_private': isOccupationPrivate,
      'privacy_reason_type': privacyReasonType,
      'privacy_reason_other': privacyReasonOther,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
