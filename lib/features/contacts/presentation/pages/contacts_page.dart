import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/contacts/data/repositories/contact_repository.dart';
import 'package:polimoney_ledger/features/contacts/domain/models/contact.dart';
import 'package:polimoney_ledger/features/contacts/presentation/widgets/add_contact_sheet.dart';

/// 関係者マスタ管理画面
/// 仕様書: 3.8. 関係者マスタ管理画面 (ContactsScreen)
class ContactsPage extends StatefulWidget {
  const ContactsPage({super.key});

  @override
  State<ContactsPage> createState() => _ContactsPageState();
}

class _ContactsPageState extends State<ContactsPage> {
  late Future<List<Contact>> _contactsFuture;

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  void _loadContacts() {
    final contactRepo = Provider.of<ContactRepository>(context, listen: false);
    final userId = Supabase.instance.client.auth.currentUser!.id;
    setState(() {
      _contactsFuture = contactRepo.fetchContacts(userId);
    });
  }

  void _showAddContactSheet({Contact? contact}) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => AddContactSheet(contact: contact),
    );
    if (result == true) {
      _loadContacts();
    }
  }

  Future<void> _confirmDeleteContact(Contact contact) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('関係者の削除'),
        content: Text('「${contact.name}」を削除しますか？\nこの操作は取り消せません。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('削除'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        final contactRepo = Provider.of<ContactRepository>(context, listen: false);
        await contactRepo.deleteContact(contact.id);
        _loadContacts();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('関係者を削除しました')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('削除に失敗しました: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  String _getContactTypeLabel(String contactType) {
    return contactType == 'person' ? '個人' : '法人/団体';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('関係者マスタ'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddContactSheet(),
        tooltip: '関係者を追加',
        child: const Icon(Icons.add),
      ),
      body: FutureBuilder<List<Contact>>(
        future: _contactsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 48),
                  const SizedBox(height: 16),
                  Text('エラー: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadContacts,
                    child: const Text('再読み込み'),
                  ),
                ],
              ),
            );
          }
          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'まだ関係者が登録されていません',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '右下のボタンから追加しましょう',
                    style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                  ),
                ],
              ),
            );
          }

          final contacts = snapshot.data!;
          return ListView.separated(
            itemCount: contacts.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final contact = contacts[index];
              final hasPrivacySettings =
                  contact.isNamePrivate || contact.isAddressPrivate || contact.isOccupationPrivate;

              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: contact.contactType == 'person'
                      ? Colors.blue[100]
                      : Colors.orange[100],
                  child: Icon(
                    contact.contactType == 'person' ? Icons.person : Icons.business,
                    color: contact.contactType == 'person'
                        ? Colors.blue[700]
                        : Colors.orange[700],
                  ),
                ),
                title: Row(
                  children: [
                    Expanded(child: Text(contact.name)),
                    if (hasPrivacySettings)
                      Tooltip(
                        message: '非公開設定あり',
                        child: Icon(Icons.lock, size: 16, color: Colors.grey[500]),
                      ),
                  ],
                ),
                subtitle: Text(
                  '${_getContactTypeLabel(contact.contactType)}${contact.address != null ? ' / ${contact.address}' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'edit') {
                      _showAddContactSheet(contact: contact);
                    } else if (value == 'delete') {
                      _confirmDeleteContact(contact);
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'edit',
                      child: ListTile(
                        leading: Icon(Icons.edit),
                        title: Text('編集'),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: ListTile(
                        leading: Icon(Icons.delete, color: Colors.red),
                        title: Text('削除', style: TextStyle(color: Colors.red)),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ),
                onTap: () => _showAddContactSheet(contact: contact),
              );
            },
          );
        },
      ),
    );
  }
}

