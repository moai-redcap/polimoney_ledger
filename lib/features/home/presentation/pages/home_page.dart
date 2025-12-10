import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/login_page.dart';
import 'package:polimoney_ledger/features/contacts/data/repositories/contact_repository.dart';
import 'package:polimoney_ledger/features/contacts/domain/models/contact.dart';
import 'package:polimoney_ledger/features/contacts/presentation/widgets/add_contact_sheet.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/ledger_repository.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/election.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/political_organization.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/add_ledger_sheet.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/election_list.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/political_organization_list.dart';
import 'package:polimoney_ledger/features/ledger/presentation/pages/sub_accounts_page.dart';
import 'package:polimoney_ledger/features/home/presentation/widgets/contacts_list.dart';

/// ナビゲーションの項目定義
enum NavItem {
  politicalOrganization(
    navIndex: 0,
    label: '政治団体',
    icon: Icons.business_outlined,
    selectedIcon: Icons.business,
    category: NavCategory.ledger,
  ),
  election(
    navIndex: 1,
    label: '選挙',
    icon: Icons.how_to_vote_outlined,
    selectedIcon: Icons.how_to_vote,
    category: NavCategory.ledger,
  ),
  contacts(
    navIndex: 2,
    label: '関係者',
    icon: Icons.people_outline,
    selectedIcon: Icons.people,
    category: NavCategory.master,
  ),
  subAccounts(
    navIndex: 3,
    label: '補助科目',
    icon: Icons.category_outlined,
    selectedIcon: Icons.category,
    category: NavCategory.master,
  );

  const NavItem({
    required this.navIndex,
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.category,
  });

  final int navIndex;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final NavCategory category;
}

enum NavCategory { ledger, master }

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;

  late Future<List<PoliticalOrganization>> _organizationsFuture;
  late Future<List<Election>> _electionsFuture;
  late Future<List<Contact>> _contactsFuture;

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  void _refreshData() {
    final ledgerRepository = Provider.of<LedgerRepository>(
      context,
      listen: false,
    );
    final contactRepository = Provider.of<ContactRepository>(
      context,
      listen: false,
    );
    final userId = Supabase.instance.client.auth.currentUser!.id;
    setState(() {
      _organizationsFuture = ledgerRepository.fetchPoliticalOrganizations(
        userId,
      );
      _electionsFuture = ledgerRepository.fetchElections(userId);
      _contactsFuture = contactRepository.fetchContacts(userId);
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
          SnackBar(
            content: Text('ログアウトに失敗しました: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  NavItem get _currentNavItem => NavItem.values[_selectedIndex];

  void _onFabPressed() async {
    bool? result;

    switch (_currentNavItem) {
      case NavItem.politicalOrganization:
      case NavItem.election:
        result = await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (context) => const AddLedgerSheet(),
        );
        break;
      case NavItem.contacts:
        result = await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (context) => const AddContactSheet(),
        );
        break;
      case NavItem.subAccounts:
        // 補助科目は画面内で追加するため、FABは表示しない
        return;
    }

    if (result == true) {
      _refreshData();
    }
  }

  String get _fabLabel {
    switch (_currentNavItem) {
      case NavItem.politicalOrganization:
      case NavItem.election:
        return '台帳を追加';
      case NavItem.contacts:
        return '関係者を追加';
      case NavItem.subAccounts:
        return ''; // FABを表示しない
    }
  }

  IconData get _fabIcon {
    switch (_currentNavItem) {
      case NavItem.politicalOrganization:
      case NavItem.election:
        return Icons.library_add;
      case NavItem.contacts:
        return Icons.person_add;
      case NavItem.subAccounts:
        return Icons.add; // FABを表示しない
    }
  }

  bool get _showFab => _currentNavItem != NavItem.subAccounts;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Polimoney Ledger'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _signOut(context),
            tooltip: 'ログアウト',
          ),
        ],
      ),
      floatingActionButton: _showFab
          ? FloatingActionButton.extended(
              onPressed: _onFabPressed,
              icon: Icon(_fabIcon),
              label: Text(_fabLabel),
            )
          : null,
      body: Row(
        children: [
          // カスタム NavigationRail（カテゴリ見出し付き）
          _buildNavigationRail(),
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
                ContactsList(
                  contactsFuture: _contactsFuture,
                  onRefresh: _refreshData,
                ),
                const SubAccountsPage(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationRail() {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: 100,
      color: colorScheme.surface,
      child: Column(
        children: [
          const SizedBox(height: 8),
          // 台帳カテゴリ
          _buildCategoryHeader('台帳'),
          _buildNavItem(NavItem.politicalOrganization),
          _buildNavItem(NavItem.election),
          const SizedBox(height: 8),
          // マスタカテゴリ
          _buildCategoryHeader('マスタ'),
          _buildNavItem(NavItem.contacts),
          _buildNavItem(NavItem.subAccounts),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildCategoryHeader(String title) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        Divider(height: 1, thickness: 1, color: colorScheme.outlineVariant),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          color: colorScheme.surfaceContainerHighest,
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: colorScheme.onSurfaceVariant,
              letterSpacing: 0.5,
            ),
          ),
        ),
        Divider(height: 1, thickness: 1, color: colorScheme.outlineVariant),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildNavItem(NavItem item) {
    final isSelected = _selectedIndex == item.navIndex;
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: SizedBox(
        width: double.infinity, // 横幅を統一
        child: Material(
          color: isSelected
              ? colorScheme.secondaryContainer
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => setState(() => _selectedIndex = item.navIndex),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isSelected ? item.selectedIcon : item.icon,
                    color: isSelected
                        ? colorScheme.onSecondaryContainer
                        : colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected
                          ? FontWeight.w600
                          : FontWeight.normal,
                      color: isSelected
                          ? colorScheme.onSecondaryContainer
                          : colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
