import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/core/constants/account_master.dart';

class AccountRepository {
  final SupabaseClient _supabase;

  // Simple in-memory cache
  List<AccountMaster>? _cachedAccounts;

  AccountRepository(this._supabase);

  /// Fetches the list of master accounts from the database.
  /// Uses a cache to avoid repeated calls.
  Future<List<AccountMaster>> getAccountMasters() async {
    if (_cachedAccounts != null) {
      return _cachedAccounts!;
    }

    final response = await _supabase.from('account_master').select();
    
    final accounts = (response as List)
        .map((json) => AccountMaster.fromJson(json))
        .toList();
        
    _cachedAccounts = accounts;
    return accounts;
  }
}
