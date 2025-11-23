import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/splash_page.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/supabase_config_page.dart';
import 'package:provider/provider.dart';
import 'package:polimoney_ledger/features/home/presentation/pages/home_page.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/ledger_repository.dart';
import 'package:polimoney_ledger/features/journal/data/repositories/journal_repository.dart';
import 'package:polimoney_ledger/features/contacts/data/repositories/contact_repository.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/sub_account_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final prefs = await SharedPreferences.getInstance();
  final supabaseUrl = prefs.getString('supabase_url');
  final supabaseAnonKey = prefs.getString('supabase_anon_key');

  if (supabaseUrl != null && supabaseAnonKey != null) {
    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  } else {
    // ユーザーがまだ設定を入力していない場合、SupabaseConfigPageが最初の画面になる
    // そのため、ここではプレースホルダーで初期化しておく
    await Supabase.initialize(
      url: 'https://placeholder.supabase.co',
      anonKey: 'placeholder',
    );
  }

  runApp(
    MultiProvider(
      providers: [
        Provider<LedgerRepository>(
          create: (_) => LedgerRepository(Supabase.instance.client),
        ),
        Provider<JournalRepository>(
          create: (_) => JournalRepository(Supabase.instance.client),
        ),
        Provider<ContactRepository>(
          create: (_) => ContactRepository(Supabase.instance.client),
        ),
        Provider<SubAccountRepository>(
          create: (_) => SubAccountRepository(Supabase.instance.client),
        ),
      ],
      child: MyApp(isConfigured: supabaseUrl != null),
    ),
  );
}

class MyApp extends StatelessWidget {
  final bool isConfigured;
  const MyApp({super.key, required this.isConfigured});

  @override
  Widget build(BuildContext context) {
    // ログイン状態に応じて初期画面を振り分ける
    Widget getInitialPage() {
      if (!isConfigured) {
        return const SupabaseConfigPage();
      }

      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        return const HomePage();
      } else {
        // 設定済みで、未ログインの場合はSplashPageでユーザー数を確認
        return const SplashPage();
      }
    }

    return MaterialApp(
      title: 'polimoney_ledger',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),
      home: getInitialPage(),
    );
  }
}
