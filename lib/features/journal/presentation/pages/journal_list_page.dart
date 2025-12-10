import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:polimoney_ledger/core/models/permissions.dart';
import 'package:polimoney_ledger/core/models/roles.dart';
import 'package:polimoney_ledger/core/services/permission_service.dart';
import 'package:polimoney_ledger/features/contacts/presentation/pages/contacts_page.dart';
import 'package:polimoney_ledger/features/journal/data/repositories/journal_repository.dart';
import 'package:polimoney_ledger/features/journal/domain/models/journal.dart';
import 'package:polimoney_ledger/features/journal/presentation/widgets/add_journal_sheet.dart';

class JournalListPage extends StatefulWidget {
  final String ledgerId;
  final String ledgerType;
  final String myRole;
  final String ledgerName;
  final int initialYear;

  const JournalListPage({
    super.key,
    required this.ledgerId,
    required this.ledgerType,
    required this.myRole,
    required this.ledgerName,
    required this.initialYear,
  });

  @override
  State<JournalListPage> createState() => _JournalListPageState();
}

class _JournalListPageState extends State<JournalListPage> {
  late int _currentYear;
  late Future<List<int>> _availableYearsFuture;
  late Future<List<Journal>> _journalsFuture;
  late Future<int> _carryOverFuture;

  late final bool canManageContacts;
  late final bool canManageMembers;
  late final bool canSubmit;
  late final bool canRegister;

  final currencyFormatter = NumberFormat.currency(locale: 'ja_JP', symbol: '¥');

  @override
  void initState() {
    super.initState();
    _currentYear = widget.initialYear;
    _loadAllData();

    final permissionService = PermissionService();
    final myAppRole = roleFromString(widget.myRole);
    canManageContacts = permissionService.hasPermission(myAppRole, AppPermission.manageContacts);
    canManageMembers = permissionService.hasPermission(myAppRole, AppPermission.manageMembers);
    canSubmit = permissionService.hasPermission(myAppRole, AppPermission.submitJournal);
    canRegister = permissionService.hasPermission(myAppRole, AppPermission.registerJournal);
  }

  void _loadAllData() {
    final journalRepo = Provider.of<JournalRepository>(context, listen: false);
    setState(() {
      _availableYearsFuture = journalRepo.getAvailableYears(widget.ledgerId, widget.ledgerType);
      _journalsFuture = journalRepo.fetchJournals(
        ledgerId: widget.ledgerId,
        ledgerType: widget.ledgerType,
        year: _currentYear,
      );
      _carryOverFuture = journalRepo.calculateCarryOver(
        ledgerId: widget.ledgerId,
        ledgerType: widget.ledgerType,
        year: _currentYear,
      );
    });
  }

  void _showAddJournalDialog() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AddJournalSheet(
        ledgerId: widget.ledgerId,
        ledgerType: widget.ledgerType,
        myRole: widget.myRole,
      ),
    );
    if (result == true) {
      _loadAllData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.ledgerName),
        actions: [
          FutureBuilder<List<int>>(
            future: _availableYearsFuture,
            builder: (context, snapshot) {
              final years = snapshot.data ?? [_currentYear];
              return DropdownButton<int>(
                value: _currentYear,
                items: years.map((year) => DropdownMenuItem(value: year, child: Text('$year年'))).toList(),
                onChanged: (newYear) {
                  if (newYear != null && newYear != _currentYear) {
                    setState(() {
                      _currentYear = newYear;
                      _loadAllData();
                    });
                  }
                },
              );
            },
          ),
          if (canManageContacts) IconButton(
            icon: const Icon(Icons.contacts),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const ContactsPage()),
              );
            },
            tooltip: '関係者マスタ',
          ),
          if (canManageMembers) IconButton(icon: const Icon(Icons.settings), onPressed: () {}, tooltip: '台帳設定'),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                FutureBuilder<int>(
                  future: _carryOverFuture,
                  builder: (context, snapshot) {
                    String displayAmount = '計算中...';
                    if (snapshot.hasData) {
                      displayAmount = currencyFormatter.format(snapshot.data);
                    } else if (snapshot.hasError) {
                      displayAmount = 'エラー';
                    }
                    return Card(child: Padding(padding: const EdgeInsets.all(8.0), child: Text('前期繰越: $displayAmount')));
                  },
                ),
                if (canSubmit || canRegister)
                  ElevatedButton.icon(
                    icon: const Icon(Icons.add),
                    label: const Text('新規仕訳'),
                    onPressed: _showAddJournalDialog,
                  ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Journal>>(
              future: _journalsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                if (snapshot.hasError) return Center(child: Text('エラー: ${snapshot.error}'));
                if (!snapshot.hasData || snapshot.data!.isEmpty) return Center(child: Text('$_currentYear年の仕訳はありません。'));
                final journals = snapshot.data!;
                return ListView.builder(
                  itemCount: journals.length,
                  itemBuilder: (context, index) {
                    final journal = journals[index];
                    final formattedAmount = currencyFormatter.format(journal.totalAmount ?? 0);
                    return ListTile(
                      leading: journal.status == 'draft'
                          ? const Icon(Icons.pending_actions, color: Colors.orange)
                          : const Icon(Icons.check_circle, color: Colors.green),
                      title: Text(journal.description),
                      subtitle: Text(journal.journalDate.toIso8601String().substring(0, 10)),
                      trailing: Text(formattedAmount),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
