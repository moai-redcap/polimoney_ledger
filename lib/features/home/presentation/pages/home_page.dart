import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/login_page.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/ledger_repository.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/election.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/political_organization.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/add_ledger_sheet.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/election_list.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/political_organization_list.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;

  late Future<List<PoliticalOrganization>> _organizationsFuture;
  late Future<List<Election>> _electionsFuture;

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  void _refreshData() {
    final ledgerRepository = Provider.of<LedgerRepository>(context, listen: false);
    final userId = Supabase.instance.client.auth.currentUser!.id;
    setState(() {
      _organizationsFuture = ledgerRepository.fetchPoliticalOrganizations(userId);
      _electionsFuture = ledgerRepository.fetchElections(userId);
    });
  }

  Future<void> _signOut(BuildContext context) async {
    try {
      await Supabase.instance.client.auth.signOut();
      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginPage()),
          (route) => false,
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('ログアウトに失敗しました: ${e.toString()}'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('台帳選択'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _signOut(context),
            tooltip: 'ログアウト',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            builder: (context) => const AddLedgerSheet(),
          );
          if (result == true) {
            _refreshData();
          }
        },
        child: const Icon(Icons.add),
      ),
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) {
              setState(() {
                _selectedIndex = index;
              });
            },
            labelType: NavigationRailLabelType.all,
            destinations: const <NavigationRailDestination>[
              NavigationRailDestination(
                icon: Icon(Icons.business_outlined),
                selectedIcon: Icon(Icons.business),
                label: Text('政治団体'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.how_to_vote_outlined),
                selectedIcon: Icon(Icons.how_to_vote),
                label: Text('選挙'),
              ),
            ],
          ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: [
                PoliticalOrganizationList(
                  organizationsFuture: _organizationsFuture,
                  onRefresh: _refreshData,
                ),
                ElectionList(
                  electionsFuture: _electionsFuture,
                  onRefresh: _refreshData,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
