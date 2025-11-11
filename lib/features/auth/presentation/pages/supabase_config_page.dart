import 'package:flutter/material.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/login_page.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfigPage extends StatefulWidget {
  const SupabaseConfigPage({super.key});

  @override
  State<SupabaseConfigPage> createState() => _SupabaseConfigPageState();
}

class _SupabaseConfigPageState extends State<SupabaseConfigPage> {
  final _formKey = GlobalKey<FormState>();
  final _urlController = TextEditingController();
  final _anonKeyController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _urlController.dispose();
    _anonKeyController.dispose();
    super.dispose();
  }

  Future<void> _saveAndProceed() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final url = _urlController.text.trim();
    final anonKey = _anonKeyController.text.trim();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('supabase_url', url);
      await prefs.setString('supabase_anon_key', anonKey);

      await Supabase.instance.client.dispose();
      await Supabase.initialize(url: url, anonKey: anonKey);
      
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const LoginPage()),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Supabaseの初期化に失敗しました: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if(mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Supabase 設定')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              const Text(
                'Supabaseプロジェクトの接続情報を入力してください。\nURLは「Settings > Data API」、Anonキーは「Settings > API Keys」で確認できます。',
                style: TextStyle(fontStyle: FontStyle.italic),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _urlController,
                decoration: const InputDecoration(
                  labelText: 'プロジェクトURL',
                  border: OutlineInputBorder(),
                ),
                validator: (value) => (value == null || !Uri.parse(value).isAbsolute) ? '有効なURLを入力してください' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _anonKeyController,
                decoration: const InputDecoration(
                  labelText: 'Anonキー (public)',
                  border: OutlineInputBorder(),
                ),
                validator: (value) => value!.isEmpty ? 'このフィールドは必須です' : null,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _saveAndProceed,
                child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('保存して続行'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
