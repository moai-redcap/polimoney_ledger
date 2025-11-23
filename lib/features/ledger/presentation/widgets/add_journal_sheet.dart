import 'package:flutter/material.dart';

class PaymentSource {
  String accountId;
  String accountName;
  int amount;

  PaymentSource({
    required this.accountId,
    required this.accountName,
    required this.amount,
  });
}

class AddJournalSheet extends StatefulWidget {
  const AddJournalSheet({super.key});

  @override
  State<AddJournalSheet> createState() => _AddJournalSheetState();
}

class _AddJournalSheetState extends State<AddJournalSheet> {
  final _amountController = TextEditingController();
  final _debitAccountController = TextEditingController(); // Mock for now

  // Mock Accounts
  final List<Map<String, String>> _mockAccounts = [
    {'id': '1', 'name': '現金'},
    {'id': '2', 'name': '銀行振込'},
    {'id': '3', 'name': 'クレジットカード'},
    {'id': '4', 'name': '公費負担'}, // Public Funds
    {'id': '5', 'name': '自己資金'},
  ];

  final List<PaymentSource> _paymentSources = [
    PaymentSource(accountId: '1', accountName: '現金', amount: 0),
  ];

  @override
  void dispose() {
    _amountController.dispose();
    _debitAccountController.dispose();
    super.dispose();
  }

  void _addPaymentSource() {
    setState(() {
      _paymentSources.add(
        PaymentSource(accountId: '1', accountName: '現金', amount: 0),
      );
    });
  }

  void _removePaymentSource(int index) {
    setState(() {
      _paymentSources.removeAt(index);
    });
  }

  int get _totalPaymentAmount {
    return _paymentSources.fold(0, (sum, item) => sum + item.amount);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              AppBar(
                title: const Text('仕訳登録'),
                leading: IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Date Picker
                    const ListTile(
                      title: Text('日付'),
                      trailing: Text('2023/11/23'), // Placeholder
                    ),
                    const Divider(),

                    // Debit (借方) - Expense
                    const Text(
                      '借方（支出）',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    TextField(
                      controller: _amountController,
                      decoration: const InputDecoration(labelText: '支出金額'),
                      keyboardType: TextInputType.number,
                      onChanged: (value) => setState(() {}),
                    ),
                    TextField(
                      controller: _debitAccountController,
                      decoration: const InputDecoration(
                        labelText: '勘定科目（例: 消耗品費）',
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Credit (貸方) - Payment Source (Split Payment UI)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '貸方（支払元）',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        TextButton.icon(
                          onPressed: _addPaymentSource,
                          icon: const Icon(Icons.add),
                          label: const Text('行を追加'),
                        ),
                      ],
                    ),

                    ..._paymentSources.asMap().entries.map((entry) {
                      final index = entry.key;
                      final source = entry.value;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Row(
                            children: [
                              Expanded(
                                flex: 3,
                                child: InputDecorator(
                                  decoration: const InputDecoration(
                                    labelText: '支払元',
                                    border: OutlineInputBorder(),
                                    contentPadding: EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      value: source.accountId,
                                      isDense: true,
                                      items: _mockAccounts.map((account) {
                                        return DropdownMenuItem(
                                          value: account['id'],
                                          child: Text(account['name']!),
                                        );
                                      }).toList(),
                                      onChanged: (value) {
                                        setState(() {
                                          source.accountId = value!;
                                          source.accountName = _mockAccounts
                                              .firstWhere(
                                                (a) => a['id'] == value,
                                              )['name']!;
                                        });
                                      },
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                flex: 2,
                                child: TextFormField(
                                  initialValue: source.amount.toString(),
                                  decoration: const InputDecoration(
                                    labelText: '金額',
                                  ),
                                  keyboardType: TextInputType.number,
                                  onChanged: (value) {
                                    setState(() {
                                      source.amount = int.tryParse(value) ?? 0;
                                    });
                                  },
                                ),
                              ),
                              if (_paymentSources.length > 1)
                                IconButton(
                                  icon: const Icon(
                                    Icons.delete,
                                    color: Colors.red,
                                  ),
                                  onPressed: () => _removePaymentSource(index),
                                ),
                            ],
                          ),
                        ),
                      );
                    }),

                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          '合計: $_totalPaymentAmount / ${_amountController.text}',
                          style: TextStyle(
                            color:
                                _totalPaymentAmount.toString() ==
                                    _amountController.text
                                ? Colors.green
                                : Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: ElevatedButton(
                  onPressed: () {
                    // Save logic
                    // Validate total
                    if (_totalPaymentAmount.toString() !=
                        _amountController.text) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('支出金額と支払元の合計が一致しません')),
                      );
                      return;
                    }
                    Navigator.of(context).pop();
                  },
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                  ),
                  child: const Text('保存'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
