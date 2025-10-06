# WebSocket接続問題の分析と解決記録

## 概要

React + TypeScript + ViteアプリケーションにおけるWebSocket接続の実装で発生した問題と、その解決プロセスを記録します。この問題解決の過程で、React Strict Mode、stale closure、非同期状態管理など、複数の技術的課題が明らかになりました。

## 問題の症状

### 初期症状
- WebSocket接続が1006エラーで失敗
- `WebSocket is closed before the connection is established` 警告
- ブラウザコンソールでの直接接続は成功するが、アプリケーション内では失敗

### 発展症状
- WebSocket接続は成功するが、React stateが更新されない
- 接続待機タイムアウトが発生
- ルーム参加が失敗

## 根本的な原因

### 1. React Strict Modeによる重複実行
**問題**: 開発モードでReact Strict Modeが有効な場合、useEffectが意図的に2回実行され、WebSocket接続の重複とクリーンアップが発生

**症状**:
```
doubleInvokeEffectsOnFiber
WebSocket connection to 'ws://...' failed: WebSocket is closed before the connection is established.
```

**解決策**:
- 一時的にStrictModeを無効化
- useSignalingでWebSocketClientの重複作成を防ぐチェック
- SessionViewで初期化フラグによる重複実行防止

```typescript
// useSignaling.ts
useEffect(() => {
  // React Strict Modeでの重複実行を防ぐ
  if (wsClientRef.current) {
    console.log('WebSocket client already exists, skipping initialization');
    return;
  }
  // WebSocketクライアント作成...
}, []);
```

### 2. Stale Closure問題
**問題**: useEffectやuseCallbackで参照している変数が、初期値のままキャプチャされる

**症状**:
- WebSocketClientの状態は`connected`
- React stateの`connectionState`は`connected`に更新
- しかし接続待機関数では`connectionState: 'disconnected'`を参照

**解決策**:
- WebSocket状態を直接取得するAPIを提供
- 依存配列の適切な管理

```typescript
// useSignaling.ts - WebSocket状態取得APIを追加
const getWebSocketState = useCallback((): ConnectionState | null => {
  return wsClientRef.current?.getConnectionState() || null;
}, []);

// SessionView.tsx - stale closureを回避
const waitForConnection = useCallback(async (timeout = 5000) => {
  // 直接WebSocket状態をチェック
  const wsState = getWebSocketState();
  if (wsState === 'connected') {
    resolve(true);
  }
}, []); // 空の依存配列で再作成を防ぐ
```

### 3. 非同期状態の同期タイミング
**問題**: WebSocket接続成功とReact state更新のタイミングのずれ

**解決策**: ポーリングによる状態確認

```typescript
const checkConnection = () => {
  const wsState = getWebSocketState();
  const isWsConnected = wsState === 'connected';

  if (isWsConnected) {
    resolve(true);
    return;
  }

  setTimeout(checkConnection, 100); // 100ms間隔でポーリング
};
```

## 技術的な学び

### React Strict Modeの影響
- 開発モードでuseEffectが2回実行される仕様
- WebSocketのような外部リソースとの接続で問題になりやすい
- 重複実行防止のガード条件が必要

### Stale Closureの対策
- useCallbackの依存配列の適切な管理
- refを使った最新状態へのアクセス
- 状態取得用のAPIを提供

### WebSocket接続の状態管理
- クライアント側の状態とReact stateの両方を管理
- 直接的な状態確認方法の重要性
- 非同期処理のタイミング調整

## 最終的な解決策

### 1. React Strict Mode対応
```typescript
// main.tsx - 一時的にStrictModeを無効化
createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <App />
  // </StrictMode>,
)
```

### 2. useSignalingの改善
```typescript
// 重複実行防止
useEffect(() => {
  if (wsClientRef.current) {
    return; // 既に存在する場合はスキップ
  }
  // WebSocketクライアント作成
}, []);

// WebSocket状態取得API
const getWebSocketState = useCallback(() => {
  return wsClientRef.current?.getConnectionState() || null;
}, []);
```

### 3. SessionViewの改善
```typescript
// stale closureを回避した接続待機
const waitForConnection = useCallback(async (timeout = 5000) => {
  return new Promise((resolve) => {
    const checkConnection = () => {
      const wsState = getWebSocketState(); // 直接取得
      if (wsState === 'connected') {
        resolve(true);
        return;
      }
      setTimeout(checkConnection, 100);
    };
    checkConnection();
  });
}, []); // 空の依存配列
```

## デバッグのベストプラクティス

### 1. 詳細なログ出力
```typescript
console.log('🔄 Connection state changed to:', state);
console.log('🔍 React setConnectionState called with:', state);
console.log('✅ WebSocket connected successfully');
```

### 2. 状態の可視化
```typescript
console.log('🔄 接続待機中:', {
  wsState,
  isWsConnected,
  connectionState,
  isConnected,
  timeElapsed: Date.now() - startTime
});
```

### 3. 段階的な問題の分離
1. WebSocket接続の成功確認
2. React state更新の確認
3. UI反映の確認

## 今後の改善点

### 1. 本格的なStrictMode対応
一時的な無効化ではなく、適切な依存配列管理とクリーンアップで対応

### 2. 状態管理の統一
WebSocketClientとReact stateの一元的な管理

### 3. テスト環境の整備
WebSocket接続のモックとテスト自動化

## 参考資料
- [React Strict Mode - React公式ドキュメント](https://react.dev/reference/react/StrictMode)
- [useEffect依存配列のベストプラクティス](https://react.dev/learn/synchronizing-with-effects)
- [WebSocket API - MDN](https://developer.mozilla.org/ja/docs/Web/API/WebSocket)

---

このドキュメントは、実際の問題解決プロセスを通じて得られた知見をまとめたものです。同様の問題に遭遇した際の参考資料として活用してください。