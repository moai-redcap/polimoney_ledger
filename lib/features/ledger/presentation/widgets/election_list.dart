import 'package:flutter/material.dart';
import 'package:polimoney_ledger/features/journal/presentation/pages/journal_list_page.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/election.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/add_election_dialog.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/empty_state_widget.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/error_message_widget.dart';

class ElectionList extends StatelessWidget {
  final Future<List<Election>> electionsFuture;
  final VoidCallback onRefresh;

  const ElectionList({
    super.key,
    required this.electionsFuture,
    required this.onRefresh,
  });

  void _showAddDialog(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => const AddElectionDialog(),
    );
    if (result == true) {
      onRefresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Election>>(
      future: electionsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return ErrorMessageWidget(message: 'Error: ${snapshot.error}', code: 'E-EL-01');
        }
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.add),
                  label: const Text('選挙を追加'),
                  onPressed: () => _showAddDialog(context),
                ),
              ),
            ),
            Expanded(
              child: (!snapshot.hasData || snapshot.data!.isEmpty)
                  ? const EmptyStateWidget(
                      message: 'まだ選挙台帳が登録されていません。',
                      callToAction: '上のボタンから最初の台帳を登録しましょう！',
                    )
                  : Container(
                      decoration: BoxDecoration(
                        border: Border(top: BorderSide(color: Theme.of(context).dividerColor, width: 0.8)),
                      ),
                      child: ListView.builder(
                        itemCount: snapshot.data!.length,
                        itemBuilder: (context, index) {
                          final election = snapshot.data![index];
                          final politicianName = election.politician?.name ?? '政治家不明';
                          final formattedDate = election.electionDate.toIso8601String().substring(0, 10);
                          return Column(
                            children: [
                              ListTile(
                                title: Text(election.electionName),
                                subtitle: Text('$politicianName / $formattedDate'),
                                trailing: const Icon(Icons.arrow_forward_ios),
                                onTap: () {
                                  const ledgerType = 'election';
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => JournalListPage(
                                        ledgerId: election.id,
                                        ledgerType: ledgerType,
                                        myRole: 'admin', // TODO: Fetch actual role
                                        ledgerName: election.electionName,
                                        initialYear: DateTime.now().year,
                                      ),
                                    ),
                                  );
                                },
                              ),
                              const Divider(height: 1, thickness: 0.8),
                            ],
                          );
                        },
                      ),
                    ),
            ),
          ],
        );
      },
    );
  }
}
