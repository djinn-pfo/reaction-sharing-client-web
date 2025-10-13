# 笑い声システム - フロントエンドAPIリファレンス

## 概要

このドキュメントは、フロントエンド（React/TypeScript）で笑い声機能を実装するためのAPIリファレンスです。

## 基本フロー

```
1. アプリ起動時: プリセット一覧取得 → IndexedDBに保存
2. ユーザーが笑い声を選択: プリセットファイルをダウンロード → IndexedDBに保存
3. ユーザーが笑うボタンを押す: WebSocketでメッセージ送信
4. 他のユーザーの笑い: WebSocketメッセージ受信 → IndexedDBから音声取得 → 再生
```

---

## 1. プリセット一覧取得 API

### エンドポイント
```
GET http://localhost:5001/api/v1/laugh/presets
```

### レスポンス

```json
{
  "presets": [
    {
      "id": "male1_small",
      "pattern": "male1",
      "level": "small",
      "url": "/static/laughs/presets/male1_small.wav",
      "duration": 1.2,
      "size": 114688
    },
    {
      "id": "male1_medium",
      "pattern": "male1",
      "level": "medium",
      "url": "/static/laughs/presets/male1_medium.wav",
      "duration": 1.8,
      "size": 190464
    },
    {
      "id": "male1_large",
      "pattern": "male1",
      "level": "large",
      "url": "/static/laughs/presets/male1_large.wav",
      "duration": 1.6,
      "size": 177152
    }
    // ... 全18個のプリセット
  ]
}
```

### フィールド説明

| フィールド | 型 | 説明 |
|----------|-----|------|
| `id` | string | プリセットの一意識別子（IndexedDBのキーとして使用） |
| `pattern` | string | パターン名（`male1`, `male2`, `male3`, `female1`, `female2`, `female3`） |
| `level` | string | 笑いの強度（`small`, `medium`, `large`） |
| `url` | string | 音声ファイルのURL（Go Signaling Server経由で配信） |
| `duration` | number | 音声の長さ（秒） |
| `size` | number | ファイルサイズ（バイト） |

### TypeScript型定義

```typescript
interface LaughPreset {
  id: string;           // "male1_small"
  pattern: string;      // "male1"
  level: string;        // "small" | "medium" | "large"
  url: string;          // "/static/laughs/presets/male1_small.wav"
  duration: number;     // 1.2
  size: number;         // 114688
}

interface PresetsResponse {
  presets: LaughPreset[];
}
```

### 使用例（React/TypeScript）

```typescript
// プリセット一覧を取得
const fetchPresets = async (): Promise<LaughPreset[]> => {
  try {
    const response = await fetch('http://localhost:5001/api/v1/laugh/presets');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: PresetsResponse = await response.json();
    return data.presets;
  } catch (error) {
    console.error('Failed to fetch presets:', error);
    throw error;
  }
};
```

---

## 2. プリセット音声ファイルのダウンロード

### エンドポイント
```
GET http://localhost:8080{preset.url}
```

例:
```
GET http://localhost:8080/static/laughs/presets/male1_small.wav
```

### レスポンス

- **Content-Type**: `audio/wav`
- **Body**: WAVファイルのバイナリデータ

### 使用例（React/TypeScript）

```typescript
// 音声ファイルをArrayBufferとしてダウンロード
const downloadPresetAudio = async (url: string): Promise<ArrayBuffer> => {
  try {
    const fullUrl = `http://localhost:8080${url}`;
    const response = await fetch(fullUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  } catch (error) {
    console.error('Failed to download audio:', error);
    throw error;
  }
};
```

---

## 3. IndexedDB への保存

### データベース設計

```typescript
interface LaughPresetDB {
  id: string;           // Primary Key: "male1_small"
  pattern: string;      // "male1"
  level: string;        // "small"
  duration: number;     // 1.2
  size: number;         // 114688
  audioData: ArrayBuffer;  // WAVファイルのバイナリデータ
  downloadedAt: number;    // ダウンロード日時（Unix timestamp）
}
```

### IndexedDB セットアップ

```typescript
const DB_NAME = 'LolupLivesDB';
const DB_VERSION = 1;
const STORE_NAME = 'laughPresets';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Object Storeを作成（まだ存在しない場合）
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('pattern', 'pattern', { unique: false });
        objectStore.createIndex('level', 'level', { unique: false });
      }
    };
  });
};
```

### プリセットを保存

```typescript
const savePresetToDB = async (preset: LaughPreset, audioData: ArrayBuffer): Promise<void> => {
  const db = await openDB();

  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  const data: LaughPresetDB = {
    id: preset.id,
    pattern: preset.pattern,
    level: preset.level,
    duration: preset.duration,
    size: preset.size,
    audioData: audioData,
    downloadedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
```

### プリセットを取得

```typescript
const getPresetFromDB = async (presetId: string): Promise<LaughPresetDB | null> => {
  const db = await openDB();

  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(presetId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};
```

---

## 4. 音声再生

### ArrayBuffer から Audio 再生

```typescript
const playLaughAudio = async (audioData: ArrayBuffer): Promise<void> => {
  try {
    // ArrayBufferをBlobに変換
    const blob = new Blob([audioData], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    // Audio要素を作成して再生
    const audio = new Audio(url);

    await audio.play();

    // 再生終了後にURLを解放
    audio.onended = () => {
      URL.revokeObjectURL(url);
    };
  } catch (error) {
    console.error('Failed to play audio:', error);
    throw error;
  }
};
```

### IndexedDB から取得して再生

```typescript
const playPreset = async (presetId: string): Promise<void> => {
  try {
    // IndexedDBから音声データを取得
    const preset = await getPresetFromDB(presetId);

    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    // 音声を再生
    await playLaughAudio(preset.audioData);
  } catch (error) {
    console.error('Failed to play preset:', error);
    throw error;
  }
};
```

---

## 5. WebSocket メッセージング

### 自分が笑う（送信）

```typescript
interface LaughSelectMessage {
  type: 'laugh:select';
  data: {
    presetId: string;     // "male1_medium"
    timestamp: number;    // Date.now()
  };
  timestamp: number;
}

// WebSocketで笑い声選択を送信
const sendLaughSelect = (ws: WebSocket, presetId: string): void => {
  const message: LaughSelectMessage = {
    type: 'laugh:select',
    data: {
      presetId: presetId,
      timestamp: Date.now()
    },
    timestamp: Date.now()
  };

  ws.send(JSON.stringify(message));
};
```

### 他のユーザーの笑いを受信（受信）

```typescript
interface LaughSelectedMessage {
  type: 'laugh:selected';
  userId: string;           // "user_123"
  data: {
    presetId: string;       // "female2_large"
    timestamp: number;
  };
  timestamp: number;
}

// WebSocketメッセージを受信
ws.onmessage = async (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'laugh:selected') {
    const laughMessage = message as LaughSelectedMessage;

    console.log(`User ${laughMessage.userId} laughed with ${laughMessage.data.presetId}`);

    // IndexedDBから音声を取得して再生
    await playPreset(laughMessage.data.presetId);
  }
};
```

---

## 6. 完全な実装例

### React Hookの例

```typescript
import { useState, useEffect, useCallback } from 'react';

// カスタムフック: プリセット管理
export const useLaughPresets = () => {
  const [presets, setPresets] = useState<LaughPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // プリセット一覧を取得
  useEffect(() => {
    const loadPresets = async () => {
      try {
        setLoading(true);
        const fetchedPresets = await fetchPresets();
        setPresets(fetchedPresets);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadPresets();
  }, []);

  // プリセットをダウンロードしてIndexedDBに保存
  const downloadAndSavePreset = useCallback(async (preset: LaughPreset) => {
    try {
      const audioData = await downloadPresetAudio(preset.url);
      await savePresetToDB(preset, audioData);
      console.log(`Saved preset: ${preset.id}`);
    } catch (err) {
      console.error(`Failed to save preset ${preset.id}:`, err);
      throw err;
    }
  }, []);

  // 全プリセットをダウンロード
  const downloadAllPresets = useCallback(async () => {
    const promises = presets.map(preset => downloadAndSavePreset(preset));
    await Promise.all(promises);
  }, [presets, downloadAndSavePreset]);

  return {
    presets,
    loading,
    error,
    downloadAndSavePreset,
    downloadAllPresets
  };
};

// カスタムフック: 笑い声再生
export const useLaughPlayer = (ws: WebSocket | null) => {
  // 自分が笑う
  const laugh = useCallback((presetId: string) => {
    if (!ws) return;

    // WebSocketで送信
    sendLaughSelect(ws, presetId);

    // 自分でも再生
    playPreset(presetId).catch(err => {
      console.error('Failed to play own laugh:', err);
    });
  }, [ws]);

  // 他のユーザーの笑いを受信して再生
  useEffect(() => {
    if (!ws) return;

    const handleMessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      if (message.type === 'laugh:selected') {
        const laughMessage = message as LaughSelectedMessage;

        // 他のユーザーの笑い声を再生
        await playPreset(laughMessage.data.presetId);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws]);

  return { laugh };
};
```

### コンポーネントの使用例

```typescript
const LaughSelector: React.FC = () => {
  const ws = useWebSocket(); // WebSocket接続フック（別途実装）
  const { presets, loading, downloadAllPresets } = useLaughPresets();
  const { laugh } = useLaughPlayer(ws);
  const [selectedPreset, setSelectedPreset] = useState<string>('male1_medium');

  // 初回マウント時に全プリセットをダウンロード
  useEffect(() => {
    if (presets.length > 0) {
      downloadAllPresets().catch(err => {
        console.error('Failed to download presets:', err);
      });
    }
  }, [presets, downloadAllPresets]);

  const handleLaugh = () => {
    laugh(selectedPreset);
  };

  if (loading) return <div>Loading presets...</div>;

  return (
    <div>
      <h2>笑い声を選択</h2>
      <select
        value={selectedPreset}
        onChange={(e) => setSelectedPreset(e.target.value)}
      >
        {presets.map(preset => (
          <option key={preset.id} value={preset.id}>
            {preset.pattern} - {preset.level}
          </option>
        ))}
      </select>

      <button onClick={handleLaugh}>
        笑う！
      </button>
    </div>
  );
};
```

---

## 7. エラーハンドリング

### よくあるエラーと対処法

#### プリセット一覧の取得失敗

```typescript
try {
  const presets = await fetchPresets();
} catch (error) {
  if (error instanceof TypeError) {
    // ネットワークエラー
    console.error('Network error: Cannot reach laugh API server');
  } else {
    console.error('Failed to fetch presets:', error);
  }
  // フォールバック: キャッシュされたプリセット一覧を使用
}
```

#### 音声ファイルのダウンロード失敗

```typescript
try {
  const audioData = await downloadPresetAudio(preset.url);
} catch (error) {
  console.error(`Failed to download ${preset.id}:`, error);
  // リトライロジック
  await retryDownload(preset, 3); // 3回までリトライ
}
```

#### IndexedDB 保存失敗

```typescript
try {
  await savePresetToDB(preset, audioData);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.error('IndexedDB quota exceeded. Please clear some data.');
    // ユーザーに通知
  } else {
    console.error('Failed to save to IndexedDB:', error);
  }
}
```

#### 音声再生失敗

```typescript
try {
  await playPreset(presetId);
} catch (error) {
  console.error(`Failed to play preset ${presetId}:`, error);

  // フォールバック: サーバーから直接ストリーミング再生
  const preset = presets.find(p => p.id === presetId);
  if (preset) {
    const audio = new Audio(`http://localhost:8080${preset.url}`);
    await audio.play();
  }
}
```

---

## 8. パフォーマンス最適化

### 段階的なダウンロード

```typescript
// 優先度の高いプリセット（ユーザーが選択したもの）を先にダウンロード
const downloadPresetsInPriority = async (
  presets: LaughPreset[],
  selectedPresetId: string
) => {
  // 選択されたプリセットを最優先
  const selectedPreset = presets.find(p => p.id === selectedPresetId);
  if (selectedPreset) {
    await downloadAndSavePreset(selectedPreset);
  }

  // 残りのプリセットをバックグラウンドでダウンロード
  const remainingPresets = presets.filter(p => p.id !== selectedPresetId);
  for (const preset of remainingPresets) {
    await downloadAndSavePreset(preset);
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機
  }
};
```

### キャッシュの確認

```typescript
// ダウンロード前にキャッシュをチェック
const ensurePresetCached = async (presetId: string): Promise<void> => {
  const cached = await getPresetFromDB(presetId);

  if (cached) {
    console.log(`Preset ${presetId} already cached`);
    return;
  }

  // キャッシュにない場合のみダウンロード
  const preset = presets.find(p => p.id === presetId);
  if (preset) {
    const audioData = await downloadPresetAudio(preset.url);
    await savePresetToDB(preset, audioData);
  }
};
```

---

## 9. デバッグとテスト

### IndexedDB の内容確認

```typescript
// すべてのプリセットを一覧表示
const listAllCachedPresets = async (): Promise<LaughPresetDB[]> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// デバッグ用
const debugIndexedDB = async () => {
  const cached = await listAllCachedPresets();
  console.log(`Cached presets: ${cached.length}`);
  cached.forEach(preset => {
    console.log(`- ${preset.id}: ${(preset.size / 1024).toFixed(2)} KB`);
  });
};
```

### WebSocket メッセージのログ

```typescript
// WebSocketメッセージをすべてログ
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('[WebSocket Received]', message);

  // 通常の処理
  handleWebSocketMessage(message);
};

ws.onsend = (data: string) => {
  console.log('[WebSocket Sent]', JSON.parse(data));
};
```

---

## 10. 環境変数

### 推奨設定（.env）

```env
# Go Signaling Server
VITE_SIGNALING_WS_URL=ws://localhost:8080/ws
VITE_SIGNALING_HTTP_URL=http://localhost:8080

# Python Laugh API
VITE_LAUGH_API_URL=http://localhost:5001

# Static Files Base URL
VITE_STATIC_BASE_URL=http://localhost:8080
```

### 使用例

```typescript
const SIGNALING_WS_URL = import.meta.env.VITE_SIGNALING_WS_URL;
const STATIC_BASE_URL = import.meta.env.VITE_STATIC_BASE_URL;

const fullUrl = `${STATIC_BASE_URL}${preset.url}`;
```

---

## まとめ

### 実装チェックリスト

- [ ] IndexedDB セットアップ（DB作成、Object Store作成）
- [ ] プリセット一覧取得API呼び出し
- [ ] プリセット音声ファイルのダウンロード
- [ ] IndexedDBへの保存
- [ ] 笑い声選択UI（ドロップダウンまたはグリッド）
- [ ] WebSocketでlaughメッセージ送信
- [ ] WebSocketでlaughメッセージ受信
- [ ] IndexedDBから音声取得
- [ ] Audio再生
- [ ] エラーハンドリング
- [ ] ローディング表示

### 推奨実装順序

1. **IndexedDB セットアップ** → DBとObject Storeの作成
2. **プリセット取得** → API呼び出し、状態管理
3. **音声ダウンロード** → Fetch API、ArrayBuffer処理
4. **IndexedDB保存** → put操作
5. **音声再生テスト** → IndexedDBから取得して再生
6. **WebSocket統合** → 送信・受信ハンドラー
7. **UI実装** → プリセット選択、笑うボタン
8. **エラーハンドリング** → リトライ、フォールバック
9. **最適化** → 段階的ダウンロード、キャッシュチェック

これで基本的なプリセット笑い声機能が実装できます！🎉
