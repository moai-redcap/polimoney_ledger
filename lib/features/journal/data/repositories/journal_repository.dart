import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/models/journal.dart';
import '../../domain/models/journal_entry.dart';

class JournalRepository {
  final SupabaseClient _supabase;

  JournalRepository(this._supabase);

  // --- Year Handling & Carry-over Methods ---
  Future<int> findInitialYear(String ledgerId, String ledgerType) async {
    final column = ledgerType == 'political_organization' ? 'organization_id' : 'election_id';
    final response = await _supabase.from('journals').select('journal_date').eq(column, ledgerId).order('journal_date', ascending: true).limit(1);
    if (response.isEmpty) return DateTime.now().year;
    return DateTime.parse(response.first['journal_date'] as String).year;
  }

  Future<List<int>> getAvailableYears(String ledgerId, String ledgerType) async {
    final column = ledgerType == 'political_organization' ? 'organization_id' : 'election_id';
    final response = await _supabase.from('journals').select('journal_date').eq(column, ledgerId);
    if (response.isEmpty) return [DateTime.now().year];
    final years = response.map((row) => DateTime.parse(row['journal_date'] as String).year).toSet().toList();
    years.sort((a, b) => b.compareTo(a));
    return years;
  }

  /// Calculates the carry-over balance from the previous year using an RPC function.
  Future<int> calculateCarryOver({
    required String ledgerId,
    required String ledgerType,
    required int year,
  }) async {
    final response = await _supabase.rpc(
      'calculate_carry_over',
      params: {
        'p_ledger_id': ledgerId,
        'p_ledger_type': ledgerType,
        'p_target_year': year,
      },
    );
    return response as int;
  }

  // --- Journal CRUD Methods ---
  Future<List<Journal>> fetchJournals({ required String ledgerId, required String ledgerType, required int year, }) async {
    final response = await _supabase.rpc(
      'get_journals_by_year',
      params: { 'p_ledger_id': ledgerId, 'p_ledger_type': ledgerType, 'p_year': year, },
    );
    return (response as List).map((json) => Journal.fromJson(json)).toList();
  }
  
  // ... (other methods are unchanged)
  Future<List<JournalEntry>> fetchJournalEntries(String journalId) async {
    final response = await _supabase.from('journal_entries').select().eq('journal_id', journalId);
    return (response as List).map((json) => JournalEntry.fromJson(json)).toList();
  }

  Future<void> createJournal({ required Journal journal, required List<JournalEntry> entries, }) async {
    // ...
  }

  Future<void> updateJournalStatus(String journalId, String status, String? approvedByUserId) async {
    // ...
  }

  Future<void> deleteJournal(String journalId) async {
    // ...
  }
}
