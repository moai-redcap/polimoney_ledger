import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ErrorMessageWidget extends StatelessWidget {
  final String message;
  final String code;

  const ErrorMessageWidget({
    super.key,
    required this.message,
    required this.code,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 60),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            // Row to hold the error code and the copy button
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  'エラーコード: $code',
                  style: TextStyle(color: Colors.grey[600]),
                ),
                IconButton(
                  icon: const Icon(Icons.copy, size: 18.0),
                  tooltip: 'エラーコードをコピー',
                  onPressed: () {
                    // Copy the error code to the clipboard
                    Clipboard.setData(ClipboardData(text: code));
                    // Show a confirmation message
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('エラーコードをコピーしました。'),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
