import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:polimoney_ledger/core/services/appwrite_client.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/login_page.dart';

class AppwriteConfigPage extends StatefulWidget {
  const AppwriteConfigPage({super.key});

  @override
  State<AppwriteConfigPage> createState() => _AppwriteConfigPageState();
}

class _AppwriteConfigPageState extends State<AppwriteConfigPage> {
  final _formKey = GlobalKey<FormState>();
  final _endpointController = TextEditingController(text: 'https://cloud.appwrite.io/v1');
  final _projectIdController = TextEditingController();
  final _storage = const FlutterSecureStorage();

  @override
  void dispose() {
    _endpointController.dispose();
    _projectIdController.dispose();
    super.dispose();
  }

  Future<void> _saveAndProceed() async {
    if (_formKey.currentState!.validate()) {
      final endpoint = _endpointController.text;
      final projectId = _projectIdController.text;

      // 1. Save the Appwrite config securely.
      await _storage.write(key: 'appwrite_endpoint', value: endpoint);
      await _storage.write(key: 'appwrite_project_id', value: projectId);

      // 2. Initialize Appwrite Client.
      AppwriteClient.instance.initialize(endpoint: endpoint, projectId: projectId);

      // 3. Navigate to the LoginPage.
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const LoginPage()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Appwrite Configuration'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              const Text(
                'Please enter your Appwrite project credentials. '
                'You can find these in your Appwrite console settings.',
                style: TextStyle(fontStyle: FontStyle.italic),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _endpointController,
                decoration: const InputDecoration(
                  labelText: 'Endpoint',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'This field is required';
                  }
                  if (!Uri.parse(value).isAbsolute) {
                    return 'Please enter a valid URL';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _projectIdController,
                decoration: const InputDecoration(
                  labelText: 'Project ID',
                  border: OutlineInputBorder(),
                ),
                validator: (value) => value!.isEmpty ? 'This field is required' : null,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _saveAndProceed,
                child: const Text('Save and Continue'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
