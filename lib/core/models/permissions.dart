/// アプリ内でチェックされる権限の種類
enum AppPermission {
  // 仕訳（収支）関連
  submitJournal, // 仕訳を起票（承認申請）する権限
  registerJournal, // 仕訳を即時登録（自己承認）する権限
  approveJournal, // 他人の仕訳を承認・却下する権限

  // メンバー関連
  manageMembers, // メンバーの招待・削除・役割変更を行う権限

  // 台帳設定関連
  editLedgerSettings, // 台帳名の変更など、設定を編集する権限

  // 閲覧権限
  viewLedger, // 台帳（仕訳一覧など）を閲覧する権限

  // 関係者マスタ管理権限
  manageContacts, // 関係者マスタ（非公開設定含む）を編集する権限
}
