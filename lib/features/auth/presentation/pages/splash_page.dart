import 'package:flutter/material.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/login_page.dart';
import 'package:polimoney_ledger/features/auth/presentation/pages/signup_page.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    // initState内で非同期処理を呼び出し、画面遷移を行う
    _redirect();
  }

  Future<void> _redirect() async {
    // buildメソッドが完了するのを待つため、少し遅延を入れる
    await Future.delayed(Duration.zero);
    if (!mounted) return;

    try {
      // SupabaseのRPC（Remote Procedure Call）で 'get_user_count' 関数を呼び出す
      final userCount = await Supabase.instance.client.rpc('get_user_count') as int;

      if (!mounted) return;

      if (userCount == 0) {
        // ユーザーが0人なら、マスターアカウント作成画面へ
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const SignUpPage()),
        );
      } else {
        // ユーザーが1人以上いるなら、ログイン画面へ
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const LoginPage()),
        );
      }
    } catch (e) {
      // エラーが発生した場合（例: ネットワークエラー、関数が存在しない）
      // エラー表示用のページに遷移するか、ログインページにフォールバックする
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('エラー: ユーザー数の確認に失敗しました。 ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const LoginPage()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // ユーザー数をチェックしている間は、ローディング画面を表示
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
