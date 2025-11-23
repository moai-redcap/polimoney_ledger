import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/login_page.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/political_organization_list.dart';

class LedgerSelectionPage extends StatelessWidget {
  const LedgerSelectionPage({super.key});

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

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('台帳選択'),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () => _signOut(context),
              tooltip: 'ログアウト',
            ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(text: '政治団体'),
              Tab(text: '選挙'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            PoliticalOrganizationList(), // Replace the placeholder
            Center(child: Text('選挙台帳リスト (未実装)')),
          ],
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            // TODO: Show AddLedgerSheet
          },
          child: const Icon(Icons.add),
        ),
      ),
    );
  }
}
