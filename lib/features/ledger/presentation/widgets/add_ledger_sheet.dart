import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/ledger/data/repositories/ledger_repository.dart';
import 'package:polimoney_ledger/features/ledger/domain/models/politician.dart';

enum LedgerType { organization, election }

class AddLedgerSheet extends StatefulWidget {
  const AddLedgerSheet({super.key});

  @override
  State<AddLedgerSheet> createState() => _AddLedgerSheetState();
}

class _AddLedgerSheetState extends State<AddLedgerSheet> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  LedgerType _selectedLedgerType = LedgerType.organization;

  // Political Organization Fields
  final _organizationNameController = TextEditingController();

  // Election Fields
  final _electionNameController = TextEditingController();
  DateTime? _electionDate;
  Politician? _selectedPolitician;
  List<Politician> _politicians = [];
  bool _isPoliticiansLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchPoliticians();
  }

  Future<void> _fetchPoliticians() async {
    if (!mounted) return;
    setState(() => _isPoliticiansLoading = true);
    try {
      final repo = Provider.of<LedgerRepository>(context, listen: false);
      final userId = Supabase.instance.client.auth.currentUser!.id;
      final politicians = await repo.fetchPoliticians(userId);
      if (mounted) setState(() => _politicians = politicians);
    } catch (e) {
      // Handle error appropriately
    } finally {
      if (mounted) setState(() => _isPoliticiansLoading = false);
    }
  }

  @override
  void dispose() {
    _organizationNameController.dispose();
    _electionNameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedLedgerType == LedgerType.election && _electionDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('選挙の投開票日を選択してください。'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final repo = Provider.of<LedgerRepository>(context, listen: false);
      final userId = Supabase.instance.client.auth.currentUser!.id;

      if (_selectedLedgerType == LedgerType.organization) {
        await repo.createPoliticalOrganization(_organizationNameController.text.trim(), userId);
      } else {
        await repo.createElection(
          ownerUserId: userId,
          politicianId: _selectedPolitician!.id,
          electionName: _electionNameController.text.trim(),
          electionDate: _electionDate!,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('保存に失敗しました: $e'), backgroundColor: Colors.red),
        );
      }
      setState(() => _isLoading = false);
    }
  }

  Future<void> _addNewPolitician() async {
    final newPoliticianNameController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final newPolitician = await showDialog<Politician>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('新規政治家の追加'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: newPoliticianNameController,
            decoration: const InputDecoration(labelText: '政治家名'),
            validator: (value) => (value == null || value.isEmpty) ? '名前を入力してください' : null,
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('キャンセル')),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              try {
                final repo = Provider.of<LedgerRepository>(context, listen: false);
                final userId = Supabase.instance.client.auth.currentUser!.id;
                final created = await repo.createPolitician(newPoliticianNameController.text.trim(), userId);
                if (mounted) Navigator.of(context).pop(created);
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('政治家の追加に失敗しました: $e')));
              }
            },
            child: const Text('追加'),
          ),
        ],
      ),
    );
    if (newPolitician != null) {
      setState(() {
        _politicians.add(newPolitician);
        _selectedPolitician = newPolitician;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('新規台帳の登録'),
        actions: [
          TextButton(
             onPressed: _isLoading ? null : _save,
             child: const Text('保存', style: TextStyle(color: Colors.white)),
          )
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            SegmentedButton<LedgerType>(
              segments: const <ButtonSegment<LedgerType>>[
                ButtonSegment<LedgerType>(value: LedgerType.organization, label: Text('政治団体')),
                ButtonSegment<LedgerType>(value: LedgerType.election, label: Text('選挙')),
              ],
              selected: <LedgerType>{_selectedLedgerType},
              onSelectionChanged: (Set<LedgerType> newSelection) {
                setState(() {
                  _selectedLedgerType = newSelection.first;
                });
              },
            ),
            const SizedBox(height: 24),
            if (_selectedLedgerType == LedgerType.organization)
              TextFormField(
                controller: _organizationNameController,
                decoration: const InputDecoration(labelText: '政治団体名'),
                validator: (value) => (value == null || value.isEmpty) ? '政治団体名を入力してください' : null,
              ),
            if (_selectedLedgerType == LedgerType.election) ...[
              _isPoliticiansLoading
                  ? const Center(child: CircularProgressIndicator())
                  : DropdownButtonFormField<Politician>(
                      value: _selectedPolitician,
                      decoration: InputDecoration(
                        labelText: '政治家',
                        suffixIcon: IconButton(icon: const Icon(Icons.person_add), onPressed: _addNewPolitician),
                      ),
                      items: _politicians.map((p) => DropdownMenuItem(value: p, child: Text(p.name))).toList(),
                      onChanged: (value) => setState(() => _selectedPolitician = value),
                      validator: (value) => (value == null) ? '政治家を選択してください' : null,
                    ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _electionNameController,
                decoration: const InputDecoration(labelText: '選挙名 (例: 2025年〇〇市議選)'),
                validator: (value) => (value == null || value.isEmpty) ? '選挙名を入力してください' : null,
              ),
              const SizedBox(height: 16),
              ListTile(
                title: Text(_electionDate == null ? '選挙の投開票日を選択' : '投開票日: ${_electionDate!.toIso8601String().substring(0, 10)}'),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime(2000),
                    lastDate: DateTime(2101),
                  );
                  if (picked != null) setState(() => _electionDate = picked);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}
