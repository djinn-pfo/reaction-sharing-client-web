# WebRTC接続メッセージプロトコル仕様書

## 概要

このドキュメントは、フロントエンドとバックエンド間のWebRTC接続確立のためのメッセージ形式とシーケンスを定義します。

---

## メッセージ形式

すべてのWebSocketメッセージは以下のJSON形式に従います：

```json
{
  "type": "メッセージタイプ",
  "room": "ルームID",
  "from": "送信者ユーザーID",
  "to": "宛先ユーザーID（オプション）",
  "data": { /* メッセージデータ */ },
  "timestamp": 1234567890000
}
```

---

## サポートされているメッセージタイプ

### 1. ルーム管理

#### `join` - ルーム参加
**送信**: クライアント → サーバー

```json
{
  "type": "join",
  "room": "room-002",
  "from": "user123",
  "timestamp": 1234567890000
}
```

**レスポンス**: サーバー → クライアント

```json
{
  "type": "joined",
  "room": "room-002",
  "data": {
    "message": "Successfully joined room",
    "userId": "user123",
    "participantCount": 1,
    "participantNumber": 1,
    "isBroadcaster": true,
    "role": "broadcaster"
  },
  "timestamp": 1234567890001
}
```

#### `leave` - ルーム離脱
**送信**: クライアント → サーバー

```json
{
  "type": "leave",
  "room": "room-002",
  "from": "user123",
  "timestamp": 1234567890000
}
```

**レスポンス**: サーバー → クライアント

```json
{
  "type": "left",
  "data": {
    "message": "Successfully left room"
  },
  "timestamp": 1234567890001
}
```

---

### 2. 感情データ送信

#### `emotion` - 感情データ送信
**送信**: クライアント → サーバー

```json
{
  "type": "emotion",
  "room": "room-002",
  "from": "user123",
  "data": {
    "landmarks": [0.1, 0.2, 0.3, /* ... 1394個の値 */],
    "intensity": 75,
    "confidence": 0.95
  },
  "timestamp": 1234567890000
}
```

**ブロードキャスト**: サーバー → ルーム内全員

```json
{
  "type": "emotion.broadcast",
  "room": "room-002",
  "from": "user123",
  "data": {
    "userId": "user123",
    "intensity": 75,
    "confidence": 0.95,
    "timestamp": 1234567890001
  },
  "timestamp": 1234567890001
}
```

---

### 3. ブロードキャストタイムスタンプ同期

#### `broadcast-timestamp` - タイムスタンプ送信（配信者のみ）
**送信**: 配信者 → サーバー

```json
{
  "type": "broadcast-timestamp",
  "room": "room-002",
  "from": "broadcaster-user-id",
  "data": {
    "frameId": "uuid-v4-string",
    "broadcastTimestamp": 1234567890000,
    "sequenceNumber": 123
  },
  "timestamp": 1234567890000
}
```

**リレー**: サーバー → 視聴者全員

```json
{
  "type": "broadcast-timestamp",
  "room": "room-002",
  "from": "broadcaster-user-id",
  "data": {
    "frameId": "uuid-v4-string",
    "broadcastTimestamp": 1234567890000,
    "sequenceNumber": 123
  },
  "timestamp": 1234567890000
}
```

#### `emotion-with-timestamp` - タイムスタンプ付き感情送信（視聴者のみ）
**送信**: 視聴者 → サーバー

```json
{
  "type": "emotion-with-timestamp",
  "room": "room-002",
  "from": "viewer-user-id",
  "to": "broadcaster-user-id",
  "data": {
    "userId": "viewer-user-id",
    "intensity": 75,
    "confidence": 0.95,
    "broadcastTimestamp": 1234567890000,
    "reactionSentTime": 1234567890350,
    "frameId": "uuid-v4-string"
  },
  "timestamp": 1234567890350
}
```

**転送**: サーバー → 配信者（メトリクス付き）

```json
{
  "type": "emotion-with-timestamp",
  "room": "room-002",
  "from": "viewer-user-id",
  "to": "broadcaster-user-id",
  "data": {
    "userId": "viewer-user-id",
    "intensity": 75,
    "confidence": 0.95,
    "broadcastTimestamp": 1234567890000,
    "reactionSentTime": 1234567890350,
    "frameId": "uuid-v4-string",
    "serverReceivedTime": 1234567890400,
    "broadcasterReceivedTime": 1234567890420
  },
  "metrics": {
    "broadcastToReceivedMs": 420,
    "reactionProcessingMs": 350,
    "networkLatencyMs": 70,
    "frameId": "uuid-v4-string",
    "userId": "viewer-user-id",
    "timestamp": 1234567890420,
    "withinConstraint": true
  },
  "timestamp": 1234567890420
}
```

---

## WebRTC接続について

### 現在の実装状況

**⚠️ 重要**: 現在のバックエンドは **WebRTC Signaling には対応していません**。

以下のメッセージタイプは **未実装** です：
- ❌ `start-peer-connection`
- ❌ `offer`
- ❌ `answer`
- ❌ `ice-candidate`

### WebRTC接続の代替方法

現在のシステムでは、以下の2つの方法でWebRTC接続を確立できます：

#### Option 1: フロントエンド間でP2P接続（推奨）

WebRTC接続をフロントエンド間で直接確立し、バックエンドは感情データの中継のみを担当します。

**シーケンス**:
```
クライアントA                バックエンド              クライアントB
    |                            |                         |
    |-- join (room-002) -------->|                         |
    |<-- joined (broadcaster) ---|                         |
    |                            |<-- join (room-002) -----|
    |                            |--- joined (viewer) ---->|
    |                            |                         |
    | WebRTC接続確立（P2P、バックエンド経由せず）        |
    |<-----------------------------------------WebRTC---->|
    |                            |                         |
    |-- emotion ----------------->|                         |
    |                            |--- emotion.broadcast -->|
```

**フロントエンド実装例**:
```javascript
// 1. ルーム参加
ws.send(JSON.stringify({
  type: 'join',
  room: 'room-002',
  from: userId
}));

// 2. joined受信後、自分の役割を確認
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'joined') {
    if (msg.data.isBroadcaster) {
      // 配信者として初期化
      setupBroadcaster();
    } else {
      // 視聴者として初期化
      setupViewer();
    }
  }
};

// 3. WebRTC接続は別のSignalingサーバーまたはP2Pライブラリを使用
// 例: PeerJS, SimplePeer, など
```

#### Option 2: Ion-SFU経由の接続（実装中）

Ion-SFUを使用したメディアストリーミング。

**APIエンドポイント**:
```
POST /api/broadcast/:roomId/join       - ブロードキャストルーム参加
POST /api/broadcast/:roomId/publish    - ストリーム配信開始
POST /api/broadcast/:roomId/subscribe  - ストリーム視聴開始
DELETE /api/broadcast/:roomId/leave    - ルーム離脱
```

**使用例**:
```javascript
// 1. ルーム参加 + 配信開始
const response = await fetch('/api/broadcast/room-002/publish', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    offer: peerConnection.localDescription
  })
});

const { answer } = await response.json();
await peerConnection.setRemoteDescription(answer);
```

---

## 接続シーケンス例

### シーケンス 1: 配信者の接続

```
配信者クライアント          バックエンド (WebSocket)
    |                              |
    |-- WebSocket接続 ------------->|
    |<-- 接続確立 -------------------|
    |                              |
    |-- join (room-002) ----------->|
    |<-- joined (isBroadcaster) ----|
    |    {                          |
    |      "participantNumber": 1,  |
    |      "isBroadcaster": true,   |
    |      "role": "broadcaster"    |
    |    }                          |
    |                              |
    |-- broadcast-timestamp ------->|
    |    (50ms間隔で連続送信)      |
    |                              |
    |-- emotion ------------------>|
    |<-- emotion.broadcast ---------|
```

### シーケンス 2: 視聴者の接続

```
視聴者クライアント          バックエンド (WebSocket)
    |                              |
    |-- WebSocket接続 ------------->|
    |<-- 接続確立 -------------------|
    |                              |
    |-- join (room-002) ----------->|
    |<-- joined (isViewer) ---------|
    |    {                          |
    |      "participantNumber": 2,  |
    |      "isBroadcaster": false,  |
    |      "role": "viewer"         |
    |    }                          |
    |                              |
    |<-- broadcast-timestamp -------|
    |    (配信者から転送)          |
    |                              |
    |-- emotion-with-timestamp ---->|
    |                              |
```

---

## エラーハンドリング

### エラーメッセージ形式

```json
{
  "type": "error",
  "data": {
    "error": "エラーメッセージ"
  },
  "timestamp": 1234567890000
}
```

### 一般的なエラー

| エラーメッセージ | 原因 | 対処方法 |
|----------------|------|----------|
| "Room ID is required" | `room`フィールドが空 | `room`フィールドを指定 |
| "Not in a room" | ルーム未参加状態でメッセージ送信 | 先に`join`メッセージを送信 |
| "Invalid emotion data format" | `data`フィールドの形式が不正 | 正しい形式でデータを送信 |

---

## 実装チェックリスト

### フロントエンド実装時の確認事項

- [ ] WebSocket接続時に`userId`をクエリパラメータで送信
  ```javascript
  const ws = new WebSocket(`ws://localhost:8080/ws?userId=${userId}`);
  ```

- [ ] ルーム参加時に`join`メッセージを送信
  ```javascript
  ws.send(JSON.stringify({
    type: 'join',
    room: roomId,
    from: userId,
    timestamp: Date.now()
  }));
  ```

- [ ] `joined`メッセージを受信して役割を判定
  ```javascript
  if (msg.data.isBroadcaster) {
    // 配信者として初期化
  } else {
    // 視聴者として初期化
  }
  ```

- [ ] 配信者の場合、タイムスタンプを20Hz (50ms間隔) で送信
  ```javascript
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'broadcast-timestamp',
      room: roomId,
      from: userId,
      data: {
        frameId: crypto.randomUUID(),
        broadcastTimestamp: Date.now(),
        sequenceNumber: seq++
      }
    }));
  }, 50);
  ```

- [ ] 視聴者の場合、タイムスタンプ受信後にリアクション送信
  ```javascript
  ws.send(JSON.stringify({
    type: 'emotion-with-timestamp',
    room: roomId,
    from: userId,
    to: broadcasterUserId,
    data: {
      userId: userId,
      intensity: 75,
      confidence: 0.95,
      broadcastTimestamp: latestTimestamp,
      reactionSentTime: Date.now(),
      frameId: latestFrameId
    }
  }));
  ```

---

## WebRTC Signaling対応（今後の実装予定）

将来的にWebRTC Signalingをバックエンドで対応する場合、以下のメッセージタイプを実装予定：

### `offer` - SDP Offer送信
```json
{
  "type": "offer",
  "room": "room-002",
  "from": "user123",
  "to": "user456",
  "data": {
    "sdp": "v=0\r\no=- ...",
    "type": "offer"
  }
}
```

### `answer` - SDP Answer送信
```json
{
  "type": "answer",
  "room": "room-002",
  "from": "user456",
  "to": "user123",
  "data": {
    "sdp": "v=0\r\no=- ...",
    "type": "answer"
  }
}
```

### `ice-candidate` - ICE Candidate送信
```json
{
  "type": "ice-candidate",
  "room": "room-002",
  "from": "user123",
  "to": "user456",
  "data": {
    "candidate": "candidate:1 ...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

**⚠️ これらは現在未実装です。実装が必要な場合はバックエンド側に追加開発が必要です。**

---

## サンプルコード

完全な実装例は以下のファイルを参照してください：
- `examples/client/broadcast_timestamp_client.js`

---

## トラブルシューティング

### Q: `Unknown message type` エラーが出る
**A**: 送信しているメッセージタイプがサポートされていません。このドキュメントの「サポートされているメッセージタイプ」を確認してください。

### Q: `joined`メッセージが受信できない
**A**: バックエンドログを確認してください。以下のログが表示されているか確認：
```
🔄 [HANDLING] Join request from User=xxx to Room=xxx
📤 [SENDING JOINED] Sending 'joined' response to User=xxx
✉️ [SENT] Type=joined to User=xxx
```

### Q: WebRTC接続が確立できない
**A**: 現在のバックエンドはWebRTC Signalingに対応していません。Option 1（P2P接続）またはOption 2（Ion-SFU）を使用してください。

---

## 参考資料

- [設計書](./broadcaster_timestamp_sync_design.md)
- [実装サマリー](./IMPLEMENTATION_SUMMARY.md)
- [クライアント実装例](../examples/client/broadcast_timestamp_client.js)
