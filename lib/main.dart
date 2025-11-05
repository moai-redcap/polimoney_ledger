import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:polimoney_ledger/core/services/appwrite_client.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/appwrite_config_page.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/login_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final _storage = const FlutterSecureStorage();
  late Future<Widget> _initialPageFuture;

  @override
  void initState() {
    super.initState();
    _initialPageFuture = _getInitialPage();
  }

  Future<Widget> _getInitialPage() async {
    final endpoint = await _storage.read(key: 'appwrite_endpoint');
    final projectId = await _storage.read(key: 'appwrite_project_id');

    if (endpoint != null && projectId != null) {
      // Config exists, initialize Appwrite client and go to login page
      AppwriteClient.instance.initialize(endpoint: endpoint, projectId: projectId);
      return const LoginPage();
    } else {
      // No config, go to config page
      return const AppwriteConfigPage();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'polimoney_ledger',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),
      home: FutureBuilder<Widget>(
        future: _initialPageFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }
          if (snapshot.hasError) {
            return Scaffold(
              body: Center(
                child: Text('An error occurred: ${snapshot.error}'),
              ),
            );
          }
          if (snapshot.hasData) {
            return snapshot.data!;
          }
          // Default case
          return const Scaffold(
            body: Center(
              child: Text('An unknown error occurred.'),
            ),
          );
        },
      ),
    );
  }
}
