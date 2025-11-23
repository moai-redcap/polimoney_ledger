import 'package:flutter/material.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/add_journal_sheet.dart';

class JournalListPage extends StatelessWidget {
  final String ledgerId;

  const JournalListPage({super.key, required this.ledgerId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('仕訳帳')),
      body: const Center(child: Text('仕訳データなし')),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            builder: (context) => const AddJournalSheet(),
          );
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
