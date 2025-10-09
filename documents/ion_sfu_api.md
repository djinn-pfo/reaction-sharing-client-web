# Ion-SFU API ドキュメント

## 概要

このドキュメントは、Ion-SFU経由でのビデオ/オーディオストリーミングを行うためのHTTP APIエンドポイントの仕様を定義します。

---

## ベースURL

```
http://localhost:8080/api/broadcast
```

**認証**: すべてのエンドポイントはJWT認証が必要です。
リクエストヘッダーに `Authorization: Bearer <token>` を含めてください。

---

## エンドポイント一覧

### 1. ルーム参加 (Join)

ブロードキャストルームに参加し、WebRTC接続を初期化します。

**エンドポイント**: `POST /api/broadcast/:roomId/join`

**リクエスト**:
```json
{
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=- ... (WebRTC SDP Offer)"
  }
}
```

**レスポンス (成功)**:
```json
{
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=- ... (WebRTC SDP Answer from Ion-SFU)"
  }
}
```

**レスポンス (エラー)**:
```json
{
  "error": "エラーメッセージ"
}
```

**使用例**:
```javascript
const pc = new RTCPeerConnection(config);
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

const response = await fetch('/api/broadcast/room-123/join', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    offer: pc.localDescription.toJSON()
  })
});

const { answer } = await response.json();
await pc.setRemoteDescription(new RTCSessionDescription(answer));
```

---

### 2. ストリーム配信 (Publish)

ローカルメディアストリームをIon-SFUに配信します（配信者用）。

**エンドポイント**: `POST /api/broadcast/:roomId/publish`

**リクエスト**:
```json
{
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=- ... (WebRTC SDP Offer with media)"
  }
}
```

**レスポンス (成功)**:
```json
{
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=- ... (WebRTC SDP Answer)"
  }
}
```

**使用例**:
```javascript
// ローカルメディアストリームを取得
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 640, height: 480, frameRate: 30 },
  audio: true
});

// PeerConnectionにトラックを追加
stream.getTracks().forEach(track => {
  pc.addTrack(track, stream);
});

// Offer作成
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// サーバーに送信
const response = await fetch('/api/broadcast/room-123/publish', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    offer: pc.localDescription.toJSON()
  })
});

const { answer } = await response.json();
await pc.setRemoteDescription(new RTCSessionDescription(answer));
```

---

### 3. ストリーム視聴 (Subscribe)

他の参加者のメディアストリームを視聴します（視聴者用）。

**エンドポイント**: `POST /api/broadcast/:roomId/subscribe`

**リクエスト**:
```json
{
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=- ... (WebRTC SDP Offer)"
  }
}
```

**レスポンス (成功)**:
```json
{
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=- ... (WebRTC SDP Answer with remote streams)"
  }
}
```

**使用例**:
```javascript
// リモートトラック受信ハンドラー
pc.ontrack = (event) => {
  console.log('Received remote track:', event.track.kind);
  const remoteVideo = document.getElementById('remote-video');
  if (remoteVideo.srcObject !== event.streams[0]) {
    remoteVideo.srcObject = event.streams[0];
  }
};

// Offer作成
const offer = await pc.createOffer({
  offerToReceiveVideo: true,
  offerToReceiveAudio: true
});
await pc.setLocalDescription(offer);

// サーバーに送信
const response = await fetch('/api/broadcast/room-123/subscribe', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    offer: pc.localDescription.toJSON()
  })
});

const { answer } = await response.json();
await pc.setRemoteDescription(new RTCSessionDescription(answer));
```

---

### 4. ICE候補送信 (Trickle ICE)

WebRTC接続のICE候補をサーバーに送信します。

**エンドポイント**: `POST /api/broadcast/:roomId/trickle`

**リクエスト**:
```json
{
  "target": 0,
  "candidate": {
    "candidate": "candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

**パラメータ**:
- `target`: `0` = 送信用, `1` = 受信用
- `candidate`: ICE候補オブジェクト

**レスポンス (成功)**:
```json
{
  "message": "ICE candidate sent"
}
```

**使用例**:
```javascript
pc.onicecandidate = async (event) => {
  if (event.candidate) {
    await fetch('/api/broadcast/room-123/trickle', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: 0, // 0=送信, 1=受信
        candidate: event.candidate.toJSON()
      })
    });
  }
};
```

---

### 5. ルーム離脱 (Leave)

ブロードキャストルームから離脱し、Ion-SFU接続を切断します。

**エンドポイント**: `DELETE /api/broadcast/:roomId/leave`

**レスポンス (成功)**:
```json
{
  "message": "Left broadcast room"
}
```

**使用例**:
```javascript
await fetch('/api/broadcast/room-123/leave', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// PeerConnectionをクローズ
pc.close();
```

---

## 完全な接続シーケンス例

### 配信者（Broadcaster）のシーケンス

```javascript
// 1. ローカルメディア取得
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

// 2. PeerConnection作成
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

// 3. トラック追加
stream.getTracks().forEach(track => pc.addTrack(track, stream));

// 4. ICE候補ハンドラー設定
pc.onicecandidate = async (event) => {
  if (event.candidate) {
    await fetch(`/api/broadcast/${roomId}/trickle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: 0,
        candidate: event.candidate.toJSON()
      })
    });
  }
};

// 5. Join リクエスト
const joinOffer = await pc.createOffer();
await pc.setLocalDescription(joinOffer);

const joinResponse = await fetch(`/api/broadcast/${roomId}/join`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ offer: joinOffer })
});

const { answer: joinAnswer } = await joinResponse.json();
await pc.setRemoteDescription(joinAnswer);

// 6. Publish リクエスト
const publishOffer = await pc.createOffer();
await pc.setLocalDescription(publishOffer);

const publishResponse = await fetch(`/api/broadcast/${roomId}/publish`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ offer: publishOffer })
});

const { answer: publishAnswer } = await publishResponse.json();
await pc.setRemoteDescription(publishAnswer);
```

### 視聴者（Viewer）のシーケンス

```javascript
// 1. PeerConnection作成
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

// 2. リモートトラックハンドラー設定
pc.ontrack = (event) => {
  const remoteVideo = document.getElementById('remote-video');
  remoteVideo.srcObject = event.streams[0];
};

// 3. ICE候補ハンドラー設定
pc.onicecandidate = async (event) => {
  if (event.candidate) {
    await fetch(`/api/broadcast/${roomId}/trickle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: 1, // 受信用
        candidate: event.candidate.toJSON()
      })
    });
  }
};

// 4. Join リクエスト
const joinOffer = await pc.createOffer();
await pc.setLocalDescription(joinOffer);

const joinResponse = await fetch(`/api/broadcast/${roomId}/join`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ offer: joinOffer })
});

const { answer: joinAnswer } = await joinResponse.json();
await pc.setRemoteDescription(joinAnswer);

// 5. Subscribe リクエスト
const subscribeOffer = await pc.createOffer({
  offerToReceiveVideo: true,
  offerToReceiveAudio: true
});
await pc.setLocalDescription(subscribeOffer);

const subscribeResponse = await fetch(`/api/broadcast/${roomId}/subscribe`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ offer: subscribeOffer })
});

const { answer: subscribeAnswer } = await subscribeResponse.json();
await pc.setRemoteDescription(subscribeAnswer);
```

---

## エラーハンドリング

### 一般的なエラー

| HTTPステータス | エラー内容 | 対処方法 |
|--------------|----------|---------|
| 400 Bad Request | リクエストボディが不正 | JSONフォーマットとパラメータを確認 |
| 401 Unauthorized | 認証トークンが無効 | 有効なJWTトークンを取得して再試行 |
| 500 Internal Server Error | Ion-SFU接続エラー | Ion-SFUサーバーの稼働状況を確認 |

### Ion-SFU固有のエラー

Ion-SFUからのエラーは以下の形式で返されます：

```json
{
  "error": "Ion-SFU error: [エラーメッセージ] (code=[エラーコード])"
}
```

**一般的なエラーコード**:
- `-1`: リクエストタイムアウト（10秒以内にレスポンスなし）
- その他のコードはIon-SFUの仕様に従います

---

## 注意事項

1. **接続タイムアウト**: すべてのリクエストは10秒でタイムアウトします（ICE Trickleは5秒）
2. **ICE候補の送信**: `onicecandidate` イベントで受信したすべての候補を送信してください
3. **ルーム離脱**: ページ離脱時は必ず `/leave` エンドポイントを呼び出してリソースを解放してください
4. **認証**: すべてのリクエストにJWTトークンが必要です

---

## デバッグ

バックエンドログには以下の形式でIon-SFU関連ログが出力されます：

- `📤 [ION-SFU] Sent request: method=join, id=1` - リクエスト送信
- `✅ [ION-SFU] Response received for request ID=1` - レスポンス受信
- `✅ [ION-SFU] Successfully joined room=room-123` - 接続成功
- `⏱️  [ION-SFU] Request ID=1 timed out` - タイムアウト
- `🧊 [ION-SFU] Successfully sent ICE candidate` - ICE候補送信成功

ログを確認することで、接続の状態やエラーの原因を特定できます。

---

## 参考資料

- [WebRTCメッセージプロトコル](./WEBRTC_MESSAGE_PROTOCOL.md)
- [Ion-SFU公式ドキュメント](https://github.com/pion/ion-sfu)
