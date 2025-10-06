# 統合版 感情共有プラットフォーム設計書

## 📋 目次
- [システム概要](#システム概要)
- [技術アーキテクチャ](#技術アーキテクチャ)
- [実装方式の選択](#実装方式の選択)
- [システム要件](#システム要件)
- [データフロー設計](#データフロー設計)
- [API・プロトコル設計](#apiプロトコル設計)
- [実装詳細](#実装詳細)
- [Webアプリケーション詳細設計](#webアプリケーション詳細設計)
- [デプロイメント](#デプロイメント)
- [性能最適化](#性能最適化)
- [開発ロードマップ](#開発ロードマップ)

---

## 🎯 システム概要

### プロジェクト名
LoLup Lives Go - リアルタイム感情共有プラットフォーム

### コンセプト
全員が配信者かつ視聴者となる空間で、リアルタイムに感情状態を共有するプラットフォーム。
参加者全員の感情（笑度・リアクション）を可視化し、共感的な体験を創出。

### 主要機能
- **映像・音声配信**: WebRTC (Ion-SFU) による多人数同時配信
- **感情データ共有**: DataChannel経由での超低遅延共有
- **感情解析**: 2つの実装方式から選択可能
  - Option A: MediaPipe顔ランドマーク検出による高度な感情解析
  - Option B: スライダー操作によるシンプルな数値共有（0-100）

### 対象規模
| フェーズ | 同時接続数 | ルーム数 |
|---------|-----------|----------|
| MVP | 5-10人 | 1-2 |
| 本番 | 20-30人 | 5 |
| 将来 | 100人 | 10+ |

---

## 🏗 技術アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────────────┐
│              React Web App (TypeScript)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    React     │  │  MediaPipe   │  │   UI/UX      │  │
│  │ Components   │  │ Web Worker   │  │ (Tailwind)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │     WebRTC API + DataChannel Handler              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                             ↕
              WebSocket (Signaling) + WebRTC (Media/Data)
                             ↕
┌─────────────────────────────────────────────────────────┐
│                    Backend Services                       │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Signaling   │  │   Ion-SFU    │  │   Emotion    │  │
│  │   Server     │◀─▶│   Cluster    │◀─▶│  Analysis    │  │
│  │   (Go)       │  │   (Go)       │  │  (Go/Python) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                          ↕                               │
│                    ┌──────────┐                         │
│                    │  Redis   │                         │
│                    │  Cache   │                         │
│                    └──────────┘                         │
└─────────────────────────────────────────────────────────┘
```

### 技術スタック

#### フロントエンド (Web)
```yaml
Platform: Modern Web Browsers (Chrome, Firefox, Safari, Edge)
Language: TypeScript 5.0+
Framework: React 18.x
Build Tool: Vite 5.x
UI Framework: CSS Modules + Tailwind CSS
WebRTC: Native Browser API + Ion-SDK-JS
WebSocket: Native WebSocket API
Emotion Detection:
  - Option A: MediaPipe FaceLandmarker (Web Worker)
  - Option B: Manual Slider Input
Data Format: JSON / MessagePack
Testing: Jest + React Testing Library + Playwright
```

#### バックエンド
```yaml
Language: Go 1.21+
SFU: Ion-SFU (Pion WebRTC)
Signaling: Gorilla WebSocket
Cache: Redis 7+
Message Queue: NATS (optional)
API Gateway: Go Fiber / Gin
Container: Docker + Docker Compose
Proxy: Nginx
```

### ポート構成
```yaml
services:
  nginx:
    http: 80
    https: 443
  signaling:
    websocket: 8080
  ion-sfu:
    grpc: 5000
    websocket: 7000
    webrtc: 50000-50100/udp
  redis:
    default: 6379
  emotion-api:
    rest: 8081

# Docker内部ポートマッピング
docker_ports:
  signaling: "8080:8080"
  ion-sfu-grpc: "5000:5000"
  ion-sfu-ws: "7000:7000"
  ion-sfu-webrtc: "50000-50100:50000-50100/udp"
  redis: "127.0.0.1:6379:6379"
```

---

## 🔧 実装方式の選択

### MediaPipe実装方式（三段階対応）

#### Option A1: 標準MediaPipe方式（設計書準拠）

**特徴**
- **標準的な感情解析**: 468点の顔ランドマークから基本感情を検出
- **フロントエンド統合**: WebブラウザのMediaPipe API対応
- **軽量処理**: 基本的な表情分類

**データ構造**
```typescript
interface MediaPipeEmotionData {
  userId: string;
  timestamp: number;
  type: 'mediapipe';
  data: {
    landmarks: Float32Array;  // 468 * 3 = 1404 float values
    emotions: Record<string, number>;  // {"happiness": 0.85, "surprise": 0.12, "neutral": 0.03}
    confidence: number;  // 0.92
  };
}
```

#### Option A2: 高度MediaPipe方式（研究レベル実装済み）

**特徴**
- **研究レベルの笑い検出**: 5つの速度計算モデル搭載
- **高精度特徴量抽出**: 参照・密度・口の複合特徴量
- **リアルタイム状態管理**: バーンイン期間、循環バッファ
- **専用バイナリプロトコル**: 5776バイト最適化形式

**データ構造**
```typescript
interface AdvancedMediaPipeData {
  userId: string;
  timestamp: number;
  type: 'advanced-mediapipe';
  data: {
    rawBinaryData: Uint8Array;        // 5776バイト専用形式
    velocityModel: string;            // "simple"|"feedback"|"exponential"|"linear_damper"|"nonlinear_damper"
    featureWeights: FeatureWeights;   // 特徴量重み設定
    processingConfig: AdvancedConfig; // 高度パラメータ
  };
}

interface FeatureWeights {
  reference: number;  // 0.4 (参照特徴量重み)
  density: number;    // 0.4 (密度特徴量重み)
  mouth: number;      // 0.3 (口特徴量重み)
}

interface AdvancedConfig {
  burnInLength: number;           // 30 (バーンイン期間)
  maxHistorySize: number;         // 1000 (履歴サイズ)
  velocityExpansionRate: number;  // 1.0 (速度拡張率)
  degradationRate: number;        // 0.95 (減衰率)
  feedbackRate: number;           // 0.1 (フィードバック率)
  feedbackThreshold: number;      // 5.0 (フィードバック閾値)
}
```

**Go構造体（既存実装対応）**
```go
type AdvancedMediaPipeData struct {
    UserId           string                  `json:"userId"`
    Timestamp        int64                   `json:"timestamp"`
    Type             string                  `json:"type"`  // "advanced-mediapipe"
    RawBinaryData    []byte                  `json:"rawBinaryData"`    // 5776バイト
    VelocityModel    string                  `json:"velocityModel"`
    FeatureWeights   FeatureWeights          `json:"featureWeights"`
    ProcessingConfig AdvancedProcessingConfig `json:"processingConfig"`
}

// 既存のLandmarkData構造体をそのまま活用
type LandmarkData struct {
    Command                  float32     `json:"command"`
    Timestamp               float32     `json:"timestamp"`
    Landmarks               [][3]float32 `json:"landmarks"`     // 478個の3Dランドマーク
    ReferenceMovedThreshold  float32     `json:"reference_moved_threshold"`
    LaughterInsertThreshold  float32     `json:"laughter_insert_threshold"`
    LaughterSmallThreshold   float32     `json:"laughter_small_threshold"`
    LaughterMidThreshold     float32     `json:"laughter_mid_threshold"`
    LaughterBigThreshold     float32     `json:"laughter_big_threshold"`
}

// 既存のLandmarkProcessor構造体を活用
type LandmarkProcessor struct {
    Indexes                  LandmarkIndexes `json:"indexes"`
    Weights                  FeatureWeights  `json:"weights"`
    FeatureBaseline          float64         `json:"feature_baseline"`
    FeatureHistory           []float64       `json:"feature_history"`
    VelocityHistory          []float64       `json:"velocity_history"`
    IntensityHistory         []float64       `json:"intensity_history"`
    VelocityCalculationModel string          `json:"velocity_calculation_model"`
    // ... 既存の全フィールド
}
```

**レスポンス形式（高度版）**
```go
type AdvancedMediaPipeResponse struct {
    // 基本互換性
    Value      int     `json:"value"`      // 0-100正規化値
    Confidence float64 `json:"confidence"` // 信頼度

    // 高度詳細情報
    Intensity         float64           `json:"intensity"`          // 笑い強度
    Energy            float64           `json:"energy"`             // エネルギー(速度)
    Feature           float64           `json:"feature"`            // 特徴量
    LaughLevel        string            `json:"laughLevel"`         // neutral/small/mid/big
    LaughterStep      int               `json:"laughterStep"`       // 笑いステップ
    VelocityModel     string            `json:"velocityModel"`      // 使用モデル
    FeatureBaseline   float64           `json:"featureBaseline"`    // 特徴量ベースライン
    ProcessingMetrics ProcessingMetrics `json:"processingMetrics"`  // 処理詳細
}

type ProcessingMetrics struct {
    FeatureHistory   []float64 `json:"featureHistory"`   // 特徴量履歴
    VelocityHistory  []float64 `json:"velocityHistory"`  // 速度履歴
    IntensityHistory []float64 `json:"intensityHistory"` // 強度履歴
    ProcessingTime   float64   `json:"processingTime"`   // 処理時間(ms)
}
```

#### 必要リソース比較
| 方式 | CPU | メモリ | 帯域 | 精度 |
|------|-----|--------|------|------|
| 標準MediaPipe | 中負荷 | +500MB | 6KB/frame | 標準 |
| 高度MediaPipe | 高負荷 | +1GB | 5.8KB/frame | 研究レベル |

### Option B: シンプル数値方式

#### 特徴
- **軽量実装**: スライダー操作のみ
- **低負荷**: CPU/メモリ消費最小
- **即座導入可能**: 複雑な依存関係なし

#### データ構造（シンプル方式）
```typescript
interface SimpleEmotionData {
  userId: string;
  timestamp: number;
  type: 'simple';
  data: {
    value: number;  // 0-100の反応値
  };
}
```

対応するGo構造体：
```go
type SimpleEmotionData struct {
    UserId    string     `json:"userId"`
    Timestamp int64      `json:"timestamp"`
    Type      string     `json:"type"`  // "simple"
    Data      SimpleData `json:"data"`
}

type SimpleData struct {
    Value int `json:"value"`  // 0-100
}
```

#### 必要リソース
- CPU: 最小
- メモリ: 基本アプリのみ
- 帯域: <1KB/update @ 10Hz

### 推奨選択基準
| 要件 | MediaPipe方式 | シンプル方式 |
|------|--------------|-------------|
| MVPスピード | △ | ◎ |
| ユーザー体験 | ◎ | ○ |
| 実装難易度 | 高 | 低 |
| 拡張性 | ◎ | △ |
| サーバー負荷 | 高 | 低 |

**推奨**: MVPではシンプル方式で開始し、フェーズ2でMediaPipe統合

---

## 💻 システム要件

### サーバー要件
```yaml
環境: さくらVPS / AWS EC2 t3.medium相当
OS: Ubuntu 22.04 LTS
CPU: 2vCPU以上
メモリ:
  - シンプル方式: 2GB
  - MediaPipe方式: 4GB
ストレージ: SSD 50GB
ネットワーク: 100Mbps
月額費用: 1,600円〜5,000円
```

### クライアント要件
```yaml
ブラウザ:
  - Chrome: 88+ (推奨)
  - Firefox: 85+
  - Safari: 14+
  - Edge: 88+
OS: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
ハードウェア:
  - CPU: 2コア以上
  - メモリ: 4GB以上
  - カメラ: 内蔵/外付けWebカメラ
ネットワーク:
  - 最小: 1Mbps (360p)
  - 推奨: 2-3Mbps
  - HTTPS必須 (WebRTC制約)
```

### パフォーマンス目標
```yaml
遅延:
  リアクション: <100ms (P50)
  映像: <300ms (P95)

映像品質:
  解像度: 360p (640x360)
  フレームレート: 60fps (映像), 10-30fps (感情データ)
  ビットレート: 300-900kbps
  コーデック: H.264 / VP9

スケール:
  MVP: 10人 × 1ルーム
  本番: 30人 × 5ルーム
  最大: 100人総接続
```

---

## 🔄 データフロー設計

### 統一感情データ型
すべての感情データは以下の統一インターフェースに準拠：

```typescript
// TypeScript統一型定義
type EmotionData = SimpleEmotionData | MediaPipeEmotionData | CompressedLandmarkData;

interface BaseEmotionData {
  userId: string;
  timestamp: number;
  type: 'simple' | 'mediapipe' | 'compressed_landmarks';
}

// Delta-Delta圧縮ランドマークデータ
interface CompressedLandmarkData extends BaseEmotionData {
  type: 'compressed_landmarks';
  data: {
    compressedPayload: ArrayBuffer;  // バイナリ圧縮データ
    frameIndex: number;              // フレーム番号
    changeCount: number;             // 変化点数
    compressionRatio: number;        // 圧縮率（表示用）
  };
}

// データチャネル送信時の共通フォーマット
interface EmotionMessage {
  type: 'emotion';
  data: EmotionData;
}
```

```go
// Go統一型定義
type EmotionData struct {
    UserId    string      `json:"userId"`
    Timestamp int64       `json:"timestamp"`
    Type      string      `json:"type"`  // "simple" | "mediapipe" | "compressed_landmarks"
    Data      interface{} `json:"data"`  // SimpleData | MediaPipeData | CompressedLandmarkData
}

// Delta-Delta圧縮パケット構造体
type CompressedPacket struct {
    FrameIndex      int            `json:"frameIndex"`
    Timestamp       int64          `json:"timestamp"`
    ChangeCount     int            `json:"changeCount"`
    Changes         []IndexedChange `json:"changes"`
    CompressedData  []byte         `json:"-"`           // バイナリデータ（JSON除外）
}

type IndexedChange struct {
    Index uint16  `binary:"index"`    // ランドマークインデックス (0-1403)
    Value float32 `binary:"value"`    // Delta-Delta値
}

type CompressedLandmarkData struct {
    CompressedPayload []byte  `json:"compressedPayload"`
    FrameIndex       int     `json:"frameIndex"`
    ChangeCount      int     `json:"changeCount"`
    CompressionRatio float64 `json:"compressionRatio"`
}

// データチャネル受信時の共通構造体
type EmotionMessage struct {
    Type string      `json:"type"`  // "emotion"
    Data EmotionData `json:"data"`
}
```

### 1. 接続確立フロー
```mermaid
sequenceDiagram
    Client->>Signaling: WebSocket接続
    Signaling->>Client: 認証・セッション確立
    Client->>Signaling: ルーム参加リクエスト
    Signaling->>Ion-SFU: セッション作成
    Ion-SFU->>Signaling: Offer SDP
    Signaling->>Client: Offer + ICE Servers
    Client->>Signaling: Answer SDP
    Signaling->>Ion-SFU: Answer設定
    Client<->Ion-SFU: ICE Negotiation
    Client<->Ion-SFU: DTLS Handshake
    Client<->Ion-SFU: Media/Data Streams確立
```

### 2. 感情データ送信フロー

#### Option A1: Standard MediaPipe方式
1. **顔検出** (30fps) → **ランドマーク抽出** (468点)
2. **特徴量計算**: 口角、頬、目元の動き解析
3. **感情スコア算出**: Action Units → 感情分類
4. **エンコード**: MessagePack/ProtoBuf
5. **送信**: DataChannel (10-15fps)

#### Option A2: Advanced MediaPipe方式（現状実装）
1. **顔検出** (30fps) → **ランドマーク抽出** (468点 × 3次元 = 1404値)
2. **Binary Protocol受信**: 5776バイトフォーマット
3. **5モデル速度計算**: Simple/NonlinearDamper/LinearDamper/Exponential/Feedback
4. **高度特徴量抽出**: Reference/Density/Mouth解析
5. **笑度計算**: 研究レベルアルゴリズム（facial_landmarks_algorithm_report.md準拠）
6. **送信**: 統一フォーマットへ変換後DataChannel送信

#### Option A3: 圧縮ランドマーク方式（Delta-Delta圧縮）
1. **顔検出** (30fps) → **ランドマーク抽出** (468点 × 3次元 = 1404値)
2. **Delta-Delta圧縮**: 前々フレームとの2次差分計算
3. **スパース化**: 閾値(0.001)を超えた変化点のみ抽出
4. **バイナリパッキング**: インデックス(2B) + 値(4B) × 変化数
5. **送信**: DataChannel経由で圧縮バイナリ送信（12B + 6B×変化数）
6. **受信側展開**: Delta-Deltaから元ランドマーク復元
7. **感情解析**: 復元されたランドマークで感情スコア計算

#### Option B: シンプル方式
1. **スライダー操作** → **値取得** (0-100)
2. **JSON生成**: `{v: value, t: timestamp}`
3. **送信**: DataChannel (100ms間隔)

### 3. 配信・同期フロー
```
Producer → Ion-SFU → Room Broadcast → All Consumers
         ↓
    Redis Cache (状態保持)
         ↓
    Late Joiner Sync
```

### 4. データ形式変換例

#### フロントエンド送信例
```typescript
// シンプル方式
const simpleData: SimpleEmotionData = {
  userId: "user123",
  timestamp: Date.now(),
  type: "simple",
  data: { value: 75 }
};

// MediaPipe方式
const mediaPipeData: MediaPipeEmotionData = {
  userId: "user123",
  timestamp: Date.now(),
  type: "mediapipe",
  data: {
    landmarks: new Float32Array([...]),
    emotions: { happiness: 0.85, surprise: 0.12 },
    confidence: 0.92
  }
};

// 統一送信フォーマット
const message: EmotionMessage = {
  type: "emotion",
  data: simpleData  // または mediaPipeData
};
```

#### バックエンド受信・処理例
```go
func handleEmotionMessage(msg []byte) error {
    var emotionMsg EmotionMessage
    if err := json.Unmarshal(msg, &emotionMsg); err != nil {
        return err
    }

    switch emotionMsg.Data.Type {
    case "simple":
        var simpleData SimpleData
        if err := mapstructure.Decode(emotionMsg.Data.Data, &simpleData); err != nil {
            return err
        }
        return processSimpleEmotion(emotionMsg.Data.UserId, simpleData)

    case "mediapipe":
        var mediaPipeData MediaPipeData
        if err := mapstructure.Decode(emotionMsg.Data.Data, &mediaPipeData); err != nil {
            return err
        }
        return processMediaPipeEmotion(emotionMsg.Data.UserId, mediaPipeData)

    case "advanced_mediapipe":
        var advancedData AdvancedMediaPipeData
        if err := mapstructure.Decode(emotionMsg.Data.Data, &advancedData); err != nil {
            return err
        }
        return processAdvancedMediaPipeEmotion(emotionMsg.Data.UserId, advancedData)

    default:
        return fmt.Errorf("unknown emotion data type: %s", emotionMsg.Data.Type)
    }
}
```

---

## 📡 API・プロトコル設計

### REST API エンドポイント

#### 認証
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user123",
  "deviceId": "ios-device-uuid"
}

Response: 200 OK
{
  "token": "jwt.token.here",
  "userId": "uuid",
  "expiresIn": 3600
}
```

#### ルーム管理
```http
# ルーム一覧取得
GET /api/rooms
Authorization: Bearer {token}

Response: 200 OK
[{
  "roomId": "room-001",
  "name": "メインルーム",
  "participants": 8,
  "maxParticipants": 30
}]

# ルーム参加
POST /api/rooms/{roomId}/join
Authorization: Bearer {token}

Response: 200 OK
{
  "sessionId": "sess-uuid",
  "iceServers": [{
    "urls": ["stun:stun.l.google.com:19302"]
  }],
  "offer": {
    "type": "offer",
    "sdp": "..."
  }
}
```

#### 高度感情解析 (Advanced MediaPipe)
```http
# バイナリランドマークデータ処理
POST /api/emotion/advanced-process
Authorization: Bearer {token}
Content-Type: application/octet-stream
Content-Length: 5776

[5776バイトのバイナリデータ: 468ランドマーク × 3次元 × 4バイト(float32) + メタデータ]

Response: 200 OK
{
  "models": {
    "simple": { "laughValue": 0.75, "confidence": 0.92 },
    "nonlinear_damper": { "laughValue": 0.82, "confidence": 0.94 },
    "linear_damper": { "laughValue": 0.78, "confidence": 0.91 },
    "exponential": { "laughValue": 0.84, "confidence": 0.96 },
    "feedback": { "laughValue": 0.80, "confidence": 0.93 }
  },
  "features": {
    "reference": { "mouth": 0.65, "cheek": 0.70, "eye": 0.58 },
    "density": { "total": 0.72, "weighted": 0.68 },
    "mouth": { "corners": 0.85, "shape": 0.73 }
  },
  "unified": {
    "value": 80,  // 0-100スケール
    "confidence": 0.94,
    "timestamp": 1704067200000
  }
}

# ヘルスチェック
GET /api/emotion/advanced-health
Response: 200 OK
{
  "status": "healthy",
  "models": ["simple", "nonlinear_damper", "linear_damper", "exponential", "feedback"],
  "performance": {
    "avgProcessingTime": "15ms",
    "queueSize": 0,
    "processedCount": 15420
  }
}
```

### WebSocket メッセージ

#### クライアント → サーバー
```javascript
// ルーム参加
{
  type: 'join',
  room: 'room-001'
}

// シグナリング
{
  type: 'offer' | 'answer' | 'candidate',
  to: 'peer-id',
  data: {...}
}

// 感情データ (フォールバック用)
{
  type: 'emotion.update',
  data: {
    value: 75,  // or landmarks array
    timestamp: 1704067200000
  }
}
```

#### サーバー → クライアント
```javascript
// ピア参加通知
{
  type: 'peer.joined',
  peerId: 'user-456',
  username: 'Alice'
}

// 感情ブロードキャスト
{
  type: 'emotion.broadcast',
  from: 'user-456',
  data: {
    value: 85,
    emotions: {...}  // MediaPipe方式の場合
  }
}
```

### DataChannel 設定
```javascript
// 感情データ用チャネル
{
  label: 'emotion-data',
  ordered: false,
  maxRetransmits: 0,
  maxPacketLifeTime: 100  // 100ms
}

// 制御用チャネル
{
  label: 'control',
  ordered: true,
  reliable: true
}
```

---

## 💼 実装詳細

### バックエンド実装 (Go)

#### シグナリングサーバー構造
```go
// signaling/main.go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "sync"
    "time"

    "github.com/google/uuid"
    "github.com/gorilla/websocket"
    "github.com/go-redis/redis/v8"
)

type Hub struct {
    rooms      map[string]*Room
    register   chan *Client
    unregister chan *Client
    broadcast  chan Message
    mu         sync.RWMutex
}

type Room struct {
    ID           string
    Clients      map[string]*Client
    EmotionCache map[string]EmotionData
    mu           sync.RWMutex
}

type Client struct {
    ID       string
    Username string
    Conn     *websocket.Conn
    Room     *Room
    Send     chan []byte
    Emotion  EmotionData
}

type EmotionData struct {
    Value      int                    `json:"value,omitempty"`
    Landmarks  []float32             `json:"landmarks,omitempty"`
    Emotions   map[string]float32    `json:"emotions,omitempty"`
    Confidence float32               `json:"confidence"`
    Timestamp  int64                 `json:"timestamp"`
}

type Message struct {
    Type      string          `json:"type"`
    Room      string          `json:"room,omitempty"`
    From      string          `json:"from,omitempty"`
    To        string          `json:"to,omitempty"`
    Data      json.RawMessage `json:"data,omitempty"`
    Timestamp int64          `json:"timestamp"`
}
```

### Webクライアント実装概要

Webクライアントは React + TypeScript で実装され、以下の主要な特徴を持ちます：

#### 主要コンポーネント
- **React SPA**: ユーザー認証、ルーム管理、ビデオ通話UI
- **Web Worker**: MediaPipe処理の並列実行
- **WebRTC管理**: ピア接続とデータチャネルのハンドリング
- **状態管理**: Context API + useReducer によるリアクティブな状態管理

#### 感情検出の実装方式
```typescript
// Option A1: Standard MediaPipe FaceLandmarker (Web Worker)
class MediaPipeDetector {
  private worker: Worker;

  async processFrame(imageBitmap: ImageBitmap) {
    this.worker.postMessage({ type: 'process', data: { imageBitmap } });
  }
}

// Option A2: Advanced MediaPipe Integration (Backend連携)
class AdvancedMediaPipeDetector {
  private worker: Worker;
  private binaryEncoder: LandmarkBinaryEncoder;

  async processFrame(imageBitmap: ImageBitmap) {
    // 468ランドマーク × 3次元 = 1404値をバイナリエンコード
    const landmarks = await this.extractLandmarks(imageBitmap);
    const binaryData = this.binaryEncoder.encode(landmarks); // 5776バイト

    // バックエンドの高度解析エンジンへ送信
    this.sendToAdvancedProcessor(binaryData);
  }

  private async sendToAdvancedProcessor(binaryData: ArrayBuffer) {
    // 既存実装のLandmarkProcessorと連携
    const response = await fetch('/api/emotion/advanced-process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: binaryData
    });

    const result = await response.json();
    // 5つの速度モデル結果を統一フォーマットに変換
    this.sendReaction(this.convertToUnifiedFormat(result));
  }
}

// Option B: Manual Slider Input
class SimpleSliderDetector {
  onValueChange(value: number) {
    // 0-100の数値を直接送信
    this.sendReaction({ value, timestamp: Date.now() });
  }
}
```

詳細な実装については、次章の「Webアプリケーション詳細設計」を参照してください。

---

## 🔌 Adapter Layer設計（統合アーキテクチャ）

### 概要
既存の高度MediaPipe実装（signaling/main.go）と統一アーキテクチャを橋渡しするアダプターレイヤーを設計します。

### アダプターコンポーネント構成
```go
// adapters/mediapipe_adapter.go
package adapters

import (
    "encoding/json"
    "fmt"
    "context"

    "signaling/internal/processor" // 既存のLandmarkProcessor
)

// 統一フォーマットアダプター
type UnifiedEmotionAdapter struct {
    processor *processor.LandmarkProcessor
}

func NewUnifiedEmotionAdapter() *UnifiedEmotionAdapter {
    return &UnifiedEmotionAdapter{
        processor: processor.NewLandmarkProcessor(),
    }
}

// 既存の5576バイトバイナリから統一フォーマットへ変換
func (a *UnifiedEmotionAdapter) ProcessBinaryLandmarks(binaryData []byte) (*UnifiedEmotionResponse, error) {
    // 既存実装のLandmarkProcessorを活用
    features, err := a.processor.ProcessLandmarkData(binaryData)
    if err != nil {
        return nil, err
    }

    // 5つのモデル結果を統合
    unified := a.consolidateModels(features.Models)

    return &UnifiedEmotionResponse{
        Models: ModelResults{
            Simple:          ModelResult{LaughValue: features.Models.Simple, Confidence: features.Confidence},
            NonlinearDamper: ModelResult{LaughValue: features.Models.NonlinearDamper, Confidence: features.Confidence},
            LinearDamper:    ModelResult{LaughValue: features.Models.LinearDamper, Confidence: features.Confidence},
            Exponential:     ModelResult{LaughValue: features.Models.Exponential, Confidence: features.Confidence},
            Feedback:        ModelResult{LaughValue: features.Models.Feedback, Confidence: features.Confidence},
        },
        Features: FeatureResults{
            Reference: features.Reference,
            Density:   features.Density,
            Mouth:     features.Mouth,
        },
        Unified: UnifiedResult{
            Value:      int(unified * 100), // 0-100スケール
            Confidence: features.Confidence,
            Timestamp:  time.Now().UnixMilli(),
        },
    }, nil
}

// 5つのモデル結果を統合（重み付き平均）
func (a *UnifiedEmotionAdapter) consolidateModels(models processor.ModelResults) float64 {
    weights := map[string]float64{
        "simple":           0.15,
        "nonlinear_damper": 0.25,
        "linear_damper":    0.20,
        "exponential":      0.25,
        "feedback":         0.15,
    }

    weighted := models.Simple*weights["simple"] +
                models.NonlinearDamper*weights["nonlinear_damper"] +
                models.LinearDamper*weights["linear_damper"] +
                models.Exponential*weights["exponential"] +
                models.Feedback*weights["feedback"]

    return weighted
}

// 統一フォーマットから既存のDataChannel形式へ変換
func (a *UnifiedEmotionAdapter) ToDataChannelFormat(unified *UnifiedEmotionResponse) *DataChannelMessage {
    return &DataChannelMessage{
        Type: "emotion",
        Data: EmotionData{
            UserId:    "", // 呼び出し側で設定
            Timestamp: unified.Unified.Timestamp,
            Type:      "advanced_mediapipe",
            Data: AdvancedMediaPipeData{
                Models:     unified.Models,
                Features:   unified.Features,
                Unified:    unified.Unified,
            },
        },
    }
}
```

### HTTP API統合
```go
// handlers/advanced_emotion.go
package handlers

import (
    "io"
    "net/http"
    "github.com/gin-gonic/gin"

    "signaling/adapters"
)

type AdvancedEmotionHandler struct {
    adapter *adapters.UnifiedEmotionAdapter
}

func NewAdvancedEmotionHandler() *AdvancedEmotionHandler {
    return &AdvancedEmotionHandler{
        adapter: adapters.NewUnifiedEmotionAdapter(),
    }
}

// POST /api/emotion/advanced-process
func (h *AdvancedEmotionHandler) ProcessAdvancedLandmarks(c *gin.Context) {
    // 5776バイトのバイナリデータを読み取り
    binaryData, err := io.ReadAll(c.Request.Body)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read binary data"})
        return
    }

    if len(binaryData) != 5776 {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": fmt.Sprintf("Expected 5776 bytes, got %d", len(binaryData))
        })
        return
    }

    // 既存のLandmarkProcessorで処理
    result, err := h.adapter.ProcessBinaryLandmarks(binaryData)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, result)
}

// GET /api/emotion/advanced-health
func (h *AdvancedEmotionHandler) HealthCheck(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "status": "healthy",
        "models": []string{"simple", "nonlinear_damper", "linear_damper", "exponential", "feedback"},
        "performance": gin.H{
            "avgProcessingTime": "15ms",
            "queueSize":        0,
            "processedCount":   h.adapter.GetProcessedCount(),
        },
    })
}
```

### ルーティング統合
```go
// main.go への追加
func setupAdvancedRoutes(r *gin.Engine) {
    handler := handlers.NewAdvancedEmotionHandler()

    api := r.Group("/api/emotion")
    {
        api.POST("/advanced-process", handler.ProcessAdvancedLandmarks)
        api.GET("/advanced-health", handler.HealthCheck)
    }
}

func main() {
    r := gin.Default()

    // 既存のルート
    setupWebSocketRoutes(r)
    setupRoomRoutes(r)

    // 新しい高度感情解析ルート
    setupAdvancedRoutes(r)

    r.Run(":8080")
}
```

### 実装ポイント
1. **既存コード保持**: `signaling/main.go`の既存実装は変更せず、Adapterパターンで活用
2. **統一インターフェース**: 新しいAPI経由で既存の高度解析エンジンにアクセス
3. **型安全性**: Go Structsで統一フォーマットを定義
4. **パフォーマンス**: 既存の最適化されたアルゴリズムをそのまま活用
5. **拡張性**: 将来的な新しいモデル追加に対応可能

### 圧縮統合設計

#### 既存実装との統合
```go
// 既存のLandmarkProcessorにCompression機能を追加
func (h *Hub) handleCompressedLandmarks(client *Client, msg []byte) error {
    // 1. Delta-Delta展開
    decompressor := compression.NewLandmarkDecompressor()
    landmarks, err := decompressor.Decompress(msg)
    if err != nil {
        return err
    }

    // 2. 既存の高度解析エンジンで処理
    processor := NewLandmarkProcessor()
    features, err := processor.ProcessLandmarks(landmarks)
    if err != nil {
        return err
    }

    // 3. 統一フォーマットで配信
    emotionData := EmotionData{
        UserId:    client.ID,
        Timestamp: time.Now().UnixMilli(),
        Type:     "advanced_mediapipe",
        Data: AdvancedMediaPipeData{
            Models:     features.Models,
            Features:   features.Features,
            Unified:    features.Unified,
        },
    }

    // 4. 他の参加者に配信
    return h.broadcastToRoom(client.Room, emotionData)
}
```

#### WebRTC DataChannel統合
```typescript
// フロントエンド: 圧縮送信の実装
class EmotionDataChannelManager {
    private compressor = new LandmarkCompressor();
    private compressionEnabled = true;

    sendLandmarks(landmarks: Float32Array, dataChannel: RTCDataChannel) {
        if (this.compressionEnabled && landmarks.length === 1404) {
            // Delta-Delta圧縮送信
            const compressed = this.compressor.compress(landmarks);
            this.sendCompressedData(dataChannel, compressed);
        } else {
            // 従来のJSON送信（フォールバック）
            const emotionData: MediaPipeEmotionData = {
                userId: this.userId,
                timestamp: Date.now(),
                type: 'mediapipe',
                data: { landmarks: Array.from(landmarks), emotions: {}, confidence: 0.9 }
            };
            dataChannel.send(JSON.stringify({ type: 'emotion', data: emotionData }));
        }
    }

    private sendCompressedData(dataChannel: RTCDataChannel, compressed: Uint8Array) {
        // バイナリ+メタデータの混合送信
        const header = new Uint8Array([0xFF, 0xFE]); // 圧縮データマーカー
        const combined = new Uint8Array(header.length + compressed.length);
        combined.set(header);
        combined.set(compressed, header.length);

        dataChannel.send(combined);

        console.log(`Compression: ${1404*4}→${compressed.length} bytes (${Math.round(100-compressed.length/(1404*4)*100)}% saved)`);
    }

    handleIncomingData(data: ArrayBuffer | string) {
        if (data instanceof ArrayBuffer) {
            const bytes = new Uint8Array(data);
            // 圧縮データかチェック
            if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
                this.handleCompressedLandmarks(bytes.slice(2));
            } else {
                this.handleLegacyBinary(bytes);
            }
        } else {
            // JSON データ（従来形式）
            this.handleJSONEmotion(data);
        }
    }
}
```

---

## 🌐 Webアプリケーション詳細設計

### プロジェクト構造

```
src/
├── components/           # UIコンポーネント
│   ├── common/          # 共通コンポーネント
│   │   ├── Modal/
│   │   ├── Button/
│   │   └── LoadingSpinner/
│   ├── lobby/           # ロビー画面
│   │   ├── UserNameModal.tsx
│   │   ├── RoomList.tsx
│   │   └── RoomCard.tsx
│   └── session/         # セッション画面
│       ├── LocalVideo.tsx
│       ├── RemoteVideoGrid.tsx
│       ├── ReactionIndicator.tsx
│       └── ControlPanel.tsx
├── contexts/            # React Context
│   ├── WebRTCContext.tsx
│   ├── ReactionContext.tsx
│   ├── MediaContext.tsx
│   └── AuthContext.tsx
├── hooks/              # カスタムフック
│   ├── useWebRTC.ts
│   ├── useMediaPipe.ts
│   ├── useSignaling.ts
│   └── useReactions.ts
├── services/           # サービス層
│   ├── webrtc/
│   │   ├── PeerConnection.ts
│   │   ├── DataChannel.ts
│   │   └── IceCandidate.ts
│   ├── signaling/
│   │   ├── WebSocketClient.ts
│   │   └── MessageHandler.ts
│   └── mediapipe/
│       ├── FaceLandmarker.ts
│       └── ReactionProcessor.ts
├── workers/            # Web Workers
│   └── mediapipe.worker.ts
├── types/              # TypeScript型定義
│   ├── webrtc.d.ts
│   ├── signaling.d.ts
│   └── reaction.d.ts
├── utils/              # ユーティリティ
│   ├── logger.ts
│   ├── storage.ts
│   └── validators.ts
└── config/             # 設定
    ├── constants.ts
    └── environment.ts
```

### 主要コンポーネント設計

#### アプリケーション構造
```tsx
<App>
  <ErrorBoundary>
    <AuthProvider>
      <WebRTCProvider>
        <ReactionProvider>
          <MediaProvider>
            <Router>
              <Route path="/" element={<LobbyView />} />
              <Route path="/room/:roomId" element={<SessionView />} />
            </Router>
          </MediaProvider>
        </ReactionProvider>
      </WebRTCProvider>
    </AuthProvider>
  </ErrorBoundary>
</App>
```

#### 状態管理設計

##### WebRTCContext
```typescript
interface WebRTCState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed';
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  dataChannels: Map<string, RTCDataChannel>;
  peers: Map<string, RTCPeerConnection>;
}

type WebRTCAction =
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'ADD_PEER'; payload: { peerId: string; connection: RTCPeerConnection } }
  | { type: 'REMOVE_PEER'; payload: string }
  | { type: 'ADD_STREAM'; payload: { peerId: string; stream: MediaStream } }
  | { type: 'RESET' };
```

##### ReactionContext
```typescript
interface ReactionData {
  value: number;        // 0-100のリアクション強度
  timestamp: number;    // Unix timestamp
  peerId: string;
  landmarks?: Float32Array;
}

interface ReactionState {
  localReaction: ReactionData | null;
  remoteReactions: Map<string, ReactionData>;
  history: ReactionData[];  // 最新100件を保持
}
```

### MediaPipe Web Worker実装

#### Worker メインプロセス
```typescript
// workers/mediapipe.worker.ts
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker: FaceLandmarker;
let isProcessing = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      await initializeFaceLandmarker();
      break;
    case 'process':
      await processFrame(data.imageBitmap);
      break;
    case 'stop':
      cleanup();
      break;
  }
};

async function initializeFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'GPU'
    },
    outputFaceBlendshapes: true,
    runningMode: 'VIDEO',
    numFaces: 1
  });

  self.postMessage({ type: 'initialized' });
}

async function processFrame(imageBitmap: ImageBitmap) {
  if (isProcessing) return;

  isProcessing = true;
  const results = await faceLandmarker.detectForVideo(imageBitmap, performance.now());

  if (results.faceLandmarks && results.faceLandmarks.length > 0) {
    const reaction = calculateReaction(results);
    self.postMessage({
      type: 'landmarks',
      data: {
        landmarks: results.faceLandmarks[0],
        reaction: reaction,
        timestamp: Date.now()
      }
    });
  }

  isProcessing = false;
}

function calculateReaction(results: any): number {
  const blendshapes = results.faceBlendshapes?.[0]?.categories || [];

  const smile = blendshapes.find((s: any) => s.categoryName === 'mouthSmileLeft')?.score || 0;
  const eyeOpen = blendshapes.find((s: any) => s.categoryName === 'eyeBlinkLeft')?.score || 0;

  // 簡単な表情スコア計算
  return Math.min(100, Math.max(0, (smile * 100 + (1 - eyeOpen) * 50)));
}
```

#### メインスレッドとの連携
```typescript
// hooks/useMediaPipe.ts
export function useMediaPipe(videoRef: RefObject<HTMLVideoElement>) {
  const workerRef = useRef<Worker>();
  const [reaction, setReaction] = useState<number>(0);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/mediapipe.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'landmarks') {
        setReaction(e.data.data.reaction);
        // データチャネルで送信
        sendReactionData(e.data.data);
      }
    };

    workerRef.current.postMessage({ type: 'init' });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // フレーム処理ループ
  useEffect(() => {
    if (!videoRef.current) return;

    const processVideo = async () => {
      if (videoRef.current && workerRef.current) {
        const bitmap = await createImageBitmap(videoRef.current);
        workerRef.current.postMessage(
          { type: 'process', data: { imageBitmap: bitmap } },
          [bitmap]
        );
      }
      requestAnimationFrame(processVideo);
    };

    processVideo();
  }, [videoRef]);

  return { reaction };
}
```

### WebRTC 接続管理

#### PeerConnection管理
```typescript
// services/webrtc/PeerConnection.ts
export class PeerConnectionManager {
  private peerConnections = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();

  async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };

    const pc = new RTCPeerConnection(config);

    // データチャネル作成
    const dataChannel = pc.createDataChannel('reactions', {
      ordered: true,
      maxRetransmits: 3
    });

    dataChannel.onopen = () => {
      console.log('DataChannel opened for peer:', peerId);
    };

    dataChannel.onmessage = (event) => {
      this.handleReactionMessage(peerId, event.data);
    };

    this.peerConnections.set(peerId, pc);
    this.dataChannels.set(peerId, dataChannel);

    return pc;
  }

  sendReaction(peerId: string, reaction: ReactionData) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(reaction));
    }
  }

  broadcastReaction(reaction: ReactionData) {
    this.dataChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify(reaction));
      }
    });
  }

  private handleReactionMessage(peerId: string, data: string) {
    try {
      const reaction: ReactionData = JSON.parse(data);
      // ReactionContextに送信
      this.onReactionReceived?.(peerId, reaction);
    } catch (error) {
      console.error('Failed to parse reaction data:', error);
    }
  }
}
```

### エラーハンドリング

#### 接続エラー処理
```typescript
class ConnectionManager {
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000;

  async connect(): Promise<void> {
    try {
      await this.establishConnection();
      this.retryCount = 0;
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);

        console.log(`Retry ${this.retryCount}/${this.maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.connect();
      } else {
        throw new Error('Maximum retry attempts reached');
      }
    }
  }

  handleConnectionStateChange(state: RTCPeerConnectionState) {
    switch (state) {
      case 'disconnected':
        this.startReconnectionTimer();
        break;
      case 'failed':
        this.attemptFullReconnection();
        break;
      case 'connected':
        this.clearReconnectionTimer();
        break;
    }
  }
}
```

#### エラー境界実装
```tsx
class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログ送信
    logger.error('React Error Boundary', { error, errorInfo });

    // ユーザー通知
    if (error.name === 'MediaAccessError') {
      toast.error('カメラへのアクセスが拒否されました');
    } else if (error.name === 'WebSocketError') {
      toast.error('サーバーとの接続が切断されました');
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### パフォーマンス最適化

#### React最適化
```typescript
// メモ化によるレンダリング最適化
const VideoGrid = memo(({ streams }: Props) => {
  return (
    <div className="grid">
      {Array.from(streams.entries()).map(([peerId, stream]) => (
        <VideoTile key={peerId} stream={stream} />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.streams.size === nextProps.streams.size;
});

// useMemoによる計算結果のキャッシュ
const averageReaction = useMemo(() => {
  const values = Array.from(reactions.values()).map(r => r.value);
  return values.reduce((a, b) => a + b, 0) / values.length;
}, [reactions]);
```

#### バンドル最適化
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'mediapipe': ['@mediapipe/tasks-vision'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'webrtc': ['./src/services/webrtc'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@mediapipe/tasks-vision']
  }
});
```

### 開発環境設定

#### 環境設定ファイル

##### 開発環境設定
```bash
# .env.development
VITE_APP_NAME=ReactionSharingPlatform
VITE_API_BASE_URL=http://192.168.3.39:8080
VITE_SIGNALING_URL=ws://192.168.3.39:8080/ws
VITE_ION_SFU_URL=http://192.168.3.39:7000
VITE_STUN_SERVERS=stun:stun.l.google.com:19302
VITE_LOG_LEVEL=debug
VITE_MAX_PARTICIPANTS=30
VITE_VIDEO_RESOLUTION=360p
VITE_TARGET_FPS=30
```

##### 本番環境設定
```bash
# .env.production
VITE_APP_NAME=ReactionSharingPlatform
VITE_API_BASE_URL=https://your-domain.com
VITE_SIGNALING_URL=wss://your-domain.com/ws
VITE_ION_SFU_URL=https://your-domain.com/sfu
VITE_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
VITE_LOG_LEVEL=warn
VITE_MAX_PARTICIPANTS=30
VITE_VIDEO_RESOLUTION=360p
VITE_TARGET_FPS=30
```

##### 設定型定義（TypeScript）
```typescript
// src/config/environment.ts
interface AppConfig {
  appName: string;
  apiBaseUrl: string;
  signalingUrl: string;
  ionSfuUrl: string;
  stunServers: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxParticipants: number;
  videoResolution: string;
  targetFps: number;
}

export const config: AppConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'ReactionSharingPlatform',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  signalingUrl: import.meta.env.VITE_SIGNALING_URL || 'ws://localhost:8080/ws',
  ionSfuUrl: import.meta.env.VITE_ION_SFU_URL || 'http://localhost:7000',
  stunServers: (import.meta.env.VITE_STUN_SERVERS || 'stun:stun.l.google.com:19302').split(','),
  logLevel: import.meta.env.VITE_LOG_LEVEL as AppConfig['logLevel'] || 'info',
  maxParticipants: parseInt(import.meta.env.VITE_MAX_PARTICIPANTS || '30'),
  videoResolution: import.meta.env.VITE_VIDEO_RESOLUTION || '360p',
  targetFps: parseInt(import.meta.env.VITE_TARGET_FPS || '30'),
};
```

#### Vite設定ファイル
```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // 開発サーバー設定
    server: {
      host: '0.0.0.0',
      port: 5173,
      https: {
        key: fs.readFileSync('./certs/key.pem'),
        cert: fs.readFileSync('./certs/cert.pem'),
      },
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // ビルド設定
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'mediapipe': ['@mediapipe/tasks-vision'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'webrtc': ['./src/services/webrtc'],
          }
        }
      }
    },

    // 最適化設定
    optimizeDeps: {
      include: ['@mediapipe/tasks-vision']
    },

    // パス解決
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@services': path.resolve(__dirname, './src/services'),
        '@types': path.resolve(__dirname, './src/types'),
        '@config': path.resolve(__dirname, './src/config'),
      }
    },

    // 環境変数定義
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
```

##### バックエンド設定（Go）
```go
// configs/config.go
package configs

import (
    "os"
    "strconv"
    "strings"
)

type Config struct {
    // サーバー設定
    SignalingPort    string   `json:"signaling_port"`
    IonSFUGRPCPort  string   `json:"ion_sfu_grpc_port"`
    IonSFUWSPort    string   `json:"ion_sfu_ws_port"`

    // Redis設定
    RedisAddr        string   `json:"redis_addr"`
    RedisPassword    string   `json:"redis_password"`
    RedisDB          int      `json:"redis_db"`

    // WebRTC設定
    STUNServers      []string `json:"stun_servers"`
    WebRTCPortRange  string   `json:"webrtc_port_range"`

    // アプリケーション設定
    MaxParticipants  int      `json:"max_participants"`
    LogLevel         string   `json:"log_level"`

    // セキュリティ設定
    JWTSecret        string   `json:"jwt_secret"`
    AllowedOrigins   []string `json:"allowed_origins"`
}

func LoadConfig() *Config {
    return &Config{
        SignalingPort:   getEnv("SIGNALING_PORT", "8080"),
        IonSFUGRPCPort: getEnv("ION_SFU_GRPC_PORT", "5000"),
        IonSFUWSPort:   getEnv("ION_SFU_WS_PORT", "7000"),

        RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
        RedisPassword: getEnv("REDIS_PASSWORD", ""),
        RedisDB:       getEnvAsInt("REDIS_DB", 0),

        STUNServers:     strings.Split(getEnv("STUN_SERVERS", "stun:stun.l.google.com:19302"), ","),
        WebRTCPortRange: getEnv("WEBRTC_PORT_RANGE", "50000-50100"),

        MaxParticipants: getEnvAsInt("MAX_PARTICIPANTS", 30),
        LogLevel:        getEnv("LOG_LEVEL", "info"),

        JWTSecret:      getEnv("JWT_SECRET", "your-secret-key"),
        AllowedOrigins: strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:5173,https://localhost:5173"), ","),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intValue, err := strconv.Atoi(value); err == nil {
            return intValue
        }
    }
    return defaultValue
}
```

---

## 🚀 デプロイメント

### Docker Compose設定

#### 開発環境
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  ion-sfu:
    image: pionwebrtc/ion-sfu:latest
    container_name: ion-sfu-dev
    restart: unless-stopped
    ports:
      - "${ION_SFU_GRPC_PORT:-5000}:5000"     # gRPC API
      - "${ION_SFU_WS_PORT:-7000}:7000"       # WebSocket API
      - "${WEBRTC_PORT_RANGE:-50000-50100}:50000-50100/udp"  # WebRTC Media
    volumes:
      - ./configs/ion-sfu.dev.toml:/configs/sfu.toml
    environment:
      - CONFIG_FILE=/configs/sfu.toml
    networks:
      - emotion-net

  signaling:
    build:
      context: ./signaling
      dockerfile: Dockerfile.dev
    container_name: signaling-dev
    restart: unless-stopped
    ports:
      - "${SIGNALING_PORT:-8080}:8080"
    depends_on:
      - redis
      - ion-sfu
    environment:
      - REDIS_ADDR=redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
      - REDIS_DB=${REDIS_DB:-0}
      - ION_SFU_GRPC_PORT=5000
      - ION_SFU_WS_PORT=7000
      - LOG_LEVEL=${LOG_LEVEL:-debug}
      - MAX_PARTICIPANTS=${MAX_PARTICIPANTS:-30}
      - JWT_SECRET=${JWT_SECRET:-dev-secret-key}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:5173,https://localhost:5173}
    volumes:
      - ./signaling:/app  # ホットリロード用
    networks:
      - emotion-net

  redis:
    image: redis:7-alpine
    container_name: redis-dev
    restart: unless-stopped
    ports:
      - "127.0.0.1:${REDIS_PORT:-6379}:6379"  # 開発時のみ外部公開
    volumes:
      - redis-dev-data:/data
    networks:
      - emotion-net

networks:
  emotion-net:
    driver: bridge

volumes:
  redis-dev-data:
```

#### 本番環境
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  ion-sfu:
    image: pionwebrtc/ion-sfu:latest
    container_name: ion-sfu-prod
    restart: unless-stopped
    ports:
      - "${ION_SFU_GRPC_PORT:-5000}:5000"
      - "${ION_SFU_WS_PORT:-7000}:7000"
      - "${WEBRTC_PORT_RANGE:-50000-50100}:50000-50100/udp"
    volumes:
      - ./configs/ion-sfu.prod.toml:/configs/sfu.toml
      - ./logs/ion-sfu:/logs
    environment:
      - CONFIG_FILE=/configs/sfu.toml
    networks:
      - emotion-net
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  signaling:
    build:
      context: ./signaling
      dockerfile: Dockerfile.prod
    container_name: signaling-prod
    restart: unless-stopped
    ports:
      - "${SIGNALING_PORT:-8080}:8080"
    depends_on:
      - redis
      - ion-sfu
    environment:
      - REDIS_ADDR=redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - REDIS_DB=${REDIS_DB:-0}
      - ION_SFU_GRPC_PORT=5000
      - ION_SFU_WS_PORT=7000
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - MAX_PARTICIPANTS=${MAX_PARTICIPANTS:-30}
      - JWT_SECRET=${JWT_SECRET}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    volumes:
      - ./logs/signaling:/app/logs
    networks:
      - emotion-net
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    container_name: redis-prod
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis-prod-data:/data
      - ./configs/redis.conf:/usr/local/etc/redis/redis.conf
    networks:
      - emotion-net
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:alpine
    container_name: nginx-prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./configs/nginx.prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./dist:/usr/share/nginx/html  # フロントエンドビルド成果物
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - signaling
      - ion-sfu
    networks:
      - emotion-net
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  emotion-net:
    driver: bridge

volumes:
  redis-prod-data:

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  redis_password:
    file: ./secrets/redis_password.txt
```

#### 環境変数ファイル
```bash
# .env (本番環境用、機密情報除く)
SIGNALING_PORT=8080
ION_SFU_GRPC_PORT=5000
ION_SFU_WS_PORT=7000
WEBRTC_PORT_RANGE=50000-50100
REDIS_PORT=6379
REDIS_DB=0
LOG_LEVEL=info
MAX_PARTICIPANTS=30
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# .env.secrets (本番環境用、Gitに含めない)
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-jwt-secret-key
```

### systemdサービス設定
```ini
[Unit]
Description=Emotion Sharing Platform
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/emotion-platform
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## ⚡ 性能最適化

### 帯域幅最適化

#### 基本戦略
```yaml
戦略:
  - Simulcast: 3層品質 (180p/360p/720p)
  - 適応的ビットレート: ネットワーク状態に応じて調整
  - DataChannel圧縮: MessagePack/ProtoBuf使用
  - 差分送信: 変化があった場合のみ送信

設定例:
  低品質: 180p@15fps (150kbps)
  中品質: 360p@30fps (500kbps)
  高品質: 720p@30fps (1.5Mbps)
```

#### Delta-Delta圧縮による表情ランドマーク最適化

通信路負荷を大幅に削減するためのランドマーク圧縮戦略：

##### 圧縮アルゴリズム
```go
// compression/delta_delta.go
package compression

import (
    "bytes"
    "encoding/binary"
    "math"
)

type LandmarkCompressor struct {
    prevFrame     []float32  // 前フレーム (1404値)
    prevDelta     []float32  // 前回の差分 (1404値)
    threshold     float32    // 変化量閾値
    frameBuffer   [][]float32 // 循環バッファ
    bufferSize    int        // バッファサイズ
    frameIndex    int        // 現在のフレームインデックス
}

func NewLandmarkCompressor() *LandmarkCompressor {
    return &LandmarkCompressor{
        prevFrame:   make([]float32, 1404), // 468点 × 3次元
        prevDelta:   make([]float32, 1404),
        threshold:   0.001,                 // 1mm以下の変化は無視
        frameBuffer: make([][]float32, 10), // 10フレーム分のバッファ
        bufferSize:  10,
    }
}

// Delta-Delta圧縮
func (c *LandmarkCompressor) Compress(landmarks []float32) *CompressedPacket {
    if len(landmarks) != 1404 {
        return nil
    }

    // 1. Delta計算 (現在フレーム - 前フレーム)
    currentDelta := make([]float32, 1404)
    for i := 0; i < 1404; i++ {
        currentDelta[i] = landmarks[i] - c.prevFrame[i]
    }

    // 2. Delta-Delta計算 (現在Delta - 前Delta)
    deltaDelta := make([]float32, 1404)
    significantChanges := make([]int, 0, 100) // 有意な変化のインデックス

    for i := 0; i < 1404; i++ {
        deltaDelta[i] = currentDelta[i] - c.prevDelta[i]

        // 閾値を超えた変化のみ記録
        if math.Abs(float64(deltaDelta[i])) > float64(c.threshold) {
            significantChanges = append(significantChanges, i)
        }
    }

    // 3. スパース形式でエンコード
    packet := &CompressedPacket{
        FrameIndex:   c.frameIndex,
        Timestamp:    time.Now().UnixMilli(),
        ChangeCount:  len(significantChanges),
        Changes:      make([]IndexedChange, len(significantChanges)),
    }

    for i, idx := range significantChanges {
        packet.Changes[i] = IndexedChange{
            Index: uint16(idx),
            Value: deltaDelta[idx],
        }
    }

    // 4. バイナリ圧縮
    packet.CompressedData = c.encodeToBytes(packet)

    // 5. 状態更新
    copy(c.prevFrame, landmarks)
    copy(c.prevDelta, currentDelta)
    c.frameIndex++

    return packet
}

// バイナリエンコード
func (c *LandmarkCompressor) encodeToBytes(packet *CompressedPacket) []byte {
    buf := new(bytes.Buffer)

    // ヘッダー (12バイト)
    binary.Write(buf, binary.LittleEndian, uint32(packet.FrameIndex))
    binary.Write(buf, binary.LittleEndian, uint64(packet.Timestamp))
    binary.Write(buf, binary.LittleEndian, uint32(packet.ChangeCount))

    // 変化データ (6バイト × 変化数)
    for _, change := range packet.Changes {
        binary.Write(buf, binary.LittleEndian, change.Index) // 2バイト
        binary.Write(buf, binary.LittleEndian, change.Value) // 4バイト
    }

    return buf.Bytes()
}

// 展開（受信側）
func (c *LandmarkCompressor) Decompress(compressedData []byte) ([]float32, error) {
    packet, err := c.decodeFromBytes(compressedData)
    if err != nil {
        return nil, err
    }

    // 前フレームから再構築
    reconstructed := make([]float32, 1404)
    copy(reconstructed, c.prevFrame)

    // Delta-Deltaを適用
    for _, change := range packet.Changes {
        if int(change.Index) < 1404 {
            // Delta-Deltaから現在Deltaを計算
            currentDelta := c.prevDelta[change.Index] + change.Value
            // 現在フレームを再構築
            reconstructed[change.Index] = c.prevFrame[change.Index] + currentDelta
            // 状態更新
            c.prevDelta[change.Index] = currentDelta
        }
    }

    // 状態更新
    copy(c.prevFrame, reconstructed)

    return reconstructed, nil
}
```

##### 圧縮効果（理論値）
```yaml
圧縮効果:
  - 無圧縮: 5776バイト (468点 × 3次元 × 4バイト + メタデータ)
  - Delta圧縮: ~2000バイト (65%削減)
  - Delta-Delta圧縮: ~400バイト (93%削減)
  - 顔静止時: ~20バイト (99.6%削減)

実測例:
  - 通常会話: 200-600バイト/フレーム
  - 大笑い時: 800-1200バイト/フレーム
  - 静止時: 12-50バイト/フレーム
```

##### WebRTCでの実装
```typescript
// frontend: services/compression/LandmarkCompressor.ts
export class LandmarkCompressor {
    private prevFrame = new Float32Array(1404);
    private prevDelta = new Float32Array(1404);
    private threshold = 0.001;

    compress(landmarks: Float32Array): Uint8Array {
        // Delta-Delta計算
        const changes: Array<{index: number, value: number}> = [];

        for (let i = 0; i < 1404; i++) {
            const delta = landmarks[i] - this.prevFrame[i];
            const deltaDelta = delta - this.prevDelta[i];

            if (Math.abs(deltaDelta) > this.threshold) {
                changes.push({ index: i, value: deltaDelta });
            }

            this.prevDelta[i] = delta;
        }

        // バイナリエンコード
        const buffer = new ArrayBuffer(12 + changes.length * 6);
        const view = new DataView(buffer);

        view.setUint32(0, Date.now() & 0xFFFFFFFF, true);
        view.setUint64(4, BigInt(Date.now()), true);
        view.setUint32(8, changes.length, true);

        let offset = 12;
        for (const change of changes) {
            view.setUint16(offset, change.index, true);
            view.setFloat32(offset + 2, change.value, true);
            offset += 6;
        }

        this.prevFrame.set(landmarks);
        return new Uint8Array(buffer);
    }

    // DataChannel送信
    sendCompressedLandmarks(dataChannel: RTCDataChannel, landmarks: Float32Array) {
        const compressed = this.compress(landmarks);

        if (dataChannel.readyState === 'open') {
            dataChannel.send(compressed);

            // 統計情報
            console.log(`Compressed: ${landmarks.length * 4}→${compressed.length} bytes (${Math.round(100 - compressed.length/(landmarks.length*4)*100)}% reduction)`);
        }
    }
}
```

##### 適応的圧縮制御
```go
// adaptive_compression.go
type AdaptiveCompressor struct {
    compressor     *LandmarkCompressor
    bandwidthEst   float64  // Mbps
    frameRate      int      // fps
    targetBitrate  int      // bps for landmarks
}

func (a *AdaptiveCompressor) AdjustCompression(networkCondition NetworkCondition) {
    switch networkCondition.Quality {
    case "excellent":
        a.compressor.threshold = 0.0005  // 高精度
        a.frameRate = 30
    case "good":
        a.compressor.threshold = 0.001   // 標準
        a.frameRate = 20
    case "poor":
        a.compressor.threshold = 0.002   // 低精度
        a.frameRate = 10
    case "critical":
        a.compressor.threshold = 0.005   // 最低限
        a.frameRate = 5
    }
}

// キーフレーム送信（定期的な完全同期）
func (a *AdaptiveCompressor) ShouldSendKeyFrame(frameIndex int) bool {
    return frameIndex%300 == 0  // 10秒に1回完全フレーム送信
}
```

##### エラー回復機能
```go
// error_recovery.go
type RecoveryManager struct {
    referenceFrames map[int][]float32  // キーフレーム保存
    lostFrames     []int              // 欠損フレーム番号
}

func (r *RecoveryManager) HandleFrameLoss(expectedIndex, receivedIndex int) {
    // フレーム欠損検出
    for i := expectedIndex; i < receivedIndex; i++ {
        r.lostFrames = append(r.lostFrames, i)
    }

    // 補間による復元
    r.interpolateFromReference(expectedIndex, receivedIndex)
}

func (r *RecoveryManager) RequestResync() {
    // 同期リクエスト送信
    // 送信側は次フレームをキーフレームとして送信
}
```

### レイテンシー削減
```yaml
手法:
  - TURN回避: P2P優先接続
  - データチャネル: Unreliable/Unorderedモード
  - バッファ最小化: Jitterバッファ50ms
  - エッジ配置: CDN/エッジサーバー活用

目標値:
  LAN内: <50ms
  同一地域: <100ms
  国内: <200ms
```

### スケーラビリティ
```yaml
垂直スケール:
  - CPU: 4-8コア
  - メモリ: 8-16GB
  - ネットワーク: 1Gbps

水平スケール:
  - Ion-SFUクラスター化
  - Redisクラスター
  - ロードバランサー配置

自動スケール:
  - CPU使用率 > 70%
  - メモリ使用率 > 80%
  - 同時接続数 > 閾値
```

---

## 📅 開発ロードマップ

### 全体スケジュール（23日間）

#### Phase 1: 基盤構築（3日間）

**目的**: プロジェクトの基本構造とコア機能の土台を構築

**Day 1: プロジェクトセットアップ**
```bash
# プロジェクト初期化
npm create vite@latest reaction-sharing-app -- --template react-ts
cd reaction-sharing-app

# 依存関係インストール
npm install react-router-dom axios @mediapipe/tasks-vision
npm install -D @types/react-router-dom tailwindcss postcss autoprefixer
npm install -D jest @testing-library/react @testing-library/jest-dom

# Tailwind CSS設定
npx tailwindcss init -p

# プロジェクト構造作成
mkdir -p src/{components,contexts,hooks,services,types,utils,workers,config}
mkdir -p src/components/{common,lobby,session}
```

**Day 2: 基本UIコンポーネント作成**
- [ ] App.tsxとルーティング設定
- [ ] 共通コンポーネント（Modal, Button, LoadingSpinner）
- [ ] エラー境界の実装
- [ ] 基本レイアウトとスタイリング

**Day 3: 状態管理基盤**
- [ ] AuthContextの実装
- [ ] ローカルストレージユーティリティ
- [ ] ロガーシステムの実装
- [ ] 環境変数設定（.env.development）

**成果物**:
- 動作するReactアプリケーション
- 基本的なUIコンポーネント
- 状態管理の基盤

---

#### Phase 2: ユーザー認証とロビー機能（3日間）

**目的**: ユーザー名入力と部屋選択機能の実装

**Day 4: ユーザー名モーダル**
```typescript
// 実装タスク
- UserNameModal.tsx コンポーネント
- バリデーションロジック（3-20文字、英数字）
- ローカルストレージへの保存
- 既存ユーザー名の自動読み込み
```

**Day 5: ロビー画面**
```typescript
// 実装タスク
- LobbyView.tsx ページコンポーネント
- RoomList.tsx（部屋一覧表示）
- RoomCard.tsx（個別部屋情報）
- モックデータでの表示テスト
```

**Day 6: ナビゲーション統合**
- [ ] ユーザー認証フローの実装
- [ ] ルーティングガードの追加
- [ ] 部屋選択後の遷移処理
- [ ] ローディング状態の管理

**成果物**:
- 完全なユーザー認証フロー
- 部屋選択インターフェース
- ナビゲーション機能

---

#### Phase 3: WebSocket通信とシグナリング（4日間）

**目的**: バックエンドとのリアルタイム通信を確立

**Day 7: WebSocketクライアント実装**
```typescript
// services/signaling/WebSocketClient.ts
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  async connect(url: string): Promise<void> {
    // 実装内容:
    // - 接続確立
    // - 自動再接続（指数バックオフ）
    // - ハートビート機能
  }
}
```

**Day 8: メッセージハンドラー**
```typescript
// services/signaling/MessageHandler.ts
// 実装タスク:
- メッセージ型定義（TypeScript）
- イベントエミッター実装
- メッセージルーティング
- エラーハンドリング
```

**Day 9: WebRTCContext実装**
- [ ] WebRTCContextプロバイダー
- [ ] 接続状態管理（Reducer）
- [ ] ピア管理ロジック
- [ ] useWebRTCカスタムフック

**Day 10: 統合テスト**
- [ ] バックエンド（192.168.3.39）との接続テスト
- [ ] 部屋参加/退出フローのテスト
- [ ] 接続エラーシナリオのテスト
- [ ] 再接続機能の検証

**成果物**:
- 動作するWebSocket通信
- シグナリングメッセージの送受信
- 接続状態の可視化

---

#### Phase 4: WebRTC接続とメディア制御（5日間）

**目的**: ビデオ/オーディオストリームとデータチャネルの確立

**Day 11: メディアデバイス管理**
```typescript
// hooks/useMediaDevices.ts
// 実装内容:
- getUserMedia API の使用
- デバイス列挙と選択
- ストリーム管理
- 権限エラー処理
```

**Day 12: RTCPeerConnection管理**
```typescript
// services/webrtc/PeerConnection.ts
// 実装タスク:
- PeerConnectionファクトリー
- Offer/Answer生成
- ICE候補処理
- 接続状態監視
```

**Day 13: データチャネル実装**
```typescript
// services/webrtc/DataChannel.ts
const dataChannelConfig: RTCDataChannelInit = {
  ordered: true,
  maxRetransmits: 3,
  label: 'landmarks',
  protocol: 'json'
};

// 実装内容:
- データチャネル作成
- メッセージ送受信
- バッファ管理
- エラーリカバリー
```

**Day 14: ビデオ表示コンポーネント**
- [ ] LocalVideo.tsx（ローカルビデオ表示）
- [ ] RemoteVideoGrid.tsx（リモートビデオグリッド）
- [ ] ビデオコントロール（ミュート、カメラ切替）
- [ ] レスポンシブレイアウト

**Day 15: 統合とデバッグ**
- [ ] 完全なピア接続フローのテスト
- [ ] 複数ピア接続の検証
- [ ] ネットワーク切断/再接続テスト
- [ ] WebRTC統計情報の収集

**成果物**:
- 動作するビデオ通話機能
- データチャネル通信
- 接続品質の可視化

---

#### Phase 5: MediaPipe統合とリアクション処理（5日間）

**目的**: 顔認識によるリアクション検出と共有

**Day 16: MediaPipe Web Worker実装**
```typescript
// workers/mediapipe.worker.ts
// 実装内容:
- FaceLandmarker初期化
- フレーム処理ループ
- ランドマーク抽出
- Worker通信プロトコル
```

**Day 17: リアクション計算ロジック**
```typescript
// services/mediapipe/ReactionProcessor.ts
// 実装タスク:
- ブレンドシェイプ分析
- 表情スコア計算
- スムージング処理
- キャリブレーション機能
```

**Day 18: useMediaPipeフック**
```typescript
// hooks/useMediaPipe.ts
// 実装内容:
- Workerライフサイクル管理
- ビデオフレーム送信
- リアクション値の受信
- パフォーマンス最適化
```

**Day 19: リアクション表示UI**
- [ ] ReactionIndicator.tsx（リアクション値表示）
- [ ] ReactionChart.tsx（履歴グラフ）
- [ ] ReactionOverlay.tsx（ビデオオーバーレイ）
- [ ] アニメーション効果

**Day 20: データチャネル統合**
- [ ] リアクションデータの送信
- [ ] リモートリアクションの受信
- [ ] ReactionContextの完成
- [ ] リアルタイム同期の検証

**成果物**:
- 完全なリアクション検出システム
- リアルタイム共有機能
- パフォーマンス最適化済み

**パフォーマンス目標**:
- 30 FPS での安定動作
- CPU使用率 < 40%
- レイテンシ < 100ms

---

#### Phase 6: 品質保証とデプロイメント（3日間）

**目的**: テスト、最適化、デプロイメント準備

**Day 21: テスト実装**
```bash
# ユニットテスト
npm install -D jest @testing-library/react @testing-library/jest-dom

# E2Eテスト
npm install -D @playwright/test

# テスト実行
npm run test
npm run test:e2e
```

**Day 22: パフォーマンス最適化**
- [ ] バンドル分割設定
- [ ] 遅延ロード実装
- [ ] メモ化の追加
- [ ] プロファイリングと最適化

**Day 23: デプロイメント準備**
- [ ] ビルド設定の最終調整
- [ ] Docker化（オプション）
- [ ] デプロイメントドキュメント作成
- [ ] 運用手順書の作成

**最終成果物**:
- プロダクションレディなアプリケーション
- 完全なテストスイート
- デプロイメント資材

---

### バックエンド並行開発（7日間）

Phase 1-3と並行して実施:

**Day 1-2: インフラ構築**
- [ ] VPSセットアップ
- [ ] Docker環境構築
- [ ] Ion-SFU設定

**Day 3-5: バックエンド実装**
- [ ] シグナリングサーバー
- [ ] Redis統合
- [ ] 基本API

**Day 6-7: 統合テスト**
- [ ] フロントエンドとの接続確認
- [ ] パフォーマンステスト
- [ ] セキュリティ検証

### 実装完了基準

#### 各フェーズの完了基準

**Phase 1-2（基盤）**
- [ ] すべてのコンポーネントがエラーなく動作
- [ ] ユーザーフローが完結
- [ ] 基本的なエラー処理実装

**Phase 3-4（通信）**
- [ ] 安定したWebSocket接続
- [ ] ビデオ通話の成功率 > 95%
- [ ] 再接続機能の動作確認

**Phase 5（MediaPipe）**
- [ ] 30 FPSでの安定動作
- [ ] リアクション検出精度 > 80%
- [ ] レイテンシ < 100ms

**Phase 6（品質）**
- [ ] テストカバレッジ > 70%
- [ ] Lighthouse スコア > 80
- [ ] ビルドサイズ < 5MB

---

## 📊 成功指標

### 技術指標
| 指標 | MVP目標 | 本番目標 |
|------|---------|----------|
| 遅延 (P50) | <200ms | <100ms |
| 遅延 (P95) | <500ms | <300ms |
| 同時接続 | 10人 | 30人 |
| 稼働率 | 95% | 99.5% |
| CPU使用率 | <70% | <50% |
| メモリ使用 | <2GB | <4GB |

### ビジネス指標
- ユーザー満足度: 4.0/5.0以上
- 平均セッション時間: 20分以上
- リテンション率: 30日で40%以上

---

## 🔧 トラブルシューティング

### よくある問題と対処法

| 問題 | 原因 | 対処法 |
|------|------|--------|
| 接続失敗 | ファイアウォール | UDP 50000-50100開放 |
| 映像なし | コーデック非対応 | H.264フォールバック |
| 高遅延 | ネットワーク輻輳 | ビットレート調整 |
| 音声途切れ | パケットロス | FEC有効化 |
| アプリクラッシュ | メモリリーク | 定期的リソース解放 |

### デバッグツール
```bash
# WebRTC統計情報
chrome://webrtc-internals

# ネットワーク診断
./scripts/network-test.sh

# ログ収集
docker-compose logs -f --tail=100

# パフォーマンスプロファイル
go tool pprof http://localhost:8080/debug/pprof/profile
```

---

## 📚 参考資料

### 技術ドキュメント
- [Ion-SFU Documentation](https://github.com/pion/ion-sfu)
- [MediaPipe Face Detection](https://google.github.io/mediapipe/)
- [WebRTC API](https://webrtc.org/getting-started/overview)
- [Swift WebRTC Integration](https://webrtc.googlesource.com/src/+/refs/heads/master/docs/native-code/ios/)

### 関連仕様
- [RFC 8831: WebRTC Data Channels](https://datatracker.ietf.org/doc/html/rfc8831)
- [Facial Action Coding System](https://en.wikipedia.org/wiki/Facial_Action_Coding_System)

---

**統合完了！この設計書で全体像が把握でき、実装方式も選択可能になりました。**