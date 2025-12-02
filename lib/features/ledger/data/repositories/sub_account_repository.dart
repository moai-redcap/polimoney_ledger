import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/models/sub_account.dart';

class SubAccountRepository {
  final SupabaseClient _supabase;

  SubAccountRepository(this._supabase);

  Future<List<SubAccount>> fetchSubAccounts(
    String userId,
    String ledgerType,
  ) async {
    final response = await _supabase
        .from('sub_accounts')
        .select()
        .eq('owner_user_id', userId)
        .eq('ledger_type', ledgerType);

    return (response as List).map((json) => SubAccount.fromJson(json)).toList();
  }

  Future<SubAccount> createSubAccount({
    required String ownerUserId,
    required String ledgerType,
    required String parentAccountCode,
    required String name,
  }) async {
    final response = await _supabase
        .from('sub_accounts')
        .insert({
          'owner_user_id': ownerUserId,
          'ledger_type': ledgerType,
          'parent_account_code': parentAccountCode,
          'name': name,
        })
        .select()
        .single();

    return SubAccount.fromJson(response);
  }

  Future<void> deleteSubAccount(String subAccountId) async {
    await _supabase.from('sub_accounts').delete().eq('id', subAccountId);
  }
}
