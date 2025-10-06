# 技術スタック

## フロントエンド（Webアプリケーション）
- **フレームワーク**: React 18.x
- **言語**: TypeScript 5.0+
- **ビルドツール**: Vite 5.x
- **UIフレームワーク**: CSS Modules + Tailwind CSS
- **WebRTC**: ネイティブブラウザAPI + Ion-SDK-JS
- **WebSocket**: ネイティブWebSocket API
- **感情検出**:
  - Option A: MediaPipe FaceLandmarker（Web Worker）
  - Option B: Manual Slider Input
- **状態管理**: React Context API + useReducer
- **データフォーマット**: JSON / MessagePack
- **テスト**: Jest + React Testing Library + Playwright

## バックエンド
- **言語**: Go 1.21+
- **SFU**: Ion-SFU (Pion WebRTC)
- **シグナリング**: Gorilla WebSocket
- **キャッシュ**: Redis 7+
- **メッセージキュー**: NATS (optional)
- **API Gateway**: Go Fiber / Gin
- **コンテナ**: Docker + Docker Compose
- **プロキシ**: Nginx

## 開発環境
- **プラットフォーム**: Modern Web Browsers (Chrome, Firefox, Safari, Edge)
- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
- **ハードウェア**: 
  - CPU: 2コア以上
  - メモリ: 4GB以上
  - カメラ: 内蔵/外付けWebカメラ
- **ネットワーク**: HTTPS必須（WebRTC制約）

## ポート構成
- **nginx**: 80 (HTTP), 443 (HTTPS)
- **signaling**: 8080 (WebSocket)
- **ion-sfu**: 5000 (gRPC), 7000 (WebSocket), 50000-50100/udp (WebRTC)
- **redis**: 6379
- **emotion-api**: 8081 (REST)