import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/contacts/data/repositories/contact_repository.dart';
import 'package:polimoney_ledger/features/contacts/domain/models/contact.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/account_repository.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/account_master.dart';

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
  Contact? _selectedContact;

  AccountMaster? _debitAccount;
  AccountMaster? _creditAccount;

  late Future<List<dynamic>> _dataFuture;
  List<AccountMaster> _allAccounts = [];

  @override
  void initState() {
    super.initState();
    _dateController.text = DateTime.now().toIso8601String().substring(0, 10);
    final accountRepo = Provider.of<AccountRepository>(context, listen: false);
    final contactRepo = Provider.of<ContactRepository>(context, listen: false);
    final userId = Supabase.instance.client.auth.currentUser!.id;
    _dataFuture = Future.wait([
      accountRepo.getAccountMasters(),
      contactRepo.fetchContacts(userId),
    ]);
  }
  
  @override
  void dispose() {
    _dateController.dispose();
    _descriptionController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _saveJournal() async { /* TODO */ }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('新規仕訳の登録'),
      content: SizedBox(
        width: MediaQuery.of(context).size.width * 0.5,
        child: FutureBuilder<List<dynamic>>(
          future: _dataFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError || !snapshot.hasData) return Center(child: Text('データ読み込みエラー: ${snapshot.error}'));

            _allAccounts = snapshot.data![0] as List<AccountMaster>;
            final allContacts = snapshot.data![1] as List<Contact>;

            return Form(
              key: _formKey,
              child: ListView(
                shrinkWrap: true,
                children: [
                  _buildBasicForm(allContacts),
                  const SizedBox(height: 24),
                  if (_selectedEntryType == EntryType.expense) _buildExpenseForm(),
                  if (_selectedEntryType == EntryType.revenue) _buildRevenueForm(),
                  if (_selectedEntryType == EntryType.transfer) _buildTransferForm(),
                ],
              ),
            );
          },
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('キャンセル')),
        ElevatedButton(
          onPressed: _isLoading ? null : _saveJournal,
          child: _isLoading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('登録'),
        ),
      ],
    );
  }

  Widget _buildBasicForm(List<Contact> contacts) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextFormField(
          controller: _dateController,
          decoration: const InputDecoration(labelText: '日付', suffixIcon: Icon(Icons.calendar_today)),
          readOnly: true,
          onTap: () async {
            final picked = await showDatePicker(context: context, initialDate: DateTime.tryParse(_dateController.text) ?? DateTime.now(), firstDate: DateTime(2000), lastDate: DateTime(2101));
            if (picked != null) _dateController.text = picked.toIso8601String().substring(0, 10);
          },
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _descriptionController,
          decoration: const InputDecoration(labelText: '摘要（例: 事務所家賃 5月分）'),
          validator: (value) => (value == null || value.isEmpty) ? '摘要を入力してください' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _amountController,
          decoration: const InputDecoration(labelText: '金額', prefixText: '¥ '),
          keyboardType: TextInputType.number,
          validator: (value) => (value == null || value.isEmpty || int.tryParse(value.replaceAll(',', '')) == null) ? '金額を正しく入力してください' : null,
        ),
        const SizedBox(height: 16),
        SegmentedButton<EntryType>(
          segments: const [
            ButtonSegment(value: EntryType.expense, label: Text('支出')),
            ButtonSegment(value: EntryType.revenue, label: Text('収入')),
            ButtonSegment(value: EntryType.transfer, label: Text('振替')),
          ],
          selected: {_selectedEntryType},
          onSelectionChanged: (newSelection) => setState(() {
            _selectedEntryType = newSelection.first;
            _debitAccount = null;
            _creditAccount = null;
          }),
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<Contact>(
          value: _selectedContact,
          decoration: InputDecoration(
            labelText: '関係者（支払先・寄付者など）',
            suffixIcon: IconButton(icon: const Icon(Icons.person_add), onPressed: () { /* TODO */ }),
          ),
          items: contacts.map((c) => DropdownMenuItem(value: c, child: Text(c.name))).toList(),
          onChanged: (value) => setState(() => _selectedContact = value),
          validator: (value) => (value == null) ? '関係者を選択してください' : null,
        ),
      ],
    );
  }

  Widget _buildExpenseForm() {
    final expenseAccounts = _allAccounts.where((a) => a.type == AccountType.expense && a.availableLedgerTypes.contains(widget.ledgerType)).toList();
    final assetAccounts = _allAccounts.where((a) => a.type == AccountType.asset).toList();
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropdownButtonFormField<AccountMaster>(
          value: _debitAccount,
          decoration: const InputDecoration(labelText: '支出科目（何に使ったか）'),
          items: expenseAccounts.map((a) => DropdownMenuItem(value: a, child: Text(a.name))).toList(),
          onChanged: (value) => setState(() => _debitAccount = value),
          validator: (value) => value == null ? '選択してください' : null,
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<AccountMaster>(
          value: _creditAccount,
          decoration: const InputDecoration(labelText: '支払元（どの資産から払ったか）'),
          items: assetAccounts.map((a) => DropdownMenuItem(value: a, child: Text(a.name))).toList(),
          onChanged: (value) => setState(() => _creditAccount = value),
          validator: (value) => value == null ? '選択してください' : null,
        ),
      ],
    );
  }

  Widget _buildRevenueForm() {
    final assetAccounts = _allAccounts.where((a) => a.type == AccountType.asset).toList();
    final revenueAccounts = _allAccounts.where((a) => (a.type == AccountType.revenue || a.type == AccountType.equity) && a.availableLedgerTypes.contains(widget.ledgerType)).toList();
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropdownButtonFormField<AccountMaster>(
          value: _debitAccount,
          decoration: const InputDecoration(labelText: '入金先（どの資産が増えたか）'),
          items: assetAccounts.map((a) => DropdownMenuItem(value: a, child: Text(a.name))).toList(),
          onChanged: (value) => setState(() => _debitAccount = value),
          validator: (value) => value == null ? '選択してください' : null,
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<AccountMaster>(
          value: _creditAccount,
          decoration: const InputDecoration(labelText: '収入科目（何による収入か）'),
          items: revenueAccounts.map((a) => DropdownMenuItem(value: a, child: Text(a.name))).toList(),
          onChanged: (value) => setState(() => _creditAccount = value),
          validator: (value) => value == null ? '選択してください' : null,
        ),
      ],
    );
  }

  Widget _buildTransferForm() {
    final assetAccounts = _allAccounts.where((a) => a.type == AccountType.asset).toList();
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropdownButtonFormField<AccountMaster>(
          value: _creditAccount,
          decoration: const InputDecoration(labelText: '振替元（どの資産から）'),
          items: assetAccounts.map((a) => DropdownMenuItem(value: a, child: Text(a.name))).toList(),
          onChanged: (value) => setState(() => _creditAccount = value),
          validator: (value) => value == null ? '選択してください' : null,
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<AccountMaster>(
          value: _debitAccount,
          decoration: const InputDecoration(labelText: '振替先（どの資産へ）'),
          items: assetAccounts.map((a) => DropdownMenuItem(value: a, child: Text(a.name))).toList(),
          onChanged: (value) => setState(() => _debitAccount = value),
          validator: (value) => value == null ? '選択してください' : null,
        ),
      ],
    );
  }
}
