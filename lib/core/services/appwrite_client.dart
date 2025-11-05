import 'package:appwrite/appwrite.dart';

class AppwriteClient {
  static final AppwriteClient instance = AppwriteClient._internal();
  factory AppwriteClient() => instance;
  AppwriteClient._internal();

  Client? _client;

  Client get client {
    if (_client == null) {
      throw Exception('Appwrite client not initialized. Call initialize() first.');
    }
    return _client!;
  }

  void initialize({required String endpoint, required String projectId}) {
    _client = Client()
      ..setEndpoint(endpoint)
      ..setProject(projectId)
      ..setSelfSigned(status: true); // For development only
  }
}
