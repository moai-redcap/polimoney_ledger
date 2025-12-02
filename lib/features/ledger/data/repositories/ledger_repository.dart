import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/models/political_organization.dart';
import '../../domain/models/election.dart';
import '../../domain/models/ledger_member.dart';
import '../../domain/models/politician.dart';

class LedgerRepository {
  final SupabaseClient _supabase;

  LedgerRepository(this._supabase);

  Future<List<PoliticalOrganization>> fetchPoliticalOrganizations(
    String userId,
  ) async {
    final response = await _supabase
        .rpc('get_user_organizations', params: {'p_user_id': userId});
    
    return (response as List)
        .map((json) => PoliticalOrganization.fromJson(json))
        .toList();
  }
  
  Future<List<Election>> fetchElections(String userId) async {
    final rpcResponse = await _supabase
        .rpc('get_user_elections', params: {'p_user_id': userId});
    
    final electionsData = rpcResponse as List;
    if (electionsData.isEmpty) {
      return [];
    }

    final politicianIds = electionsData.map((json) => json['politician_id'] as String).toSet().toList();
    
    if (politicianIds.isEmpty) {
      // If there are no politicians to fetch, just map the elections with a default politician
       return electionsData.map((electionJson) {
        electionJson['politician'] = Politician(id: '', ownerUserId: '', name: '不明な政治家', createdAt: DateTime(0)).toJson();
        return Election.fromJson(electionJson);
      }).toList();
    }

    // --- FINAL FIX: Use .or() filter to avoid the problematic 'in' keyword ---
    final orFilter = politicianIds.map((id) => 'id.eq.$id').join(',');
    final politiciansResponse = await _supabase
        .from('politicians')
        .select()
        .or(orFilter);
        
    final politicians = (politiciansResponse as List)
        .map((json) => Politician.fromJson(json))
        .toList();

    final List<Election> result = [];
    for (final electionJson in electionsData) {
      final politician = politicians.firstWhere(
        (p) => p.id == electionJson['politician_id'],
        orElse: () => Politician(id: '', ownerUserId: '', name: '不明な政治家', createdAt: DateTime(0)),
      );
      
      electionJson['politician'] = politician.toJson();
      result.add(Election.fromJson(electionJson));
    }
    
    return result;
  }

  // ... (rest of the file is unchanged)
  Future<PoliticalOrganization> createPoliticalOrganization(
    String name,
    String ownerUserId,
  ) async {
    final response = await _supabase
        .from('political_organizations')
        .insert({'name': name, 'owner_user_id': ownerUserId})
        .select()
        .single();

    return PoliticalOrganization.fromJson(response);
  }

  Future<Election> createElection({
    required String ownerUserId,
    required String politicianId,
    required String electionName,
    required DateTime electionDate,
  }) async {
    final response = await _supabase
        .from('elections')
        .insert({
          'owner_user_id': ownerUserId,
          'politician_id': politicianId,
          'election_name': electionName,
          'election_date': electionDate.toIso8601String(),
        })
        .select()
        .single();

    return Election.fromJson(response);
  }

  Future<List<Politician>> fetchPoliticians(String userId) async {
    final response = await _supabase
        .from('politicians')
        .select()
        .eq('owner_user_id', userId);

    return (response as List).map((json) => Politician.fromJson(json)).toList();
  }

  Future<Politician> createPolitician(String name, String ownerUserId) async {
    final response = await _supabase
        .from('politicians')
        .insert({'name': name, 'owner_user_id': ownerUserId})
        .select()
        .single();

    return Politician.fromJson(response);
  }

  Future<List<LedgerMember>> fetchLedgerMembers({
    String? organizationId,
    String? electionId,
  }) async {
    assert(organizationId != null || electionId != null);

    var query = _supabase.from('ledger_members').select('*, user:profiles(*)');

    if (organizationId != null) {
      query = query.eq('organization_id', organizationId);
    } else if (electionId != null) {
      query = query.eq('election_id', electionId);
    }

    final response = await query;
    return (response as List)
        .map((json) => LedgerMember.fromJson(json))
        .toList();
  }

  Future<void> removeMember(String memberId) async {
    await _supabase.from('ledger_members').delete().eq('id', memberId);
  }
}
