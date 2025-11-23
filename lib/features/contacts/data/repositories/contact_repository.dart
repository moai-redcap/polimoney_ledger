import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/models/contact.dart';

class ContactRepository {
  final SupabaseClient _supabase;

  ContactRepository(this._supabase);

  Future<List<Contact>> fetchContacts(String userId) async {
    final response = await _supabase
        .from('contacts')
        .select()
        .eq('owner_user_id', userId)
        .order('created_at', ascending: false);

    return (response as List).map((json) => Contact.fromJson(json)).toList();
  }

  Future<Contact> createContact(Contact contact) async {
    final response = await _supabase
        .from('contacts')
        .insert({
          'owner_user_id': contact.ownerUserId,
          'contact_type': contact.contactType,
          'name': contact.name,
          'address': contact.address,
          'occupation': contact.occupation,
          'is_name_private': contact.isNamePrivate,
          'is_address_private': contact.isAddressPrivate,
          'is_occupation_private': contact.isOccupationPrivate,
          'privacy_reason_type': contact.privacyReasonType,
          'privacy_reason_other': contact.privacyReasonOther,
        })
        .select()
        .single();

    return Contact.fromJson(response);
  }

  Future<void> updateContact(Contact contact) async {
    await _supabase
        .from('contacts')
        .update({
          'contact_type': contact.contactType,
          'name': contact.name,
          'address': contact.address,
          'occupation': contact.occupation,
          'is_name_private': contact.isNamePrivate,
          'is_address_private': contact.isAddressPrivate,
          'is_occupation_private': contact.isOccupationPrivate,
          'privacy_reason_type': contact.privacyReasonType,
          'privacy_reason_other': contact.privacyReasonOther,
        })
        .eq('id', contact.id);
  }

  Future<void> deleteContact(String contactId) async {
    await _supabase.from('contacts').delete().eq('id', contactId);
  }
}
