# タスク完了時のガイドライン

## 開発完了時に実行すべきコマンド

### 1. コード品質チェック
```bash
# TypeScript型チェック
npx tsc --noEmit

# ESLintチェック
npm run lint

# Prettierフォーマット
npm run format
```

### 2. テスト実行
```bash
# 単体テスト
npm run test

# E2Eテスト（必要時）
npm run test:e2e

# カバレッジレポート
npm run test:coverage
```

### 3. ビルド検証
```bash
# プロダクションビルド
npm run build

# ビルド成果物確認
npm run preview
```

### 4. 機能テスト
```bash
# 開発サーバー起動
npm run dev

# バックエンド接続確認
curl http://192.168.3.39:8080/health

# WebSocket接続テスト（ブラウザで確認）
# - ユーザー名入力
# - ルーム参加
# - WebRTC接続
# - 感情データ送受信
```

## Git関連の完了処理

### コミット前チェック
```bash
# 変更ファイル確認
git status

# 差分確認
git diff

# ステージング
git add .

# コミットメッセージ規約
git commit -m "feat: implement emotion sharing with MediaPipe"
git commit -m "fix: resolve WebRTC connection issues"
git commit -m "refactor: improve component structure"
```

## デプロイ前チェックリスト

### 環境設定確認
- [ ] `.env.production`設定完了
- [ ] API接続先URL確認
- [ ] HTTPS設定確認
- [ ] セキュリティ設定確認

### パフォーマンス確認
- [ ] バンドルサイズ最適化
- [ ] レスポンス時間測定
- [ ] メモリリーク確認
- [ ] WebRTC接続品質確認

### ブラウザ互換性確認
- [ ] Chrome (推奨)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## 品質基準

### コードカバレッジ
- 単体テスト: 80%以上
- 統合テスト: 主要フロー100%

### パフォーマンス目標
- 初期ロード: 3秒以内
- WebRTC接続: 5秒以内
- 感情データ遅延: 100ms以内

### エラー率
- JavaScript エラー: 1%未満
- WebRTC接続失敗: 5%未満
- WebSocket切断: 2%未満

## ドキュメント更新

### 完了時に更新すべきファイル
- `README.md` - セットアップ手順
- `CHANGELOG.md` - 変更履歴
- `API.md` - API仕様（該当時）
- コンポーネントドキュメント（Storybook等）

## 通知・報告

### 完了報告項目
1. 実装した機能の概要
2. 技術的な課題と解決方法
3. テスト結果サマリー
4. 残課題・改善提案
5. 次フェーズへの引き継ぎ事項