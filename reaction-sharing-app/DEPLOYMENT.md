# デプロイメント手順書

## 本番環境へのデプロイ

### 前提条件

1. **必要なツール**
   - Node.js v18以上
   - Yarn（`npm install -g yarn`）
   - SSH接続設定済み（VPSへのアクセス）

2. **環境変数の設定**
   - `.env.production`ファイルが正しく設定されていること
   - 本番環境のAPIエンドポイントが正しいこと

### デプロイ手順

#### 1. 環境変数の確認

`.env.production`ファイルを開いて、以下の設定を確認：

```bash
# Backend API URL (nginxプロキシ経由)
VITE_API_BASE_URL=https://os3-294-36938.vs.sakura.ne.jp

# WebSocket Signaling URL
VITE_SIGNALING_URL=wss://os3-294-36938.vs.sakura.ne.jp/ws

# Laugh Preset API
VITE_LAUGH_API_URL=https://os3-294-36938.vs.sakura.ne.jp/laugh-api

# Static files
VITE_STATIC_BASE_URL=https://os3-294-36938.vs.sakura.ne.jp
```

#### 2. デプロイスクリプトの実行

```bash
cd reaction-sharing-app
./deploy.sh
```

#### 3. デプロイ確認

スクリプトが情報を表示し、確認を求めます。`y`を入力してEnterでデプロイ開始。

### デプロイ後の確認項目

- [ ] ブラウザで https://os3-294-36938.vs.sakura.ne.jp を開く
- [ ] 笑い声プリセット選択UIが表示される
- [ ] プリセットがダウンロードされる
- [ ] 試聴ボタンで音声が再生される

### バックエンド側の準備

笑い声機能を完全に動作させるには、バックエンド側で静的ファイル配信の設定が必要です。

詳細は開発ドキュメントを参照してください。
