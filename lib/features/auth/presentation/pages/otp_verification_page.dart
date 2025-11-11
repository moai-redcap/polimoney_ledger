import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:polimoney_ledger/features/home/presentation/pages/home_page.dart';

class OtpVerificationPage extends StatefulWidget {
  final String email;
  const OtpVerificationPage({super.key, required this.email});

  @override
  State<OtpVerificationPage> createState() => _OtpVerificationPageState();
}

class _OtpVerificationPageState extends State<OtpVerificationPage> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _verifyOtp() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final otp = _otpController.text.trim();

    try {
      final response = await Supabase.instance.client.auth.verifyOTP(
        type: OtpType.signup,
        token: otp,
        email: widget.email,
      );

      if (response.session != null) {
        if (mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => const HomePage()),
            (route) => false,
          );
        }
      } else {
        if(mounted){
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('確認コードが正しくありません。'), backgroundColor: Colors.red),
          );
        }
      }
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: Colors.red),
        );
      }
    } finally {
      if(mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('本人確認')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${widget.email} に送信された8桁の確認コードを入力してください。', // Updated to 8 digits
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                maxLength: 8, // Updated to 8 digits
                textAlign: TextAlign.center,
                decoration: const InputDecoration(
                  labelText: '確認コード',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.length != 8) { // Updated to 8 digits
                    return '8桁のコードを入力してください'; // Updated to 8 digits
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _verifyOtp,
                child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('認証して登録を完了'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
