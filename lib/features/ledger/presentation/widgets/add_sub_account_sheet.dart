import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/core/constants/account_master.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/sub_account_repository.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/account_repository.dart';

/// 補助科目を追加するためのモーダルシート
class AddSubAccountSheet extends StatefulWidget {
  final String ledgerType;
  final AccountMaster? preSelectedAccount; // 親勘定科目が既に選択されている場合

  const AddSubAccountSheet({
    super.key,
    required this.ledgerType,
    this.preSelectedAccount,
  });

  @override
  State<AddSubAccountSheet> createState() => _AddSubAccountSheetState();
}

class _AddSubAccountSheetState extends State<AddSubAccountSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _isLoading = false;

  AccountMaster? _selectedParentAccount;
  List<AccountMaster> _availableAccounts = [];

  @override
  void initState() {
    super.initState();
    _selectedParentAccount = widget.preSelectedAccount;
    _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    final accountRepo = Provider.of<AccountRepository>(context, listen: false);
    final accounts = await accountRepo.getAccountMasters();
    setState(() {
      // 費用・収益科目のみ補助科目を追加可能（資産・負債は銀行口座などを関係者で管理）
      _availableAccounts = accounts
          .where(
            (a) =>
                (a.type == AccountType.expense ||
                    a.type == AccountType.revenue) &&
                a.availableLedgerTypes.contains(widget.ledgerType),
          )
          .toList();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedParentAccount == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('親勘定科目を選択してください'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final subAccountRepo = Provider.of<SubAccountRepository>(
        context,
        listen: false,
      );
      final userId = Supabase.instance.client.auth.currentUser!.id;

      await subAccountRepo.createSubAccount(
        ownerUserId: userId,
        ledgerType: widget.ledgerType,
        parentAccountCode: _selectedParentAccount!.code,
        name: _nameController.text.trim(),
      );

      if (mounted) {
        Navigator.of(context).pop(true); // 成功を通知
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '補助科目「${_nameController.text.trim()}」を追加しました',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('エラー: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  /// カテゴリ別にグループ化したドロップダウンアイテムを生成
  List<DropdownMenuItem<AccountMaster>> _buildGroupedDropdownItems() {
    // カテゴリでグループ化
    final grouped = <String, List<AccountMaster>>{};
    for (final account in _availableAccounts) {
      grouped.putIfAbsent(account.reportCategory, () => []);
      grouped[account.reportCategory]!.add(account);
    }

    final items = <DropdownMenuItem<AccountMaster>>[];

    // カテゴリ順序を定義
    final categoryOrder = [
      '経常経費',
      '政治活動費',
      '選挙運動費用',
      '寄附',
      '事業収入',
      '党費・会費',
      '交付金',
      'その他の収入',
      '収入', // 選挙用
    ];

    for (final category in categoryOrder) {
      if (grouped.containsKey(category)) {
        // カテゴリヘッダー（選択不可）
        items.add(
          DropdownMenuItem<AccountMaster>(
            enabled: false,
            value: null,
            child: Text(
              '── $category ──',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
                fontSize: 12,
              ),
            ),
          ),
        );
        // カテゴリ内の科目
        for (final account in grouped[category]!) {
          items.add(
            DropdownMenuItem<AccountMaster>(
              value: account,
              child: Padding(
                padding: const EdgeInsets.only(left: 16),
                child: Text(account.name),
              ),
            ),
          );
        }
      }
    }

    // 未分類のカテゴリを追加
    for (final entry in grouped.entries) {
      if (!categoryOrder.contains(entry.key)) {
        items.add(
          DropdownMenuItem<AccountMaster>(
            enabled: false,
            value: null,
            child: Text(
              '── ${entry.key} ──',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
                fontSize: 12,
              ),
            ),
          ),
        );
        for (final account in entry.value) {
          items.add(
            DropdownMenuItem<AccountMaster>(
              value: account,
              child: Padding(
                padding: const EdgeInsets.only(left: 16),
                child: Text(account.name),
              ),
            ),
          );
        }
      }
    }

    return items;
  }

  @override
  Widget build(BuildContext context) {
    final ledgerTypeName =
        widget.ledgerType == 'political_organization' ? '政治団体' : '選挙';

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '補助科目の追加（$ledgerTypeName用）',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              '補助科目は、勘定科目の内訳を管理するために使用します。\n'
              '例: 光熱水費 → 電気代、ガス代、水道代',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<AccountMaster>(
              value: _selectedParentAccount,
              decoration: const InputDecoration(
                labelText: '親勘定科目',
                border: OutlineInputBorder(),
              ),
              isExpanded: true,
              items: _buildGroupedDropdownItems(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedParentAccount = value);
                }
              },
              validator: (value) => value == null ? '選択してください' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: '補助科目名',
                hintText: '例: 電気代',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return '補助科目名を入力してください';
                }
                return null;
              },
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isLoading ? null : _save,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('追加'),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

