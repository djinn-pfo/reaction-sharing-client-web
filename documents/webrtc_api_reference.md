# WebRTC Data Channel API リファレンス

## 概要

このドキュメントは、LoLup Lives Go バックエンドで実装されたWebRTC Data Channel APIの詳細な仕様です。感情値の共有は**WebRTC Data Channel**経由で行い、**WebSocketはシグナリング専用**として使用します。

## アーキテクチャ

```
フロントエンド A ←→ WebRTC Data Channel ←→ フロントエンド B
        ↓                                           ↓
   WebSocket (シグナリング) ←→ バックエンド ←→ WebSocket (シグナリング)
```

## WebSocket API（シグナリング専用）

### 接続エンドポイント

```
ws://192.168.3.39:8080/ws?userId={ユーザーID}
```

### 送信メッセージ形式

#### 1. ルーム参加

```json
{
  "type": "join",
  "room": "room_id",
  "timestamp": 1640995200000
}
```

#### 2. ルーム離脱

```json
{
  "type": "leave",
  "timestamp": 1640995200000
}
```

#### 3. WebRTCピア接続開始

```json
{
  "type": "start-peer-connection",
  "data": {
    "remoteUserId": "target_user_id"
  },
  "timestamp": 1640995200000
}
```

#### 4. WebRTC Answer

```json
{
  "type": "webrtc-answer",
  "from": "your_user_id",
  "to": "remote_user_id",
  "room": "room_id",
  "data": {
    "answer": {
      "type": "answer",
      "sdp": "..."
    },
    "peerId": "peer_connection_id"
  },
  "timestamp": 1640995200000
}
```

#### 5. ICE候補

```json
{
  "type": "ice-candidate",
  "data": {
    "candidate": {
      "candidate": "candidate:...",
      "sdpMid": "0",
      "sdpMLineIndex": 0
    },
    "peerId": "peer_connection_id"
  },
  "timestamp": 1640995200000
}
```

### 受信メッセージ形式

#### 1. ルーム参加成功

```json
{
  "type": "joined",
  "room": "room_id",
  "data": {
    "message": "Successfully joined room"
  },
  "timestamp": 1640995200000
}
```

#### 2. ルーム離脱成功

```json
{
  "type": "left",
  "data": {
    "message": "Successfully left room"
  },
  "timestamp": 1640995200000
}
```

#### 3. WebRTC Offer受信

```json
{
  "type": "webrtc-offer",
  "from": "remote_user_id",
  "to": "your_user_id",
  "room": "room_id",
  "data": {
    "offer": {
      "type": "offer",
      "sdp": "..."
    },
    "peerId": "peer_connection_id"
  },
  "timestamp": 1640995200000
}
```

#### 4. WebRTC Answer受信

```json
{
  "type": "webrtc-answer",
  "from": "remote_user_id",
  "to": "your_user_id",
  "room": "room_id",
  "data": {
    "answer": {
      "type": "answer",
      "sdp": "..."
    },
    "peerId": "peer_connection_id"
  },
  "timestamp": 1640995200000
}
```

#### 5. ICE候補受信

```json
{
  "type": "ice-candidate",
  "data": {
    "candidate": {
      "candidate": "candidate:...",
      "sdpMid": "0",
      "sdpMLineIndex": 0
    },
    "peerId": "peer_connection_id"
  },
  "timestamp": 1640995200000
}
```

#### 6. エラーメッセージ

```json
{
  "type": "error",
  "data": {
    "error": "エラーメッセージ"
  },
  "timestamp": 1640995200000
}
```

## WebRTC Data Channel API

### Data Channel設定

- **チャンネル名**: `"emotions"`
- **プロトコル**: Unreliable（UDP-like）
- **データ形式**: JSON

### 感情データ送信形式

#### 標準MediaPipe形式

```json
{
  "userId": "your_user_id",
  "timestamp": 1640995200000,
  "type": "mediapipe",
  "data": {
    "intensity": 0.75,        // 笑度 (0.0-1.0)
    "laughLevel": "high",     // "low" | "medium" | "high"
    "confidence": 0.92,       // 信頼度 (0.0-1.0)
    "landmarks": [            // 468個のランドマーク × 3座標 = 1404要素
      0.123, 0.456, 0.789,   // x, y, z座標
      ...
    ],
    "velocityModel": "nonlinear_damper"
  }
}
```

#### シンプル形式

```json
{
  "userId": "your_user_id",
  "timestamp": 1640995200000,
  "type": "simple",
  "data": {
    "intensity": 0.5,         // 0.0-1.0
    "laughLevel": "medium",   // "low" | "medium" | "high"
    "value": 50              // 0-100の感情値
  }
}
```

#### 圧縮ランドマーク形式

```json
{
  "userId": "your_user_id",
  "timestamp": 1640995200000,
  "type": "compressed_landmarks",
  "data": {
    "intensity": 0.85,
    "laughLevel": "high",
    "confidence": 0.95,
    "frameIndex": 1234,
    "changeCount": 156,
    "compressionRatio": 0.97,
    "velocityModel": "nonlinear_damper"
  }
}
```

### バイナリデータ送信（上級者向け）

#### 圧縮ランドマーク（推奨）

```javascript
// マジックバイト [0xFF, 0xFE] + 圧縮データ
const magicBytes = new Uint8Array([0xFF, 0xFE]);
const compressedData = compress(landmarkArray); // 圧縮実装が必要
const binaryMessage = new Uint8Array([...magicBytes, ...compressedData]);
dataChannel.send(binaryMessage);
```

#### 非圧縮ランドマーク

```javascript
// 5776バイト（1404 × 4バイト）の生データ
const landmarkBuffer = new Float32Array(1404); // ランドマークデータ
const binaryMessage = new Uint8Array(landmarkBuffer.buffer);
dataChannel.send(binaryMessage);
```

## フロントエンド実装例

### 1. 基本セットアップ

```javascript
class WebRTCEmotionClient {
  constructor(userId, roomId) {
    this.userId = userId;
    this.roomId = roomId;
    this.ws = null;
    this.peerConnections = new Map();
    this.dataChannels = new Map();

    this.setupWebSocket();
  }

  setupWebSocket() {
    this.ws = new WebSocket(`ws://192.168.3.39:8080/ws?userId=${this.userId}`);
    this.ws.onmessage = this.handleSignalingMessage.bind(this);
    this.ws.onopen = () => this.joinRoom();
  }

  joinRoom() {
    this.ws.send(JSON.stringify({
      type: "join",
      room: this.roomId,
      timestamp: Date.now()
    }));
  }
}
```

### 2. WebRTCピア接続確立

```javascript
async connectToPeer(remoteUserId) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  // Data Channel作成
  const dataChannel = pc.createDataChannel('emotions');
  this.setupDataChannel(dataChannel, remoteUserId);

  // ICE候補処理
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      this.ws.send(JSON.stringify({
        type: "ice-candidate",
        data: {
          candidate: event.candidate.toJSON(),
          peerId: this.getPeerId(remoteUserId)
        },
        timestamp: Date.now()
      }));
    }
  };

  this.peerConnections.set(remoteUserId, pc);

  // 接続開始
  this.ws.send(JSON.stringify({
    type: "start-peer-connection",
    data: { remoteUserId },
    timestamp: Date.now()
  }));
}
```

### 3. Data Channel設定

```javascript
setupDataChannel(dataChannel, remoteUserId) {
  dataChannel.onopen = () => {
    console.log(`Data channel open with ${remoteUserId}`);
    this.dataChannels.set(remoteUserId, dataChannel);
  };

  dataChannel.onmessage = (event) => {
    const emotionData = JSON.parse(event.data);
    this.onEmotionReceived(emotionData);
  };

  dataChannel.onclose = () => {
    console.log(`Data channel closed with ${remoteUserId}`);
    this.dataChannels.delete(remoteUserId);
  };
}
```

### 4. 感情データ送信

```javascript
sendEmotion(landmarks, confidence) {
  const emotionData = {
    userId: this.userId,
    timestamp: Date.now(),
    type: "mediapipe",
    data: {
      intensity: this.calculateIntensity(landmarks),
      laughLevel: this.calculateLaughLevel(landmarks),
      confidence: confidence,
      landmarks: landmarks,
      velocityModel: "nonlinear_damper"
    }
  };

  // 全てのピアに送信
  this.dataChannels.forEach((dataChannel) => {
    if (dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(emotionData));
    }
  });
}
```

### 5. シグナリング処理

```javascript
handleSignalingMessage(event) {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case "joined":
      console.log("ルーム参加成功");
      break;

    case "webrtc-offer":
      this.handleOffer(message);
      break;

    case "webrtc-answer":
      this.handleAnswer(message);
      break;

    case "ice-candidate":
      this.handleICECandidate(message);
      break;

    case "error":
      console.error("エラー:", message.data.error);
      break;
  }
}
```

## エラーハンドリング

### よくあるエラー

1. **"Not in a room"**: ルーム参加前にピア接続を試行
2. **"remoteUserId is required"**: start-peer-connectionでremoteUserIdが未指定
3. **"Failed to create peer connection"**: WebRTC接続の初期化失敗
4. **"Failed to set answer"**: SDP Answer設定時のエラー

### デバッグのヒント

1. **WebSocketログ**: `ws://192.168.3.39:8080/ws` への接続確認
2. **Data Channelログ**: `dataChannel.readyState` の状態確認
3. **ICE接続状態**: `pc.connectionState` の監視
4. **CORS設定**: Origin `http://localhost:5173` または `http://192.168.3.39:*` を使用

## パフォーマンス最適化

### 送信頻度制限

```javascript
class EmotionThrottler {
  constructor(maxFPS = 10) {
    this.interval = 1000 / maxFPS;
    this.lastSent = 0;
  }

  shouldSend() {
    const now = Date.now();
    if (now - this.lastSent >= this.interval) {
      this.lastSent = now;
      return true;
    }
    return false;
  }
}
```

### データ圧縮

```javascript
// ランドマークの差分送信
sendEmotionDelta(currentLandmarks, previousLandmarks) {
  const delta = this.calculateDelta(currentLandmarks, previousLandmarks);
  if (this.isSignificantChange(delta)) {
    this.sendEmotion(currentLandmarks);
  }
}
```

## セキュリティ考慮事項

1. **CORS設定**: 許可されたOriginからのみ接続可能
2. **データ検証**: 受信した感情データの形式検証
3. **レート制限**: 過度な送信頻度の制限（推奨: 10FPS以下）
4. **接続制限**: ルーム内の最大参加者数制限（現在: 30人）

## 対応ブラウザ

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## サポート情報

- **サーバーURL**: `http://192.168.3.39:8080`
- **WebSocketURL**: `ws://192.168.3.39:8080/ws`
- **ヘルスチェック**: `GET /health`
- **STUN Server**: `stun:stun.l.google.com:19302`