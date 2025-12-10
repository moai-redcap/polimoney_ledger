import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:polimoney_ledger/features/journal/data/repositories/journal_repository.dart';
import 'package:polimoney_ledger/features/journal/presentation/pages/journal_list_page.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/political_organization.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/empty_state_widget.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/error_message_widget.dart';

class PoliticalOrganizationList extends StatelessWidget {
  final Future<List<PoliticalOrganization>> organizationsFuture;
  final VoidCallback onRefresh;

  const PoliticalOrganizationList({
    super.key,
    required this.organizationsFuture,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<PoliticalOrganization>>(
      future: organizationsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return ErrorMessageWidget(message: 'Error: ${snapshot.error}', code: 'E-POL-01');
        }
        return Column(
          children: [
            Expanded(
              child: (!snapshot.hasData || snapshot.data!.isEmpty)
                  ? const EmptyStateWidget(
                      message: 'まだ政治団体が登録されていません。',
                      callToAction: '上のボタンから最初の台帳を登録しましょう！',
                    )
                  : Container(
                      decoration: BoxDecoration(
                        border: Border(top: BorderSide(color: Theme.of(context).dividerColor, width: 0.8)),
                      ),
                      child: ListView.builder(
                        itemCount: snapshot.data!.length,
                        itemBuilder: (context, index) {
                          final org = snapshot.data![index];
                          return Column(
                            children: [
                              ListTile(
                                title: Text(org.name),
                                trailing: const Icon(Icons.arrow_forward_ios),
                                onTap: () async {
                                  final journalRepo = Provider.of<JournalRepository>(context, listen: false);
                                  const ledgerType = 'political_organization';
                                  final initialYear = await journalRepo.findInitialYear(org.id, ledgerType);
                                  if (context.mounted) {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (context) => JournalListPage(
                                          ledgerId: org.id, ledgerType: ledgerType,
                                          myRole: 'admin', // TODO: Fetch actual role
                                          ledgerName: org.name, initialYear: initialYear,
                                        ),
                                      ),
                                    );
                                  }
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
