# Reaction Sharing Network Frontend Web Application Design

## 概要
WebRTCとMediaPipe FaceLandmarkerを活用したリアルタイム表情共有Webアプリケーションの詳細設計書です。Go + Ion-SFUバックエンドと連携し、顔の表情ランドマークをリアルタイムで取得・共有します。

## 基本要件

### 技術スタック
- **フロントエンド**: React 18.x + TypeScript
- **ビルドツール**: Vite 5.x
- **WebRTC**: ネイティブブラウザAPI + Ion-SDK-JS
- **顔認識**: MediaPipe FaceLandmarker
- **状態管理**: React Context API + useReducer
- **スタイリング**: CSS Modules + Tailwind CSS
- **テスト**: Jest + React Testing Library + Playwright

### バックエンド接続先（開発環境）
- **シグナリングサーバー**: `ws://192.168.3.39:8080/ws`
- **Ion-SFU**: `http://192.168.3.39:7000`
- **ヘルスチェック**: `http://192.168.3.39:8080/health`

## アーキテクチャ設計

### システム構成図
```
┌─────────────────────────────────────────────────────────┐
│                     React SPA (Client)                   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │
│  │  UI Layer   │  │  Business   │  │   Service    │   │
│  │ Components  │◄─┤   Logic     │◄─┤    Layer     │   │
│  └─────────────┘  └─────────────┘  └──────────────┘   │
│         ▲               ▲                   ▲           │
│         │               │                   │           │
│  ┌──────┴──────┐ ┌─────┴──────┐ ┌─────────┴────────┐ │
│  │   Context    │ │   Hooks    │ │   Web Workers    │ │
│  │   Providers  │ │  & Utils   │ │  (MediaPipe)     │ │
│  └──────────────┘ └────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │         WebSocket (8080)         │
        │      WebRTC Data Channel         │
        └──────────────────────────────────┘
                           │
        ┌──────────────────┴───────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐            ┌──────────────────┐
│ Signaling Server │            │    Ion-SFU       │
│   (Go - 8080)    │◄──────────►│   (Docker-7000)  │
└──────────────────┘            └──────────────────┘
```

### ディレクトリ構造
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

## コンポーネント設計

### 主要コンポーネント階層
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

### コンポーネント詳細

#### 1. UserNameModal
```typescript
interface UserNameModalProps {
  onSubmit: (userName: string) => void;
  isOpen: boolean;
}

// 機能:
// - ユーザ名入力フォーム
// - バリデーション（3-20文字、英数字）
// - ローカルストレージへの保存
```

#### 2. RoomList
```typescript
interface Room {
  id: string;
  name: string;
  participants: number;
  maxParticipants: number;
}

interface RoomListProps {
  rooms: Room[];
  onRoomSelect: (roomId: string) => void;
}
```

#### 3. SessionView
```typescript
interface SessionViewProps {
  roomId: string;
}

// レイアウト:
// - メイングリッド: リモートビデオ表示
// - サイドパネル: ローカルビデオとコントロール
// - 上部バー: リアクションインジケータ
```

## 状態管理設計

### WebRTCContext
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

### ReactionContext
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

## WebRTC接続フロー

### 1. 初期接続シーケンス
```mermaid
sequenceDiagram
    participant Client
    participant SignalingWS
    participant IonSFU

    Client->>SignalingWS: Connect ws://192.168.3.39:8080/ws
    SignalingWS-->>Client: Connection ACK

    Client->>SignalingWS: {type: "join-room", data: {roomId, userName}}
    SignalingWS->>IonSFU: Forward join request
    IonSFU-->>SignalingWS: Room joined
    SignalingWS-->>Client: {type: "joined-room", data: {clientId}}

    Client->>Client: Create RTCPeerConnection
    Client->>Client: Add local media tracks
    Client->>Client: Create data channel "landmarks"

    Client->>SignalingWS: {type: "offer", data: {sdp}}
    SignalingWS->>IonSFU: Forward offer
    IonSFU-->>SignalingWS: Answer SDP
    SignalingWS-->>Client: {type: "answer", data: {sdp}}

    Client<-->IonSFU: ICE Candidate Exchange
    Client<-->IonSFU: Data Channel Open
```

### 2. データチャネル設定
```typescript
const dataChannelConfig: RTCDataChannelInit = {
  ordered: true,           // 順序保証あり
  maxRetransmits: 3,      // 再送信回数
  label: 'landmarks',     // チャネル識別子
  protocol: 'json',       // データフォーマット
};
```

### 3. リアクションデータ送信フォーマット
```typescript
interface LandmarkMessage {
  type: 'landmark';
  data: {
    v: number;           // リアクション値 (0-100)
    t: number;           // タイムスタンプ
    landmarks?: number[][]; // 顔ランドマーク座標（オプション）
  };
}
```

## MediaPipe FaceLandmarker統合

### 1. Web Worker実装
```typescript
// mediapipe.worker.ts
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker: FaceLandmarker;
let isProcessing = false;

// 初期化
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
  // 表情分析ロジック
  const blendshapes = results.faceBlendshapes?.[0]?.categories || [];

  const smile = blendshapes.find((s: any) => s.categoryName === 'mouthSmileLeft')?.score || 0;
  const eyeOpen = blendshapes.find((s: any) => s.categoryName === 'eyeBlinkLeft')?.score || 0;

  // 簡単な表情スコア計算
  return Math.min(100, Math.max(0, (smile * 100 + (1 - eyeOpen) * 50)));
}
```

### 2. メインスレッドとの連携
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

## エラーハンドリングとリカバリー

### 1. 接続エラー処理
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

### 2. エラー境界実装
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

## セキュリティ設計

### 1. ローカルネットワーク制限
```typescript
// 開発環境でのIP制限
const ALLOWED_HOSTS = [
  '192.168.3.39',
  'localhost',
  '127.0.0.1'
];

function validateHost(url: string): boolean {
  const hostname = new URL(url).hostname;
  return ALLOWED_HOSTS.includes(hostname);
}
```

### 2. 自己署名証明書の処理
```typescript
// 開発環境用の証明書警告対応
if (process.env.NODE_ENV === 'development') {
  // ブラウザの証明書エラーを一時的に無視
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
```

### 3. トークン管理
```typescript
interface JWTPayload {
  roomId: string;
  userId: string;
  exp: number;
}

class TokenManager {
  private token: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  setToken(token: string) {
    this.token = token;
    const payload = this.decodeToken(token);

    // 有効期限の80%で自動更新
    const refreshIn = (payload.exp - Date.now() / 1000) * 0.8 * 1000;
    this.scheduleRefresh(refreshIn);
  }

  private scheduleRefresh(delay: number) {
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, delay);
  }
}
```

## パフォーマンス最適化

### 1. React最適化
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
  // カスタム比較ロジック
  return prevProps.streams.size === nextProps.streams.size;
});

// useMemoによる計算結果のキャッシュ
const averageReaction = useMemo(() => {
  const values = Array.from(reactions.values()).map(r => r.value);
  return values.reduce((a, b) => a + b, 0) / values.length;
}, [reactions]);
```

### 2. WebRTC最適化
```typescript
const sdpConstraints: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

// Simulcast設定
const transceiver = pc.addTransceiver('video', {
  direction: 'sendrecv',
  streams: [localStream],
  sendEncodings: [
    { rid: 'high', maxBitrate: 1000000 },
    { rid: 'medium', maxBitrate: 500000, scaleResolutionDownBy: 2 },
    { rid: 'low', maxBitrate: 200000, scaleResolutionDownBy: 4 }
  ]
});
```

### 3. バンドル最適化
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

## テスト戦略

### 1. ユニットテスト
```typescript
// hooks/useWebRTC.test.ts
describe('useWebRTC', () => {
  let mockPeerConnection: jest.Mocked<RTCPeerConnection>;

  beforeEach(() => {
    mockPeerConnection = createMockPeerConnection();
  });

  test('should establish connection on mount', async () => {
    const { result } = renderHook(() => useWebRTC());

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    expect(mockPeerConnection.createOffer).toHaveBeenCalled();
  });
});
```

### 2. 統合テスト
```typescript
// e2e/session.spec.ts
import { test, expect } from '@playwright/test';

test('完全なセッションフロー', async ({ page, context }) => {
  // 2つのブラウザコンテキストでピア接続をシミュレート
  const page2 = await context.newPage();

  // ユーザー1: 部屋に参加
  await page.goto('http://localhost:5173');
  await page.fill('#username', 'User1');
  await page.click('#join-button');

  // ユーザー2: 同じ部屋に参加
  await page2.goto('http://localhost:5173');
  await page2.fill('#username', 'User2');
  await page2.click('#join-button');

  // 両方のビデオが表示されることを確認
  await expect(page.locator('.remote-video')).toBeVisible();
  await expect(page2.locator('.remote-video')).toBeVisible();

  // リアクション値が更新されることを確認
  await expect(page.locator('.reaction-value')).toHaveText(/\d+/, {
    timeout: 5000
  });
});
```

### 3. パフォーマンステスト
```typescript
// performance/reaction.perf.ts
describe('Reaction Processing Performance', () => {
  test('should process 30 FPS without dropping frames', async () => {
    const processor = new ReactionProcessor();
    const frames = generateTestFrames(30);

    const startTime = performance.now();

    for (const frame of frames) {
      await processor.process(frame);
    }

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    expect(processingTime).toBeLessThan(1000); // 1秒以内
  });
});
```

## デプロイメント設定

### 1. 開発環境設定
```bash
# .env.development
VITE_SIGNALING_URL=ws://192.168.3.39:8080/ws
VITE_ION_SFU_URL=http://192.168.3.39:7000
VITE_STUN_SERVER=stun:stun.l.google.com:19302
VITE_LOG_LEVEL=debug
```

### 2. ビルドスクリプト
```json
// package.json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "jest",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts,tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### 3. Docker設定（オプション）
```dockerfile
# Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

## 監視とログ

### 1. ログ設定
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  debug(message: string, data?: any) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, data);
      this.send('debug', message, data);
    }
  }

  private send(level: string, message: string, data?: any) {
    // 開発環境では、ログをローカルストレージに保存
    if (process.env.NODE_ENV === 'development') {
      const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      logs.push({
        timestamp: Date.now(),
        level,
        message,
        data
      });

      // 最新1000件のみ保持
      if (logs.length > 1000) {
        logs.shift();
      }

      localStorage.setItem('app_logs', JSON.stringify(logs));
    }
  }
}
```

### 2. パフォーマンス監視
```typescript
class PerformanceMonitor {
  private stats = {
    fps: 0,
    latency: 0,
    packetLoss: 0,
    bandwidth: 0
  };

  async collectWebRTCStats(pc: RTCPeerConnection) {
    const stats = await pc.getStats();

    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        this.stats.fps = report.framesPerSecond || 0;
        this.stats.packetLoss = report.packetsLost || 0;
      }

      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        this.stats.latency = report.currentRoundTripTime || 0;
        this.stats.bandwidth = report.availableOutgoingBitrate || 0;
      }
    });

    return this.stats;
  }
}
```

## トラブルシューティングガイド

### よくある問題と解決方法

1. **カメラアクセスエラー**
   - 原因: HTTPSでない、権限未許可
   - 解決: 自己署名証明書の設定、ブラウザ権限の確認

2. **WebSocket接続失敗**
   - 原因: ファイアウォール、ポート制限
   - 解決: ポート8080の開放確認、プロキシ設定

3. **MediaPipeロードエラー**
   - 原因: CORS、CDN接続不可
   - 解決: ローカルホスティング、CORSヘッダー設定

4. **リアクション値が更新されない**
   - 原因: データチャネル未確立、Worker停止
   - 解決: 接続状態確認、Workerログ確認

## 今後の拡張計画

1. **機能拡張**
   - 録画機能の追加
   - チャット機能の実装
   - 画面共有サポート
   - 仮想背景機能

2. **パフォーマンス改善**
   - WebAssemblyによる処理高速化
   - GPUアクセラレーション活用
   - 適応的品質制御

3. **スケーラビリティ**
   - 複数SFUサーバー対応
   - ロードバランシング
   - クラスタリング対応

---

## 実装計画

### フェーズ別実装スケジュール

本プロジェクトは5つのフェーズに分けて段階的に実装を行います。各フェーズは独立してテスト可能な単位として設計されており、段階的な検証とフィードバックの取り込みが可能です。

#### Phase 1: 基盤構築（3日間）

**目的**: プロジェクトの基本構造とコア機能の土台を構築

**Day 1: プロジェクトセットアップ**
```bash
# 1. プロジェクト初期化
npm create vite@latest reaction-sharing-app -- --template react-ts
cd reaction-sharing-app

# 2. 必要な依存関係のインストール
npm install react-router-dom axios
npm install -D @types/react-router-dom tailwindcss postcss autoprefixer
npm install @mediapipe/tasks-vision

# 3. Tailwind CSS設定
npx tailwindcss init -p

# 4. プロジェクト構造の作成
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

**検証方法**:
```bash
npm run dev
# http://localhost:5173 でアプリが起動することを確認
```

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

**テストシナリオ**:
1. アプリ起動 → ユーザー名入力 → 保存確認
2. リロード → 自動ログイン確認
3. 部屋選択 → URL遷移確認

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

**検証コマンド**:
```bash
# バックエンドの起動確認
curl http://192.168.3.39:8080/health

# WebSocket接続テスト（ブラウザコンソール）
const ws = new WebSocket('ws://192.168.3.39:8080/ws');
ws.onopen = () => console.log('Connected');
```

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

**テストチェックリスト**:
- [ ] カメラ/マイク権限の取得
- [ ] ローカルビデオの表示
- [ ] リモートビデオの受信と表示
- [ ] データチャネルでのテストメッセージ送受信

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

### 実装の前提条件と準備

#### 開発環境要件
```yaml
必須ツール:
  - Node.js: v18以上
  - npm: v9以上
  - Git: 最新版
  - Chrome/Edge: 最新版（WebRTC対応）

推奨エディタ:
  - VS Code
  - 拡張機能:
    - ESLint
    - Prettier
    - TypeScript Vue Plugin
    - Tailwind CSS IntelliSense

バックエンド:
  - サーバーIP: 192.168.3.39
  - 必要ポート:
    - 8080: WebSocket
    - 7000: Ion-SFU
    - 6379: Redis（内部）
```

#### 事前準備チェックリスト

**1. ネットワーク確認**
```bash
# バックエンドへの疎通確認
ping 192.168.3.39

# ポート開放確認
nc -zv 192.168.3.39 8080
nc -zv 192.168.3.39 7000

# ヘルスチェック
curl http://192.168.3.39:8080/health
```

**2. 開発証明書の準備（HTTPS用）**
```bash
# 自己署名証明書の生成
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Viteでの使用設定
# vite.config.ts に追加
server: {
  https: {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
  }
}
```

**3. ブラウザ設定**
```text
Chrome flags設定（開発用）:
1. chrome://flags/#unsafely-treat-insecure-origin-as-secure
2. http://192.168.3.39:8080 を追加
3. ブラウザ再起動
```

---

### リスク管理と対策

#### 技術的リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| MediaPipe読み込み失敗 | 高 | CDNフォールバック、ローカルホスティング準備 |
| WebRTC接続不安定 | 高 | TURN サーバー準備、接続リトライ機構 |
| ブラウザ互換性問題 | 中 | Polyfill導入、機能検出実装 |
| パフォーマンス劣化 | 中 | Web Worker活用、フレームレート調整 |
| セキュリティ脆弱性 | 低 | 定期的な依存関係更新、CSP設定 |

#### スケジュールリスク

**バッファー時間の確保**
- 各フェーズに20%のバッファー時間を含む
- 週次レビューでの進捗確認
- 問題発生時の優先順位付け基準

**最小実行可能製品（MVP）の定義**
```text
必須機能（Phase 1-4）:
- ユーザー認証
- 部屋参加
- ビデオ通話

追加機能（Phase 5-6）:
- リアクション検出
- パフォーマンス最適化
```

---

### 開発ワークフロー

#### 日次作業フロー
```bash
# 1. 最新コードの取得
git pull origin main

# 2. 依存関係の確認
npm install

# 3. 開発サーバー起動
npm run dev

# 4. 実装作業

# 5. テスト実行
npm run test

# 6. コミット
git add .
git commit -m "feat: [機能名] の実装"

# 7. プッシュ
git push origin feature/[機能名]
```

#### コーディング規約
```typescript
// ファイル命名規則
- コンポーネント: PascalCase (UserModal.tsx)
- フック: camelCase (useWebRTC.ts)
- ユーティリティ: camelCase (logger.ts)
- 型定義: PascalCase (WebRTCTypes.d.ts)

// インポート順序
1. React関連
2. サードパーティライブラリ
3. 内部モジュール
4. 型定義
5. スタイル

// コメント規約
- TSDoc形式でのドキュメント
- TODO/FIXME の活用
- 複雑なロジックへの説明コメント
```

#### レビューチェックリスト
- [ ] TypeScript型定義の完全性
- [ ] エラーハンドリングの適切性
- [ ] メモリリークの確認
- [ ] アクセシビリティ対応
- [ ] レスポンシブデザイン
- [ ] パフォーマンス影響

---

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

#### 最終納品物
1. **ソースコード**
   - GitHubリポジトリ
   - クリーンなコミット履歴
   - 適切なブランチ管理

2. **ドキュメント**
   - README.md（セットアップ手順）
   - API仕様書
   - トラブルシューティングガイド

3. **テスト成果物**
   - テストケース一覧
   - テスト実行結果
   - パフォーマンステストレポート

4. **デプロイメント資材**
   - Dockerイメージ
   - 環境変数テンプレート
   - デプロイメントスクリプト

---

## 改訂履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|----------|------|---------|--------|
| 1.0.0 | 2025-01-22 | 初版作成 | System |
| 1.1.0 | 2025-01-22 | ローカルネットワークテスト環境対応追加 | System |
| 1.2.0 | 2025-01-22 | 詳細な実装計画を追加 | System |