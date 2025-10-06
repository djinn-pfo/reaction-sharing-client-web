# WebSocket感情共有API リファレンス

## 概要

WebSocketを使用したリアルタイム感情値共有システムのAPIリファレンスです。フロントエンドからバックエンドへの感情データ送信と、ルーム内の他のユーザーへのブロードキャストをサポートします。

## 接続仕様

### WebSocket接続
```
ws://localhost:8080/ws?userId=<your_user_id>
```

### パラメータ
- `userId`: ユーザー識別子（必須）

## メッセージフォーマット

すべてのメッセージは以下のベース構造を持ちます：

```json
{
  "type": "message_type",
  "room": "room_id",
  "from": "user_id",
  "to": "target_user_id",
  "data": {},
  "timestamp": 1640995200000
}
```

## 主要な操作

### 1. ルーム参加

**送信（フロントエンド → バックエンド）:**
```json
{
  "type": "join",
  "room": "room_123",
  "data": {}
}
```

**受信（バックエンド → フロントエンド）:**
```json
{
  "type": "joined",
  "room": "room_123",
  "data": {
    "message": "Successfully joined room"
  },
  "timestamp": 1640995200000
}
```

### 2. 感情データ送信

**直接感情値送信:**
```json
{
  "type": "emotion",
  "room": "room_123",
  "data": {
    "value": 75,
    "intensity": 0.8,
    "laughLevel": 0.6,
    "type": "simple"
  }
}
```

**MediaPipeランドマーク送信:**
```json
{
  "type": "emotion",
  "room": "room_123",
  "data": {
    "landmarks": [0.1, 0.2, 0.3, ...], // 468個のランドマーク * 3座標
    "emotions": {
      "joy": 0.8,
      "surprise": 0.2,
      "anger": 0.1
    },
    "confidence": 0.95,
    "type": "mediapipe"
  }
}
```

### 3. 感情データ受信

**処理確認（送信者へ）:**
```json
{
  "type": "emotion.processed",
  "data": {
    "message": "Emotion data processed and broadcasted"
  },
  "timestamp": 1640995200000
}
```

**他ユーザーからの感情データ（ブロードキャスト）:**
```json
{
  "type": "emotion.broadcast",
  "room": "room_123",
  "from": "user_456",
  "data": {
    "userId": "user_456",
    "timestamp": 1640995200000,
    "type": "landmarks_processed",
    "data": {
      "models": {
        "simple": {"laughValue": 0.7, "confidence": 0.9},
        "nonlinearDamper": {"laughValue": 0.75, "confidence": 0.9},
        "linearDamper": {"laughValue": 0.72, "confidence": 0.9},
        "exponential": {"laughValue": 0.68, "confidence": 0.9},
        "feedback": {"laughValue": 0.71, "confidence": 0.9}
      },
      "features": {
        "reference": {"mouth": 0.8, "cheek": 0.6, "eye": 0.4},
        "density": {"total": 0.7, "weighted": 0.75},
        "mouth": {"corners": 0.8, "shape": 0.85}
      },
      "unified": {
        "value": 72,
        "confidence": 0.9,
        "timestamp": 1640995200000
      }
    }
  },
  "timestamp": 1640995200000
}
```

### 4. ルーム離脱

**送信:**
```json
{
  "type": "leave",
  "data": {}
}
```

**受信:**
```json
{
  "type": "left",
  "data": {
    "message": "Successfully left room"
  },
  "timestamp": 1640995200000
}
```

## バイナリデータ送信（高度）

### 圧縮ランドマークデータ
マジックバイト `0xFF, 0xFE` を先頭に付けたバイナリデータとして送信可能：

```javascript
// 圧縮されたランドマークデータを送信
const magicBytes = new Uint8Array([0xFF, 0xFE]);
const compressedData = new Uint8Array([...]); // 圧縮データ
const binaryMessage = new Uint8Array(magicBytes.length + compressedData.length);
binaryMessage.set(magicBytes);
binaryMessage.set(compressedData, magicBytes.length);
websocket.send(binaryMessage);
```

### 非圧縮ランドマークデータ
5776バイトの非圧縮データとして送信：

```javascript
// MediaPipeの468ランドマーク × 3座標 × 4バイト(float32) = 5616バイト
// + ヘッダー情報 = 5776バイト
const landmarkData = new ArrayBuffer(5776);
const floatView = new Float32Array(landmarkData, 0, 1404); // 468 * 3 = 1404
// ランドマークデータを設定...
websocket.send(landmarkData);
```

## JavaScript実装例

### 基本接続とメッセージ処理

```javascript
class EmotionWebSocket {
  constructor(userId) {
    this.userId = userId;
    this.ws = null;
    this.currentRoom = null;
  }

  connect() {
    this.ws = new WebSocket(`ws://localhost:8080/ws?userId=${this.userId}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(message) {
    switch (message.type) {
      case 'joined':
        console.log('Successfully joined room:', message.room);
        this.currentRoom = message.room;
        break;

      case 'emotion.broadcast':
        console.log('Received emotion from:', message.from);
        this.onEmotionReceived(message.data);
        break;

      case 'emotion.processed':
        console.log('Emotion data processed');
        break;

      case 'error':
        console.error('Server error:', message.data.error);
        break;
    }
  }

  joinRoom(roomId) {
    this.send({
      type: 'join',
      room: roomId,
      data: {}
    });
  }

  sendEmotion(emotionData) {
    if (!this.currentRoom) {
      console.error('Not in a room');
      return;
    }

    this.send({
      type: 'emotion',
      room: this.currentRoom,
      data: emotionData
    });
  }

  // シンプルな感情値送信
  sendSimpleEmotion(value, intensity = 0.5, laughLevel = 0.5) {
    this.sendEmotion({
      value: value,
      intensity: intensity,
      laughLevel: laughLevel,
      type: 'simple'
    });
  }

  // MediaPipeデータ送信
  sendMediaPipeEmotion(landmarks, emotions, confidence) {
    this.sendEmotion({
      landmarks: landmarks,
      emotions: emotions,
      confidence: confidence,
      type: 'mediapipe'
    });
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // 感情データ受信時の処理（オーバーライド用）
  onEmotionReceived(emotionData) {
    // フロントエンドでの処理を実装
    // 注意: 自分が送信したデータも含まれます
    const isMyEmotion = emotionData.userId === this.userId;
    console.log(`Emotion data received from ${isMyEmotion ? 'myself' : 'other user'}:`, emotionData);
  }
}
```

### 使用例

```javascript
// インスタンス作成
const emotionWS = new EmotionWebSocket('user_123');

// 感情データ受信処理を設定
emotionWS.onEmotionReceived = (emotionData) => {
  // UIを更新
  updateEmotionDisplay(emotionData.data.unified.value);
  updateIntensityBar(emotionData.data.unified.confidence);
};

// 接続
emotionWS.connect();

// ルーム参加
emotionWS.joinRoom('room_123');

// 感情値送信
emotionWS.sendSimpleEmotion(75, 0.8, 0.6);

// MediaPipeデータ送信
const landmarks = [...]; // 468 * 3 = 1404個の値
const emotions = { joy: 0.8, surprise: 0.2 };
emotionWS.sendMediaPipeEmotion(landmarks, emotions, 0.95);
```

## データフロー

```
1. フロントエンド → WebSocket → バックエンド
   ┌─────────────┐    emotion    ┌─────────────┐
   │ Frontend A  │──────────────→│  Backend    │
   └─────────────┘               └─────────────┘

2. バックエンド → 感情解析処理 → 統一フォーマット変換

3. バックエンド → WebSocket → 送信者自身を含むルーム内全員
   ┌─────────────┐ emotion.broadcast ┌─────────────┐
   │  Backend    │──────────────────→│ Frontend A  │ (送信者自身)
   └─────────────┘                   └─────────────┘
                                     ┌─────────────┐
                                ────→│ Frontend B  │
                                     └─────────────┘
                                     ┌─────────────┐
                                ────→│ Frontend C  │
                                     └─────────────┘
```

**重要**: 送信者自身も`emotion.broadcast`メッセージを受信します。これにより、フロントエンドは自分が送信した感情データがバックエンドで処理された結果を受け取ることができます。

## エラーハンドリング

### エラーメッセージ
```json
{
  "type": "error",
  "data": {
    "error": "Not in a room"
  },
  "timestamp": 1640995200000
}
```

### よくあるエラー
- `"Not in a room"`: ルームに参加せずに感情データを送信
- `"Invalid emotion data format"`: 不正なデータフォーマット
- `"Room ID is required"`: ルーム参加時にルームIDが未指定

## 帯域幅とパフォーマンス

### 推定帯域幅（20ユーザー、100ms間隔）
- **シンプル感情値**: ~200B/message × 200msg/s = 40KB/s
- **MediaPipeデータ**: ~6KB/message × 200msg/s = 1.2MB/s
- **圧縮ランドマーク**: ~600B/message × 200msg/s = 120KB/s

### 推奨設定
- **送信間隔**: 100-200ms
- **接続数制限**: 30ユーザー/ルーム
- **圧縮**: 大量データには圧縮ランドマーク使用

## セキュリティ考慮事項

- **CORS**: 許可されたオリジンのみ接続可能
- **認証**: JWTトークンベースの認証（今後実装予定）
- **レート制限**: 過度なメッセージ送信を防止
- **データ検証**: 送信データの形式と範囲をサーバー側で検証