# 実装ロードマップ

## 全体スケジュール（23日間）

### Phase 1: 基盤構築（3日間）
**目的**: プロジェクトの基本構造とコア機能の土台を構築

**Day 1: プロジェクトセットアップ**
- React + TypeScript + Vite プロジェクト初期化
- 依存関係インストール（MediaPipe, WebRTC関連）
- Tailwind CSS設定
- プロジェクト構造作成

**Day 2: 基本UIコンポーネント作成**
- App.tsxとルーティング設定
- 共通コンポーネント（Modal, Button, LoadingSpinner）
- エラー境界の実装
- 基本レイアウトとスタイリング

**Day 3: 状態管理基盤**
- AuthContextの実装
- ローカルストレージユーティリティ
- ロガーシステムの実装
- 環境変数設定（.env.development）

### Phase 2: ユーザー認証とロビー機能（3日間）
**目的**: ユーザー名入力と部屋選択機能の実装

**Day 4: ユーザー名モーダル**
- UserNameModal.tsxコンポーネント
- バリデーションロジック（3-20文字、英数字）
- ローカルストレージへの保存
- 既存ユーザー名の自動読み込み

**Day 5: ロビー画面**
- LobbyView.tsxページコンポーネント
- RoomList.tsx（部屋一覧表示）
- RoomCard.tsx（個別部屋情報）
- モックデータでの表示テスト

**Day 6: ナビゲーション統合**
- ユーザー認証フローの実装
- ルーティングガードの追加
- 部屋選択後の遷移処理
- ローディング状態の管理

### Phase 3: WebSocket通信とシグナリング（4日間）
**目的**: バックエンドとのリアルタイム通信を確立

**Day 7: WebSocketクライアント実装**
- WebSocketClient.ts実装
- 接続確立・自動再接続（指数バックオフ）
- ハートビート機能

**Day 8: メッセージハンドラー**
- MessageHandler.ts実装
- メッセージ型定義（TypeScript）
- イベントエミッター実装
- メッセージルーティング

**Day 9: WebRTCContext実装**
- WebRTCContextプロバイダー
- 接続状態管理（Reducer）
- ピア管理ロジック
- useWebRTCカスタムフック

**Day 10: 統合テスト**
- バックエンド（192.168.3.39）との接続テスト
- 部屋参加/退出フローのテスト
- 接続エラーシナリオのテスト
- 再接続機能の検証

### Phase 4: WebRTC接続とメディア制御（5日間）
**目的**: ビデオ/オーディオストリームとデータチャネルの確立

**Day 11: メディアデバイス管理**
- useMediaDevices.ts実装
- getUserMedia API の使用
- デバイス列挙と選択
- ストリーム管理

**Day 12: RTCPeerConnection管理**
- PeerConnection.ts実装
- PeerConnectionファクトリー
- Offer/Answer生成
- ICE候補処理

**Day 13: データチャネル実装**
- DataChannel.ts実装
- データチャネル作成
- メッセージ送受信
- バッファ管理

**Day 14: ビデオ表示コンポーネント**
- LocalVideo.tsx（ローカルビデオ表示）
- RemoteVideoGrid.tsx（リモートビデオグリッド）
- ビデオコントロール（ミュート、カメラ切替）
- レスポンシブレイアウト

**Day 15: 統合とデバッグ**
- 完全なピア接続フローのテスト
- 複数ピア接続の検証
- ネットワーク切断/再接続テスト
- WebRTC統計情報の収集

### Phase 5: MediaPipe統合とリアクション処理（5日間）
**目的**: 顔認識によるリアクション検出と共有

**Day 16-17: MediaPipe Web Worker実装**
- mediapipe.worker.ts実装
- FaceLandmarker初期化
- フレーム処理ループ
- ランドマーク抽出

**Day 18-19: リアクション処理システム**
- ReactionProcessor.ts実装
- 感情スコア計算アルゴリズム
- ReactionContext実装
- データチャネル経由での送信

**Day 20: リアクション表示UI**
- ReactionIndicator.tsx実装
- リアルタイム表示
- 履歴管理
- 視覚化コンポーネント

### Phase 6: 最適化とテスト（3日間）
**目的**: パフォーマンス最適化と総合テスト

**Day 21: パフォーマンス最適化**
- React.memo, useMemo最適化
- バンドルサイズ削減
- WebRTC品質調整
- メモリリーク対策

**Day 22: 総合テスト**
- E2Eテストスイート作成
- 負荷テスト
- ブラウザ互換性テスト
- エラーハンドリングテスト

**Day 23: 本番準備**
- 本番環境設定
- デプロイメント準備
- ドキュメント整備
- 最終動作確認

## 現在のステータス
- **現在位置**: Phase 1 開始前（プロジェクト初期化必要）
- **次のアクション**: React + TypeScript プロジェクトの初期化