import 'package:flutter/material.dart';

class SetupWizardPage extends StatefulWidget {
  const SetupWizardPage({super.key});

  @override
  State<SetupWizardPage> createState() => _SetupWizardPageState();
}

class _SetupWizardPageState extends State<SetupWizardPage> {
  final _apiKeyController = TextEditingController();

  void _startSetup() {
    final apiKey = _apiKeyController.text;
    if (apiKey.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an API Key.')),
      );
      return;
    }
    // TODO: Implement the setup logic using the API Key
    // 1. Create collections
    // 2. Create 'super-admin' team
    // 3. On success, navigate to the master account creation page
  }

  @override
  void dispose() {
    _apiKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Initial Setup Wizard'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Welcome! Let\u0027s set up your project.',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text(
              'This one-time setup will automatically create the necessary database collections and teams in your Appwrite project.'),
            const SizedBox(height: 24),
            const Text(
              'Instructions:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              '1. Open your Appwrite project in a web browser.\n'
              '2. Go to the "API Keys" section.\n'
              '3. Click "Create API Key".\n'
              '4. Give it a name (e.g., "InitialSetupKey").\n'
              '5. IMPORTANT: Select ONLY these two scopes:\n'
              '   - databases.write\n'
              '   - teams.write\n'
              '6. Create the key and copy the "API Key Secret".\n'
              '7. Paste the secret into the box below.'),
            const SizedBox(height: 24),
            TextField(
              controller: _apiKeyController,
              decoration: const InputDecoration(
                labelText: 'Paste API Key Secret here',
                border: OutlineInputBorder(),
              ),
              obscureText: true,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _startSetup,
                child: const Text('Start Setup'),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Note: This API key is used only once for setup and is not stored in the app. For security, please delete the key from your Appwrite console after setup is complete.',
              style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
