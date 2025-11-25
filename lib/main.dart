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
import 'package:polimoney_ledger/features/ledger/data/repositories/account_repository.dart'; // Import new repository

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final prefs = await SharedPreferences.getInstance();
  final supabaseUrl = prefs.getString('supabase_url');
  final supabaseAnonKey = prefs.getString('supabase_anon_key');

  if (supabaseUrl != null && supabaseAnonKey != null) {
    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  } else {
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
        // Add the new repository to the provider list
        Provider<AccountRepository>(
          create: (_) => AccountRepository(Supabase.instance.client),
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
    Widget getInitialPage() {
      if (!isConfigured) {
        return const SupabaseConfigPage();
      }
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        return const HomePage();
      } else {
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
