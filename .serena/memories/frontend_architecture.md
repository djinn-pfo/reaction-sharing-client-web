# フロントエンド アーキテクチャ

## ディレクトリ構造
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

## アプリケーション構造
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

## 主要データフロー
1. **接続確立**: Client → WebSocket → Signaling → Ion-SFU
2. **感情データ送信**: MediaPipe → DataChannel → Room Broadcast
3. **映像配信**: Producer → Ion-SFU → All Consumers

## 状態管理
- **WebRTCContext**: ピア接続、メディアストリーム管理
- **ReactionContext**: 感情データ管理、リアクション履歴
- **MediaContext**: デバイス管理、ストリーム制御
- **AuthContext**: ユーザー認証、セッション管理