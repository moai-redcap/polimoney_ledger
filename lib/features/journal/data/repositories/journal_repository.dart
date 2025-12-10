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

  /// 仕訳ヘッダと明細を作成
  Future<String> createJournal({
    required String? organizationId,
    required String? electionId,
    required DateTime journalDate,
    required String description,
    required String status,
    required String submittedByUserId,
    String? approvedByUserId,
    required String contactId,
    String? classification,
    String? nonMonetaryBasis,
    String? notes,
    int amountPoliticalGrant = 0,
    int amountPoliticalFund = 0,
    bool isReceiptHardToCollect = false,
    String? receiptHardToCollectReason,
  }) async {
    final response = await _supabase
        .from('journals')
        .insert({
          'organization_id': organizationId,
          'election_id': electionId,
          'journal_date': journalDate.toIso8601String().substring(0, 10),
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
        })
        .select('id')
        .single();

    return response['id'] as String;
  }

  /// 仕訳明細を作成
  Future<void> createJournalEntry({
    required String journalId,
    required String accountCode,
    String? subAccountId,
    required int debitAmount,
    required int creditAmount,
  }) async {
    await _supabase.from('journal_entries').insert({
      'journal_id': journalId,
      'account_code': accountCode,
      'sub_account_id': subAccountId,
      'debit_amount': debitAmount,
      'credit_amount': creditAmount,
    });
  }

  Future<void> updateJournalStatus(String journalId, String status, String? approvedByUserId) async {
    // ...
  }

  Future<void> deleteJournal(String journalId) async {
    // ...
  }
}
