import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/core/constants/account_master.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/account_repository.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/sub_account_repository.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/sub_account.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/add_sub_account_sheet.dart';

/// 補助科目管理画面
class SubAccountsPage extends StatefulWidget {
  const SubAccountsPage({super.key});

  @override
  State<SubAccountsPage> createState() => _SubAccountsPageState();
}

class _SubAccountsPageState extends State<SubAccountsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Future<List<SubAccount>> _politicalOrgSubAccountsFuture;
  late Future<List<SubAccount>> _electionSubAccountsFuture;
  late Future<List<AccountMaster>> _accountMastersFuture;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _refreshData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _refreshData() {
    final subAccountRepo = Provider.of<SubAccountRepository>(
      context,
      listen: false,
    );
    final accountRepo = Provider.of<AccountRepository>(context, listen: false);
    final userId = Supabase.instance.client.auth.currentUser!.id;

    setState(() {
      _politicalOrgSubAccountsFuture = subAccountRepo.fetchSubAccounts(
        userId,
        'political_organization',
      );
      _electionSubAccountsFuture = subAccountRepo.fetchSubAccounts(
        userId,
        'election',
      );
      _accountMastersFuture = accountRepo.getAccountMasters();
    });
  }

  Future<void> _showAddSubAccountSheet(String ledgerType) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => AddSubAccountSheet(ledgerType: ledgerType),
    );
    if (result == true) {
      _refreshData();
    }
  }

  Future<void> _deleteSubAccount(SubAccount subAccount) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('補助科目の削除'),
        content: Text('「${subAccount.name}」を削除しますか？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('削除'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final subAccountRepo = Provider.of<SubAccountRepository>(
          context,
          listen: false,
        );
        await subAccountRepo.deleteSubAccount(subAccount.id);
        _refreshData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('「${subAccount.name}」を削除しました')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('削除に失敗しました: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: '政治団体用'),
            Tab(text: '選挙用'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildSubAccountsList(
                _politicalOrgSubAccountsFuture,
                'political_organization',
              ),
              _buildSubAccountsList(
                _electionSubAccountsFuture,
                'election',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSubAccountsList(
    Future<List<SubAccount>> subAccountsFuture,
    String ledgerType,
  ) {
    return FutureBuilder<List<dynamic>>(
      future: Future.wait([subAccountsFuture, _accountMastersFuture]),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: Text('エラー: ${snapshot.error}'));
        }

        final subAccounts = snapshot.data![0] as List<SubAccount>;
        final accountMasters = snapshot.data![1] as List<AccountMaster>;

        if (subAccounts.isEmpty) {
          return _buildEmptyState(ledgerType);
        }

        // 親勘定科目でグループ化
        final grouped = <String, List<SubAccount>>{};
        for (final subAccount in subAccounts) {
          grouped.putIfAbsent(subAccount.parentAccountCode, () => []);
          grouped[subAccount.parentAccountCode]!.add(subAccount);
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // 追加ボタン
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: ElevatedButton.icon(
                onPressed: () => _showAddSubAccountSheet(ledgerType),
                icon: const Icon(Icons.add),
                label: const Text('補助科目を追加'),
              ),
            ),
            // グループごとに表示
            ...grouped.entries.map((entry) {
              final parentCode = entry.key;
              final items = entry.value;
              final parentAccount = accountMasters.firstWhere(
                (a) => a.code == parentCode,
                orElse: () => AccountMaster(
                  code: parentCode,
                  name: parentCode,
                  type: AccountType.unknown,
                  reportCategory: '',
                  availableLedgerTypes: [],
                ),
              );

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 親勘定科目ヘッダー
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(12),
                        ),
                      ),
                      child: Text(
                        parentAccount.name,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                    // 補助科目リスト
                    ...items.map(
                      (subAccount) => ListTile(
                        leading: const Icon(Icons.subdirectory_arrow_right),
                        title: Text(subAccount.name),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () => _deleteSubAccount(subAccount),
                          tooltip: '削除',
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        );
      },
    );
  }

  Widget _buildEmptyState(String ledgerType) {
    final ledgerTypeName =
        ledgerType == 'political_organization' ? '政治団体' : '選挙';

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.category_outlined,
            size: 64,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 16),
          Text(
            '$ledgerTypeName用の補助科目はまだありません',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            '補助科目を追加して、勘定科目の内訳を管理しましょう',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _showAddSubAccountSheet(ledgerType),
            icon: const Icon(Icons.add),
            label: const Text('補助科目を追加'),
          ),
        ],
      ),
    );
  }
}

