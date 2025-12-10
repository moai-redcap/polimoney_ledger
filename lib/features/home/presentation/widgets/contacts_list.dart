import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:polimoney_ledger/features/contacts/data/repositories/contact_repository.dart';
import 'package:polimoney_ledger/features/contacts/domain/models/contact.dart';
import 'package:polimoney_ledger/features/contacts/presentation/widgets/add_contact_sheet.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/empty_state_widget.dart';
import 'package:polimoney_ledger/features/ledger/presentation/widgets/error_message_widget.dart';

/// ホーム画面に埋め込む関係者一覧ウィジェット
class ContactsList extends StatelessWidget {
  final Future<List<Contact>> contactsFuture;
  final VoidCallback onRefresh;

  const ContactsList({
    super.key,
    required this.contactsFuture,
    required this.onRefresh,
  });

  String _getContactTypeLabel(String contactType) {
    return contactType == 'person' ? '個人' : '法人/団体';
  }

  void _showEditContactSheet(BuildContext context, Contact contact) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => AddContactSheet(contact: contact),
    );
    if (result == true) {
      onRefresh();
    }
  }

  Future<void> _confirmDeleteContact(BuildContext context, Contact contact) async {
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

    if (confirmed == true && context.mounted) {
      try {
        final contactRepo = Provider.of<ContactRepository>(context, listen: false);
        await contactRepo.deleteContact(contact.id);
        onRefresh();
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('関係者を削除しました')),
          );
        }
      } catch (e) {
        if (context.mounted) {
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

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Contact>>(
      future: contactsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return ErrorMessageWidget(
            message: 'Error: ${snapshot.error}',
            code: 'E-CON-01',
          );
        }

        return Column(
          children: [
            Expanded(
              child: (!snapshot.hasData || snapshot.data!.isEmpty)
                  ? const EmptyStateWidget(
                      message: 'まだ関係者が登録されていません。',
                      callToAction: '右下のボタンから追加しましょう！',
                    )
                  : Container(
                      decoration: BoxDecoration(
                        border: Border(
                          top: BorderSide(
                            color: Theme.of(context).dividerColor,
                            width: 0.8,
                          ),
                        ),
                      ),
                      child: ListView.builder(
                        itemCount: snapshot.data!.length,
                        itemBuilder: (context, index) {
                          final contact = snapshot.data![index];
                          final hasPrivacySettings = contact.isNamePrivate ||
                              contact.isAddressPrivate ||
                              contact.isOccupationPrivate;

                          return Column(
                            children: [
                              ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: contact.contactType == 'person'
                                      ? Colors.blue[100]
                                      : Colors.orange[100],
                                  child: Icon(
                                    contact.contactType == 'person'
                                        ? Icons.person
                                        : Icons.business,
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
                                        child: Icon(
                                          Icons.lock,
                                          size: 16,
                                          color: Colors.grey[500],
                                        ),
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
                                      _showEditContactSheet(context, contact);
                                    } else if (value == 'delete') {
                                      _confirmDeleteContact(context, contact);
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
                                onTap: () => _showEditContactSheet(context, contact),
                              ),
                              const Divider(height: 1, thickness: 0.8),
                            ],
                          );
                        },
                      ),
                    ),
            ),
          ],
        );
      },
    );
  }
}

