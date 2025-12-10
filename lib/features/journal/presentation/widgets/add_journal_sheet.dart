import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/core/constants/account_master.dart';
import 'package:polimoney_ledger/core/models/permissions.dart';
import 'package:polimoney_ledger/core/models/roles.dart';
import 'package:polimoney_ledger/core/services/permission_service.dart';
import 'package:polimoney_ledger/features/contacts/data/repositories/contact_repository.dart';
import 'package:polimoney_ledger/features/contacts/domain/models/contact.dart';
import 'package:polimoney_ledger/features/contacts/presentation/widgets/add_contact_sheet.dart';
import 'package:polimoney_ledger/features/journal/data/repositories/journal_repository.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/account_repository.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/sub_account_repository.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/sub_account.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/add_sub_account_sheet.dart';

enum EntryType { expense, revenue, transfer }

class AddJournalSheet extends StatefulWidget {
  final String ledgerId;
  final String ledgerType;
  final String myRole;

  const AddJournalSheet({
    super.key,
    required this.ledgerId,
    required this.ledgerType,
    required this.myRole,
  });

  @override
  State<AddJournalSheet> createState() => _AddJournalSheetState();
}

class _AddJournalSheetState extends State<AddJournalSheet> {
  final _formKey = GlobalKey<FormState>();
  EntryType _selectedEntryType = EntryType.expense;
  bool _isLoading = false;

  final _dateController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  Contact? _selectedContact;

  AccountMaster? _debitAccount;
  AccountMaster? _creditAccount;
  SubAccount? _debitSubAccount;
  SubAccount? _creditSubAccount;

  // 選挙区分（選挙台帳の場合のみ使用）
  String _classification = 'campaign'; // 'pre-campaign' or 'campaign'

  // 領収証徴収困難
  bool _isReceiptHardToCollect = false;
  final _receiptHardToCollectReasonController = TextEditingController();

  // 追加フィールド
  final _nonMonetaryBasisController = TextEditingController();
  final _politicalGrantController = TextEditingController();
  final _politicalFundController = TextEditingController();

  late Future<List<dynamic>> _dataFuture;
  List<AccountMaster> _allAccounts = [];
  List<SubAccount> _allSubAccounts = [];

  @override
  void initState() {
    super.initState();
    _dateController.text = DateTime.now().toIso8601String().substring(0, 10);
    final accountRepo = Provider.of<AccountRepository>(context, listen: false);
    final contactRepo = Provider.of<ContactRepository>(context, listen: false);
    final subAccountRepo = Provider.of<SubAccountRepository>(
      context,
      listen: false,
    );
    final userId = Supabase.instance.client.auth.currentUser!.id;
    _dataFuture = Future.wait([
      accountRepo.getAccountMasters(),
      contactRepo.fetchContacts(userId),
      subAccountRepo.fetchSubAccounts(userId, widget.ledgerType),
    ]);
  }

  @override
  void dispose() {
    _dateController.dispose();
    _descriptionController.dispose();
    _amountController.dispose();
    _notesController.dispose();
    _receiptHardToCollectReasonController.dispose();
    _nonMonetaryBasisController.dispose();
    _politicalGrantController.dispose();
    _politicalFundController.dispose();
    super.dispose();
  }

  Future<void> _saveJournal() async {
    if (!_formKey.currentState!.validate()) return;
    if (_debitAccount == null || _creditAccount == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('勘定科目を選択してください'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final journalRepo = Provider.of<JournalRepository>(
        context,
        listen: false,
      );
      final userId = Supabase.instance.client.auth.currentUser!.id;
      final amount = int.parse(_amountController.text.replaceAll(',', ''));

      // 権限に基づきステータスを決定
      final permissionService = PermissionService();
      final myAppRole = roleFromString(widget.myRole);
      final canRegister = permissionService.hasPermission(
        myAppRole,
        AppPermission.registerJournal,
      );

      final status = canRegister ? 'approved' : 'draft';
      final approvedByUserId = canRegister ? userId : null;

      // 台帳タイプに応じて organization_id / election_id を設定
      final String? organizationId =
          widget.ledgerType == 'political_organization'
          ? widget.ledgerId
          : null;
      final String? electionId = widget.ledgerType == 'election'
          ? widget.ledgerId
          : null;

      // 仕訳ヘッダを作成
      final journalId = await journalRepo.createJournal(
        organizationId: organizationId,
        electionId: electionId,
        journalDate: DateTime.parse(_dateController.text),
        description: _descriptionController.text.trim(),
        status: status,
        submittedByUserId: userId,
        approvedByUserId: approvedByUserId,
        contactId: _selectedContact!.id,
        classification: widget.ledgerType == 'election'
            ? _classification
            : null,
        nonMonetaryBasis: _nonMonetaryBasisController.text.trim().isEmpty
            ? null
            : _nonMonetaryBasisController.text.trim(),
        notes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
        amountPoliticalGrant:
            int.tryParse(_politicalGrantController.text.replaceAll(',', '')) ??
            0,
        amountPoliticalFund:
            int.tryParse(_politicalFundController.text.replaceAll(',', '')) ??
            0,
        isReceiptHardToCollect: _isReceiptHardToCollect,
        receiptHardToCollectReason: _isReceiptHardToCollect
            ? _receiptHardToCollectReasonController.text.trim()
            : null,
      );

      // 仕訳明細を作成（借方）
      await journalRepo.createJournalEntry(
        journalId: journalId,
        accountCode: _debitAccount!.code,
        subAccountId: _debitSubAccount?.id,
        debitAmount: amount,
        creditAmount: 0,
      );

      // 仕訳明細を作成（貸方）
      await journalRepo.createJournalEntry(
        journalId: journalId,
        accountCode: _creditAccount!.code,
        subAccountId: _creditSubAccount?.id,
        debitAmount: 0,
        creditAmount: amount,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(canRegister ? '仕訳を登録しました' : '承認申請しました')),
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

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('新規仕訳の登録'),
      content: SizedBox(
        width: MediaQuery.of(context).size.width * 0.5,
        child: FutureBuilder<List<dynamic>>(
          future: _dataFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError || !snapshot.hasData)
              return Center(child: Text('データ読み込みエラー: ${snapshot.error}'));

            _allAccounts = snapshot.data![0] as List<AccountMaster>;
            final allContacts = snapshot.data![1] as List<Contact>;
            _allSubAccounts = snapshot.data![2] as List<SubAccount>;

            return Form(
              key: _formKey,
              child: ListView(
                shrinkWrap: true,
                children: [
                  _buildBasicForm(allContacts),
                  const SizedBox(height: 24),
                  if (_selectedEntryType == EntryType.expense)
                    _buildExpenseForm(),
                  if (_selectedEntryType == EntryType.revenue)
                    _buildRevenueForm(),
                  if (_selectedEntryType == EntryType.transfer)
                    _buildTransferForm(),
                  const SizedBox(height: 24),
                  _buildAdditionalFields(),
                ],
              ),
            );
          },
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('キャンセル'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _saveJournal,
          child: _isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('登録'),
        ),
      ],
    );
  }

  Widget _buildBasicForm(List<Contact> contacts) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start, // 左寄せ
      children: [
        // 取引タイプを一番上に配置（左寄せ）
        SegmentedButton<EntryType>(
          segments: const [
            ButtonSegment(value: EntryType.expense, label: Text('支出')),
            ButtonSegment(value: EntryType.revenue, label: Text('収入')),
            ButtonSegment(value: EntryType.transfer, label: Text('振替')),
          ],
          selected: {_selectedEntryType},
          showSelectedIcon: false,
          style: ButtonStyle(
            backgroundColor: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.selected)) {
                return colorScheme.primary; // 選択時: プライマリカラー
              }
              return colorScheme.surfaceContainerHighest; // 非選択時
            }),
            foregroundColor: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.selected)) {
                return colorScheme.onPrimary; // 選択時: 白文字
              }
              return colorScheme.onSurface; // 非選択時
            }),
          ),
          onSelectionChanged: (newSelection) => setState(() {
            _selectedEntryType = newSelection.first;
            _debitAccount = null;
            _creditAccount = null;
            _debitSubAccount = null;
            _creditSubAccount = null;
          }),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _dateController,
          decoration: const InputDecoration(
            labelText: '日付',
            suffixIcon: Icon(Icons.calendar_today),
          ),
          readOnly: true,
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate:
                  DateTime.tryParse(_dateController.text) ?? DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime(2101),
            );
            if (picked != null)
              _dateController.text = picked.toIso8601String().substring(0, 10);
          },
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _descriptionController,
          decoration: const InputDecoration(labelText: '摘要（例: 事務所家賃 5月分）'),
          validator: (value) =>
              (value == null || value.isEmpty) ? '摘要を入力してください' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _amountController,
          decoration: const InputDecoration(labelText: '金額', prefixText: '¥ '),
          keyboardType: TextInputType.number,
          validator: (value) =>
              (value == null ||
                  value.isEmpty ||
                  int.tryParse(value.replaceAll(',', '')) == null)
              ? '金額を正しく入力してください'
              : null,
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<Contact>(
          value: _selectedContact,
          decoration: InputDecoration(
            labelText: '関係者（支払先・寄付者など）',
            suffixIcon: IconButton(
              icon: const Icon(Icons.person_add),
              tooltip: '関係者を追加',
              onPressed: () async {
                final result = await showModalBottomSheet<bool>(
                  context: context,
                  isScrollControlled: true,
                  useSafeArea: true,
                  builder: (context) => const AddContactSheet(),
                );
                if (result == true) {
                  // 関係者リストを再読み込み
                  final contactRepo = Provider.of<ContactRepository>(
                    context,
                    listen: false,
                  );
                  final userId = Supabase.instance.client.auth.currentUser!.id;
                  final accountRepo = Provider.of<AccountRepository>(
                    context,
                    listen: false,
                  );
                  setState(() {
                    _dataFuture = Future.wait([
                      accountRepo.getAccountMasters(),
                      contactRepo.fetchContacts(userId),
                    ]);
                  });
                }
              },
            ),
          ),
          items: contacts
              .map((c) => DropdownMenuItem(value: c, child: Text(c.name)))
              .toList(),
          onChanged: (value) => setState(() => _selectedContact = value),
          validator: (value) => (value == null) ? '関係者を選択してください' : null,
        ),
      ],
    );
  }

  /// データを再読み込み
  void _refreshData() {
    final accountRepo = Provider.of<AccountRepository>(context, listen: false);
    final contactRepo = Provider.of<ContactRepository>(context, listen: false);
    final subAccountRepo = Provider.of<SubAccountRepository>(
      context,
      listen: false,
    );
    final userId = Supabase.instance.client.auth.currentUser!.id;
    setState(() {
      _dataFuture = Future.wait([
        accountRepo.getAccountMasters(),
        contactRepo.fetchContacts(userId),
        subAccountRepo.fetchSubAccounts(userId, widget.ledgerType),
      ]);
    });
  }

  /// 補助科目追加シートを表示
  Future<void> _showAddSubAccountSheet(AccountMaster? parentAccount) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => AddSubAccountSheet(
        ledgerType: widget.ledgerType,
        preSelectedAccount: parentAccount,
      ),
    );
    if (result == true) {
      _refreshData();
    }
  }

  /// 補助科目選択ドロップダウンを構築（＋ボタン付き）
  Widget _buildSubAccountDropdown({
    required AccountMaster? parentAccount,
    required SubAccount? selectedSubAccount,
    required ValueChanged<SubAccount?> onChanged,
    bool showAddButton = true,
  }) {
    final subAccounts = parentAccount == null
        ? <SubAccount>[]
        : _allSubAccounts
              .where((s) => s.parentAccountCode == parentAccount.code)
              .toList();

    // 費用・収益科目のみ補助科目追加ボタンを表示
    final canAddSubAccount =
        parentAccount != null &&
        (parentAccount.type == AccountType.expense ||
            parentAccount.type == AccountType.revenue);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: DropdownButtonFormField<SubAccount>(
            value: selectedSubAccount,
            decoration: InputDecoration(
              labelText: parentAccount != null
                  ? '${parentAccount.name}の補助科目'
                  : '補助科目',
              hintText: '任意選択',
            ),
            items: [
              const DropdownMenuItem<SubAccount>(
                value: null,
                child: Text('（補助科目なし）'),
              ),
              ...subAccounts.map(
                (s) => DropdownMenuItem(value: s, child: Text(s.name)),
              ),
            ],
            onChanged: onChanged,
          ),
        ),
        if (showAddButton && canAddSubAccount) ...[
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: IconButton(
              onPressed: () => _showAddSubAccountSheet(parentAccount),
              icon: const Icon(Icons.add_circle_outline),
              tooltip: '補助科目を追加',
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildExpenseForm() {
    final expenseAccounts = _allAccounts
        .where(
          (a) =>
              a.type == AccountType.expense &&
              a.availableLedgerTypes.contains(widget.ledgerType),
        )
        .toList();
    final assetAccounts = _allAccounts
        .where((a) => a.type == AccountType.asset)
        .toList();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropdownButtonFormField<AccountMaster>(
          value: _debitAccount,
          decoration: const InputDecoration(labelText: '支出科目（何に使ったか）'),
          items: expenseAccounts
              .map((a) => DropdownMenuItem(value: a, child: Text(a.name)))
              .toList(),
          onChanged: (value) => setState(() {
            _debitAccount = value;
            _debitSubAccount = null; // 勘定科目変更時に補助科目をリセット
          }),
          validator: (value) => value == null ? '選択してください' : null,
        ),
        // 支出科目が選択されている場合のみ補助科目を表示
        if (_debitAccount != null) ...[
          const SizedBox(height: 8),
          _buildSubAccountDropdown(
            parentAccount: _debitAccount,
            selectedSubAccount: _debitSubAccount,
            onChanged: (value) => setState(() => _debitSubAccount = value),
          ),
        ],
        const SizedBox(height: 16),
        DropdownButtonFormField<AccountMaster>(
          value: _creditAccount,
          decoration: const InputDecoration(labelText: '支払元（どの資産から払ったか）'),
          items: assetAccounts
              .map((a) => DropdownMenuItem(value: a, child: Text(a.name)))
              .toList(),
          onChanged: (value) => setState(() {
            _creditAccount = value;
            _creditSubAccount = null;
          }),
          validator: (value) => value == null ? '選択してください' : null,
        ),
        // 資産科目には補助科目追加ボタンを表示しない（銀行口座は関係者で管理）
        if (_creditAccount != null) ...[
          const SizedBox(height: 8),
          _buildSubAccountDropdown(
            parentAccount: _creditAccount,
            selectedSubAccount: _creditSubAccount,
            onChanged: (value) => setState(() => _creditSubAccount = value),
            showAddButton: false,
          ),
        ],
      ],
    );
  }

  Widget _buildRevenueForm() {
    final assetAccounts = _allAccounts
        .where((a) => a.type == AccountType.asset)
        .toList();
    final revenueAccounts = _allAccounts
        .where(
          (a) =>
              (a.type == AccountType.revenue || a.type == AccountType.equity) &&
              a.availableLedgerTypes.contains(widget.ledgerType),
        )
        .toList();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropdownButtonFormField<AccountMaster>(
          value: _debitAccount,
          decoration: const InputDecoration(labelText: '入金先（どの資産が増えたか）'),
          items: assetAccounts
              .map((a) => DropdownMenuItem(value: a, child: Text(a.name)))
              .toList(),
          onChanged: (value) => setState(() {
            _debitAccount = value;
            _debitSubAccount = null;
          }),
          validator: (value) => value == null ? '選択してください' : null,
        ),
        // 資産科目には補助科目追加ボタンを表示しない
        if (_debitAccount != null) ...[
          const SizedBox(height: 8),
          _buildSubAccountDropdown(
            parentAccount: _debitAccount,
            selectedSubAccount: _debitSubAccount,
            onChanged: (value) => setState(() => _debitSubAccount = value),
            showAddButton: false,
          ),
        ],
        const SizedBox(height: 16),
        DropdownButtonFormField<AccountMaster>(
          value: _creditAccount,
          decoration: const InputDecoration(labelText: '収入科目（何による収入か）'),
          items: revenueAccounts
              .map((a) => DropdownMenuItem(value: a, child: Text(a.name)))
              .toList(),
          onChanged: (value) => setState(() {
            _creditAccount = value;
            _creditSubAccount = null;
          }),
          validator: (value) => value == null ? '選択してください' : null,
        ),
        // 収入科目が選択されている場合のみ補助科目を表示
        if (_creditAccount != null) ...[
          const SizedBox(height: 8),
          _buildSubAccountDropdown(
            parentAccount: _creditAccount,
            selectedSubAccount: _creditSubAccount,
            onChanged: (value) => setState(() => _creditSubAccount = value),
          ),
        ],
      ],
    );
  }

  Widget _buildTransferForm() {
    final assetAccounts = _allAccounts
        .where((a) => a.type == AccountType.asset)
        .toList();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropdownButtonFormField<AccountMaster>(
          value: _creditAccount,
          decoration: const InputDecoration(labelText: '振替元（どの資産から）'),
          items: assetAccounts
              .map((a) => DropdownMenuItem(value: a, child: Text(a.name)))
              .toList(),
          onChanged: (value) => setState(() {
            _creditAccount = value;
            _creditSubAccount = null;
          }),
          validator: (value) => value == null ? '選択してください' : null,
        ),
        // 資産科目には補助科目追加ボタンを表示しない
        if (_creditAccount != null) ...[
          const SizedBox(height: 8),
          _buildSubAccountDropdown(
            parentAccount: _creditAccount,
            selectedSubAccount: _creditSubAccount,
            onChanged: (value) => setState(() => _creditSubAccount = value),
            showAddButton: false,
          ),
        ],
        const SizedBox(height: 16),
        DropdownButtonFormField<AccountMaster>(
          value: _debitAccount,
          decoration: const InputDecoration(labelText: '振替先（どの資産へ）'),
          items: assetAccounts
              .map((a) => DropdownMenuItem(value: a, child: Text(a.name)))
              .toList(),
          onChanged: (value) => setState(() {
            _debitAccount = value;
            _debitSubAccount = null;
          }),
          validator: (value) => value == null ? '選択してください' : null,
        ),
        // 資産科目には補助科目追加ボタンを表示しない
        if (_debitAccount != null) ...[
          const SizedBox(height: 8),
          _buildSubAccountDropdown(
            parentAccount: _debitAccount,
            selectedSubAccount: _debitSubAccount,
            onChanged: (value) => setState(() => _debitSubAccount = value),
            showAddButton: false,
          ),
        ],
      ],
    );
  }

  Widget _buildAdditionalFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(),
        const SizedBox(height: 8),
        Text('追加情報', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 16),

        // 選挙区分（選挙台帳の場合のみ）
        if (widget.ledgerType == 'election') ...[
          Text('活動区分', style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'pre-campaign', label: Text('立候補準備')),
                ButtonSegment(value: 'campaign', label: Text('選挙運動')),
              ],
              selected: {_classification},
              showSelectedIcon: false,
              style: ButtonStyle(
                backgroundColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return Theme.of(context).colorScheme.primary;
                  }
                  return Theme.of(context).colorScheme.surfaceContainerHighest;
                }),
                foregroundColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return Theme.of(context).colorScheme.onPrimary;
                  }
                  return Theme.of(context).colorScheme.onSurface;
                }),
              ),
              onSelectionChanged: (newSelection) {
                setState(() => _classification = newSelection.first);
              },
            ),
          ),
          const SizedBox(height: 16),
        ],

        // 金銭以外の見積の根拠
        TextFormField(
          controller: _nonMonetaryBasisController,
          decoration: const InputDecoration(
            labelText: '金銭以外の見積の根拠',
            hintText: '現物寄付等の場合に記入',
          ),
        ),
        const SizedBox(height: 16),

        // 政党交付金・政党基金（政治団体の場合のみ）
        if (widget.ledgerType == 'political_organization') ...[
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _politicalGrantController,
                  decoration: const InputDecoration(
                    labelText: '政党交付金充当額',
                    prefixText: '¥ ',
                    hintText: '0',
                  ),
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: TextFormField(
                  controller: _politicalFundController,
                  decoration: const InputDecoration(
                    labelText: '政党基金充当額',
                    prefixText: '¥ ',
                    hintText: '0',
                  ),
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],

        // 備考
        TextFormField(
          controller: _notesController,
          decoration: const InputDecoration(labelText: '備考', hintText: '任意入力'),
          maxLines: 2,
        ),
        const SizedBox(height: 16),

        // 領収証徴収困難
        CheckboxListTile(
          title: const Text('領収証を徴し難い'),
          subtitle: const Text('自動販売機での購入など'),
          value: _isReceiptHardToCollect,
          onChanged: (value) {
            setState(() => _isReceiptHardToCollect = value ?? false);
          },
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
        ),
        if (_isReceiptHardToCollect) ...[
          TextFormField(
            controller: _receiptHardToCollectReasonController,
            decoration: const InputDecoration(
              labelText: '領収証を徴し難い理由',
              hintText: '例: 自動販売機での購入のため',
            ),
            validator: (value) {
              if (_isReceiptHardToCollect && (value == null || value.isEmpty)) {
                return '理由を入力してください';
              }
              return null;
            },
          ),
        ],
      ],
    );
  }
}
