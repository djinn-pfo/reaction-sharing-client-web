# Ion-SFU感情共有システム設計書

## 1. システム概要

### 1.1 目的
Ion-SFUを基盤とした、リアルタイム感情共有システムの実装。MediaPipeによる顔ランドマーク検出とWebRTC DataChannelを活用し、低遅延で感情状態（笑度）を同一部屋の参加者間で共有する。

### 1.2 主要機能
- ユーザー認証と部屋管理
- リアルタイム顔ランドマーク検出と感情解析
- WebRTC経由での低遅延データ配信
- マルチユーザー対応の感情状態可視化

## 2. システムアーキテクチャ

### 2.1 技術スタック

#### フロントエンド
- **Framework**: Swift/SwiftUI (iOS)
- **顔認識**: MediaPipe Face Landmarker
- **WebRTC**: Ion SDK iOS / WebRTC Framework
- **プロトコル**: Protocol Buffers / MessagePack

#### バックエンド
- **SFUサーバー**: Ion-SFU (Go実装)
- **APIゲートウェイ**: Go/Fiber or Node.js/Express
- **感情解析サービス**: Python/FastAPI or Rust/Actix
- **メッセージング**: NATS/Redis Pub-Sub
- **データベース**: PostgreSQL + Redis Cache

### 2.2 コンポーネント構成

```
┌─────────────────────────────────────────────────────────┐
│                    iOS Client (SwiftUI)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Module  │  │ Room Manager │  │ Emotion View │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │             MediaPipe Face Landmarker            │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │              WebRTC Data Channel                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────┐
│                      Ion-SFU Cluster                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Media Router │  │ Data Router  │  │ Room Manager │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────┐
│                    Emotion Gateway API                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Service │  │ Room Service │  │ Event Handler│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────┐
│                 Emotion Analysis Service                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Landmark     │  │ Feature      │  │ Smile Score  │  │
│  │ Decoder      │  │ Extractor    │  │ Calculator   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 3. データフロー設計

### 3.1 ランドマークデータ送信フロー

1. **顔検出・ランドマーク抽出** (30fps)
   - MediaPipe Face Landmarkerで468点の3D顔ランドマークを検出
   - 信頼度スコアとフレームタイムスタンプを付与

2. **データエンコード**
   ```swift
   struct LandmarkPacket {
       userId: String
       roomId: String
       timestamp: UInt64
       landmarks: [Float32] // 468 * 3 = 1404 values
       confidence: Float32
   }
   ```
   - MessagePack or Protocol Buffersでシリアライズ
   - オプション: 差分圧縮で帯域幅削減

3. **WebRTC DataChannel送信**
   - Channel: `emotion-landmarks` (reliable, ordered)
   - Max Message Size: ~6KB per frame
   - Throttling: 10-15fps for bandwidth optimization

### 3.2 感情解析処理フロー

1. **ランドマークデコード**
   - バイナリデータを数値配列へ変換
   - 座標正規化（顔の大きさ・向きを補正）

2. **特徴量抽出** (MediaPipe基準点を使用)
   ```python
   # 主要な顔動作単位（Action Units）
   - AU6: 頬の持ち上がり（目尻のしわ）
   - AU12: 口角の上昇
   - AU25: 唇の開き

   # 特徴量計算
   - 口角の角度変化
   - 目の細まり具合
   - 頬の膨らみ
   - 顔全体の動き量
   ```

3. **笑度スコア計算**
   ```python
   def calculate_smile_score(features):
       # 重み付き線形結合 or 軽量NN
       weights = {
           'mouth_corner': 0.4,
           'cheek_raise': 0.3,
           'eye_crinkle': 0.2,
           'overall_motion': 0.1
       }
       raw_score = sum(w * f for w, f in zip(weights, features))

       # 時系列平滑化 (EMA)
       smoothed_score = alpha * raw_score + (1-alpha) * prev_score
       return clamp(smoothed_score, 0.0, 1.0)
   ```

4. **感情パケット生成**
   ```json
   {
       "userId": "user123",
       "smileScore": 0.85,
       "confidence": 0.92,
       "timestamp": 1704067200000,
       "emotions": {
           "happiness": 0.85,
           "surprise": 0.12,
           "neutral": 0.03
       }
   }
   ```

### 3.3 配信フロー

1. **Room-based Broadcasting**
   - Ion-SFUの部屋管理機能を活用
   - DataChannel `emotion-state`で全参加者へ配信

2. **クライアント受信・表示**
   - 感情スコアをUIに反映
   - アバターの表情アニメーション
   - ハプティックフィードバック（オプション）

## 4. プロトコル設計

### 4.1 WebRTC設定

#### DataChannel設定
```javascript
// ランドマーク送信用
{
    label: 'emotion-landmarks',
    ordered: true,
    maxRetransmits: 3,
    protocol: 'protobuf'
}

// 感情状態配信用
{
    label: 'emotion-state',
    ordered: false,
    maxPacketLifeTime: 100, // 100ms
    protocol: 'json'
}
```

#### SDP設定
- Video Codec: VP9/H.264 (環境依存)
- Audio Codec: Opus
- DataChannel: SCTP over DTLS

### 4.2 シグナリングプロトコル

#### 部屋参加フロー
```sequence
Client -> Gateway: POST /api/rooms/{roomId}/join
Gateway -> Ion-SFU: CreateSession
Ion-SFU -> Gateway: SessionID, Offer
Gateway -> Client: {sessionId, offer, iceServers}
Client -> Gateway: Answer
Gateway -> Ion-SFU: SetRemoteDescription
Client <-> Ion-SFU: ICE Candidates Exchange
Client <-> Ion-SFU: DTLS Handshake
Client <-> Ion-SFU: Media/Data Streams
```

### 4.3 認証・セキュリティ

- **JWT認証**: 各WebSocket/REST接続で検証
- **部屋レベルACL**: 参加許可リストの管理
- **E2E暗号化**: DTLS-SRTP (メディア), DTLS (データ)
- **レート制限**: ユーザー単位で10req/sec

## 5. API設計

### 5.1 REST API

#### ユーザー認証
```http
POST /api/auth/login
{
    "username": "user123"
}

Response:
{
    "token": "jwt.token.here",
    "userId": "uuid",
    "expiresIn": 3600
}
```

#### 部屋管理
```http
GET /api/rooms
Response: [
    {
        "roomId": "room-001",
        "name": "General",
        "participants": 5,
        "maxParticipants": 10
    }
]

POST /api/rooms
{
    "name": "New Room",
    "maxParticipants": 8
}

POST /api/rooms/{roomId}/join
Headers: Authorization: Bearer {token}
Response: {
    "sessionId": "sess-123",
    "iceServers": [...],
    "offer": {sdp}
}
```

### 5.2 WebSocket Events

#### クライアント→サーバー
```javascript
// 感情データ送信（fallback用）
{
    type: 'emotion.update',
    data: {
        landmarks: [...],
        timestamp: Date.now()
    }
}

// ICE Candidate
{
    type: 'ice.candidate',
    data: {
        candidate: {...}
    }
}
```

#### サーバー→クライアント
```javascript
// 他ユーザーの感情状態
{
    type: 'emotion.broadcast',
    data: {
        userId: 'user456',
        smileScore: 0.75,
        timestamp: 1704067200000
    }
}

// 部屋イベント
{
    type: 'room.user_joined',
    data: {
        userId: 'user789',
        username: 'Alice'
    }
}
```

## 6. パフォーマンス最適化

### 6.1 帯域幅最適化

- **適応的フレームレート**: ネットワーク状態に応じて5-30fps
- **差分エンコーディング**: 前フレームとの差分のみ送信
- **量子化**: Float32→Int16で50%削減
- **選択的送信**: 移動量閾値以下は送信スキップ

### 6.2 レイテンシ削減

- **ローカルキャッシング**: 直近N秒の感情データをキャッシュ
- **予測的レンダリング**: 線形補間で中間フレーム生成
- **P2Pフォールバック**: 同一LAN内では直接通信

### 6.3 スケーラビリティ

- **Ion-SFU水平スケーリング**: 複数ノードでの負荷分散
- **部屋単位のシャーディング**: 部屋IDベースでノード振り分け
- **解析サービスのキューイング**: NATS/Kafkaでバッファリング
- **CDNエッジキャッシング**: 静的アセットの配信最適化

## 7. エラーハンドリング

### 7.1 接続障害
- 自動再接続（指数バックオフ）
- セッション状態の永続化
- グレースフルデグレード（感情共有なしでも動作継続）

### 7.2 データ検証
- ランドマーク数の検証（468点）
- タイムスタンプの妥当性チェック
- スコア範囲の正規化（0.0-1.0）

### 7.3 フォールバック
- WebRTC不可→WebSocketフォールバック
- MediaPipe不可→手動感情入力UI
- 解析サービス不可→クライアントサイド簡易解析

## 8. モニタリング・可観測性

### 8.1 メトリクス

- **システムメトリクス**
  - CPU/Memory使用率
  - ネットワーク帯域幅
  - 同時接続数

- **アプリケーションメトリクス**
  - 平均笑度スコア/部屋
  - データチャネル遅延（P50/P95/P99）
  - フレーム処理レート
  - エラー率

### 8.2 ロギング

- 構造化ログ（JSON形式）
- トレースID付与でリクエスト追跡
- ログレベル: DEBUG/INFO/WARN/ERROR

### 8.3 ダッシュボード

- Grafana: リアルタイムメトリクス表示
- Prometheus: 時系列データ収集
- Jaeger: 分散トレーシング

## 9. 開発ロードマップ

### Phase 1: MVP (2週間)
- [ ] 基本的な部屋機能
- [ ] MediaPipeランドマーク検出
- [ ] 簡易笑度計算
- [ ] Ion-SFU統合

### Phase 2: 機能拡張 (3週間)
- [ ] 高度な感情解析（複数感情）
- [ ] リアルタイムグラフ表示
- [ ] 録画・再生機能
- [ ] パフォーマンス最適化

### Phase 3: プロダクション対応 (2週間)
- [ ] スケーラビリティ改善
- [ ] セキュリティ強化
- [ ] モニタリング実装
- [ ] ドキュメント整備

## 10. テスト戦略

### 10.1 単体テスト
- 感情スコア計算ロジック
- データエンコード/デコード
- API エンドポイント

### 10.2 統合テスト
- WebRTC接続確立
- 部屋参加/退出フロー
- データ配信パイプライン

### 10.3 負荷テスト
- 100人同時接続
- 10部屋並列動作
- 30fps連続送信24時間

### 10.4 E2Eテスト
- ユーザーストーリーベースのシナリオ
- 実機での動作確認
- ネットワーク障害シミュレーション

## 11. セキュリティ考慮事項

- プライバシー保護（顔画像は送信しない）
- GDPR/CCPA準拠のデータ管理
- ペネトレーションテスト実施
- セキュリティアップデートの自動化

## 12. 参考資料

- [Ion-SFU Documentation](https://github.com/ionorg/ion-sfu)
- [MediaPipe Face Landmarker Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker)
- [WebRTC DataChannel API](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)
- [Facial Action Coding System (FACS)](https://en.wikipedia.org/wiki/Facial_Action_Coding_System)