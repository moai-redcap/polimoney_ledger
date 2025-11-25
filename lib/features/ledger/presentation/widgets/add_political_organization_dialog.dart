import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/ledger_repository.dart';

class AddPoliticalOrganizationDialog extends StatefulWidget {
  const AddPoliticalOrganizationDialog({super.key});

  @override
  State<AddPoliticalOrganizationDialog> createState() => _AddPoliticalOrganizationDialogState();
}

class _AddPoliticalOrganizationDialogState extends State<AddPoliticalOrganizationDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final repo = Provider.of<LedgerRepository>(context, listen: false);
      final userId = Supabase.instance.client.auth.currentUser!.id;
      await repo.createPoliticalOrganization(_nameController.text.trim(), userId);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('保存に失敗しました: $e'), backgroundColor: Colors.red));
      }
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('政治団体を追加'),
      content: Form(
        key: _formKey,
        child: TextFormField(
          controller: _nameController,
          decoration: const InputDecoration(labelText: '政治団体名'),
          validator: (value) => (value == null || value.isEmpty) ? '入力してください' : null,
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('キャンセル')),
        ElevatedButton(
          onPressed: _isLoading ? null : _save,
          child: _isLoading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('保存'),
        ),
      ],
    );
  }
}
