import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/contacts/data/repositories/contact_repository.dart';
import 'package:polimoney_ledger/features/contacts/domain/models/contact.dart';

/// 関係者登録・編集画面
/// 仕様書: 3.9. 関係者登録・編集画面 (AddContactSheet)
class AddContactSheet extends StatefulWidget {
  final Contact? contact;

  const AddContactSheet({super.key, this.contact});

  @override
  State<AddContactSheet> createState() => _AddContactSheetState();
}

class _AddContactSheetState extends State<AddContactSheet> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  // 基本情報
  String _contactType = 'person';
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _occupationController = TextEditingController();

  // プライバシー設定
  bool _isNamePrivate = false;
  bool _isAddressPrivate = false;
  bool _isOccupationPrivate = false;
  String? _privacyReasonType;
  final _privacyReasonOtherController = TextEditingController();

  bool get _hasAnyPrivacySetting =>
      _isNamePrivate || _isAddressPrivate || _isOccupationPrivate;

  bool get _isEditing => widget.contact != null;

  @override
  void initState() {
    super.initState();
    if (widget.contact != null) {
      final c = widget.contact!;
      _contactType = c.contactType;
      _nameController.text = c.name;
      _addressController.text = c.address ?? '';
      _occupationController.text = c.occupation ?? '';
      _isNamePrivate = c.isNamePrivate;
      _isAddressPrivate = c.isAddressPrivate;
      _isOccupationPrivate = c.isOccupationPrivate;
      _privacyReasonType = c.privacyReasonType;
      _privacyReasonOtherController.text = c.privacyReasonOther ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _occupationController.dispose();
    _privacyReasonOtherController.dispose();
    super.dispose();
  }

  Future<void> _saveContact() async {
    if (!_formKey.currentState!.validate()) return;

    // プライバシー設定のバリデーション
    if (_hasAnyPrivacySetting && _privacyReasonType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('非公開設定がある場合は理由を選択してください'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (_privacyReasonType == 'other' &&
        _privacyReasonOtherController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('「その他」を選択した場合は理由を入力してください'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final contactRepo = Provider.of<ContactRepository>(context, listen: false);
      final userId = Supabase.instance.client.auth.currentUser!.id;

      final contact = Contact(
        id: widget.contact?.id ?? '',
        ownerUserId: userId,
        contactType: _contactType,
        name: _nameController.text.trim(),
        address: _addressController.text.trim().isEmpty
            ? null
            : _addressController.text.trim(),
        occupation: _contactType == 'person' && _occupationController.text.trim().isNotEmpty
            ? _occupationController.text.trim()
            : null,
        isNamePrivate: _isNamePrivate,
        isAddressPrivate: _isAddressPrivate,
        isOccupationPrivate: _isOccupationPrivate,
        privacyReasonType: _hasAnyPrivacySetting ? _privacyReasonType : null,
        privacyReasonOther: _privacyReasonType == 'other'
            ? _privacyReasonOtherController.text.trim()
            : null,
        createdAt: widget.contact?.createdAt ?? DateTime.now(),
      );

      if (_isEditing) {
        await contactRepo.updateContact(contact);
      } else {
        await contactRepo.createContact(contact);
      }

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_isEditing ? '関係者を更新しました' : '関係者を登録しました')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('エラー: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? '関係者の編集' : '関係者の登録'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: ElevatedButton(
              onPressed: _isLoading ? null : _saveContact,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('保存'),
            ),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ガイダンステキスト
            Card(
              color: Colors.blue[50],
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '「自己資金」の仕訳を登録する場合はご自身（候補者・代表者）を「個人」として登録してください。\n'
                        '「みずほ銀行」「〇〇信用金庫」などの銀行口座や借入先も、「法人/団体」としてここから登録してください。',
                        style: TextStyle(fontSize: 13, color: Colors.blue[900]),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // 種別選択
            Text('種別', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'person',
                  label: Text('個人'),
                  icon: Icon(Icons.person),
                ),
                ButtonSegment(
                  value: 'corporation',
                  label: Text('法人/団体'),
                  icon: Icon(Icons.business),
                ),
              ],
              selected: {_contactType},
              onSelectionChanged: (selection) {
                setState(() {
                  _contactType = selection.first;
                  if (_contactType == 'corporation') {
                    _isOccupationPrivate = false;
                  }
                });
              },
            ),
            const SizedBox(height: 24),

            // 氏名/団体名
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: _contactType == 'person' ? '氏名' : '団体名',
                hintText: _contactType == 'person' ? '例: 田中太郎' : '例: みずほ銀行',
              ),
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? '入力してください' : null,
            ),
            CheckboxListTile(
              title: Text('${_contactType == 'person' ? '氏名' : '団体名'}を非公開にする'),
              value: _isNamePrivate,
              onChanged: (value) => setState(() => _isNamePrivate = value ?? false),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 16),

            // 住所
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(
                labelText: '住所',
                hintText: '例: 東京都千代田区...',
              ),
            ),
            CheckboxListTile(
              title: const Text('住所を非公開にする'),
              value: _isAddressPrivate,
              onChanged: (value) => setState(() => _isAddressPrivate = value ?? false),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 16),

            // 職業（個人のみ）
            if (_contactType == 'person') ...[
              TextFormField(
                controller: _occupationController,
                decoration: const InputDecoration(
                  labelText: '職業',
                  hintText: '例: 会社員',
                ),
              ),
              CheckboxListTile(
                title: const Text('職業を非公開にする'),
                value: _isOccupationPrivate,
                onChanged: (value) => setState(() => _isOccupationPrivate = value ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 16),
            ],

            // 非公開理由（非公開設定がある場合のみ表示）
            if (_hasAnyPrivacySetting) ...[
              const Divider(),
              const SizedBox(height: 16),
              Text(
                '非公開理由（必須）',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _privacyReasonType,
                decoration: const InputDecoration(
                  labelText: '理由を選択',
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'personal_info',
                    child: Text('個人情報保護のため'),
                  ),
                  DropdownMenuItem(
                    value: 'other',
                    child: Text('その他'),
                  ),
                ],
                onChanged: (value) => setState(() => _privacyReasonType = value),
                validator: (value) =>
                    _hasAnyPrivacySetting && value == null ? '選択してください' : null,
              ),
              if (_privacyReasonType == 'other') ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: _privacyReasonOtherController,
                  decoration: const InputDecoration(
                    labelText: 'その他の理由',
                    hintText: '具体的な理由を入力してください',
                  ),
                  maxLines: 2,
                  validator: (value) => _privacyReasonType == 'other' &&
                          (value == null || value.trim().isEmpty)
                      ? '理由を入力してください'
                      : null,
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

