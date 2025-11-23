import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/models/political_organization.dart';
import '../../domain/models/election.dart';
import '../../domain/models/ledger_member.dart';
import '../../domain/models/politician.dart';

class LedgerRepository {
  final SupabaseClient _supabase;

  LedgerRepository(this._supabase);

  // Political Organizations
  Future<List<PoliticalOrganization>> fetchPoliticalOrganizations(
    String userId,
  ) async {
    // Fetch organizations where the user is the owner
    final ownerResponse = await _supabase
        .from('political_organizations')
        .select()
        .eq('owner_user_id', userId);

    final ownerOrgs = (ownerResponse as List)
        .map((json) => PoliticalOrganization.fromJson(json))
        .toList();

    // Fetch organizations where the user is a member
    final memberResponse = await _supabase
        .from('ledger_members')
        .select('political_organizations(*)')
        .eq('user_id', userId)
        .not('organization_id', 'is', null);

    final memberOrgs = (memberResponse as List)
        .map(
          (json) =>
              PoliticalOrganization.fromJson(json['political_organizations']),
        )
        .toList();

    // Merge and remove duplicates
    final allOrgs = {...ownerOrgs, ...memberOrgs}.toList();
    return allOrgs;
  }

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

  // Elections
  Future<List<Election>> fetchElections(String userId) async {
    // Fetch elections where the user is the owner
    final ownerResponse = await _supabase
        .from('elections')
        .select()
        .eq('owner_user_id', userId);

    final ownerElections = (ownerResponse as List)
        .map((json) => Election.fromJson(json))
        .toList();

    // Fetch elections where the user is a member
    final memberResponse = await _supabase
        .from('ledger_members')
        .select('elections(*)')
        .eq('user_id', userId)
        .not('election_id', 'is', null);

    final memberElections = (memberResponse as List)
        .map((json) => Election.fromJson(json['elections']))
        .toList();

    final allElections = {...ownerElections, ...memberElections}.toList();
    return allElections;
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

  // Politicians
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

  // Ledger Members
  Future<List<LedgerMember>> fetchLedgerMembers({
    String? organizationId,
    String? electionId,
  }) async {
    assert(organizationId != null || electionId != null);

    var query = _supabase.from('ledger_members').select();

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
