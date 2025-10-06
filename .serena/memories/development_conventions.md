# 開発規約とコードスタイル

## TypeScript コーディング規約

### 命名規則
- **ファイル名**: PascalCase（コンポーネント）、camelCase（その他）
- **コンポーネント**: PascalCase（`UserNameModal.tsx`）
- **関数・変数**: camelCase（`getUserMedia`）
- **定数**: UPPER_SNAKE_CASE（`MAX_PARTICIPANTS`）
- **型定義**: PascalCase（`EmotionData`）
- **インターフェース**: `I`プレフィックス無し（`WebRTCState`）

### ディレクトリ命名
- **コンポーネント**: 機能別（`lobby/`, `session/`, `common/`）
- **サービス**: 技術領域別（`webrtc/`, `signaling/`, `mediapipe/`）
- **hooks**: `use`プレフィックス（`useWebRTC.ts`）

### インポート順序
1. React関連
2. 外部ライブラリ
3. 内部コンポーネント
4. 内部サービス・ユーティリティ
5. 型定義

```typescript
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { Button } from '@components/common';
import { WebSocketClient } from '@services/signaling';
import { EmotionData } from '@types/reaction';
```

## React コンポーネント規約

### 関数コンポーネント
```typescript
interface Props {
  value: number;
  onChange: (value: number) => void;
}

export const ReactionSlider: React.FC<Props> = ({ value, onChange }) => {
  // フック
  const [isActive, setIsActive] = useState(false);
  
  // イベントハンドラー
  const handleChange = (newValue: number) => {
    onChange(newValue);
  };

  // レンダリング
  return (
    <div className="reaction-slider">
      {/* JSX */}
    </div>
  );
};
```

### カスタムフック
```typescript
export const useWebRTC = (roomId: string) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  
  // ロジック実装
  
  return {
    connectionState,
    connect,
    disconnect,
  };
};
```

## CSS・スタイリング規約

### Tailwind CSS優先
- ユーティリティファーストアプローチ
- カスタムCSSは最小限に
- レスポンシブデザイン対応

```tsx
<div className="flex flex-col md:flex-row gap-4 p-6 bg-gray-100 dark:bg-gray-800">
  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
    接続
  </button>
</div>
```

## エラーハンドリング

### 統一エラー処理
```typescript
try {
  await connectToRoom(roomId);
} catch (error) {
  logger.error('Room connection failed', { error, roomId });
  toast.error('ルームへの接続に失敗しました');
  
  // 適切なフォールバック処理
  handleConnectionError(error);
}
```

### Error Boundary
- コンポーネント単位でのエラー境界設定
- ユーザーフレンドリーなエラー表示
- エラーログの送信

## パフォーマンス最適化

### React最適化
- `memo`による再レンダリング抑制
- `useMemo`, `useCallback`でのメモ化
- 適切なキー設定

### WebRTC最適化
- 適応的ビットレート制御
- 必要に応じた品質調整
- 接続状態の監視

## テスト規約

### テストファイル命名
- `Component.test.tsx` - コンポーネントテスト
- `service.test.ts` - サービステスト
- `util.test.ts` - ユーティリティテスト

### テスト構造
```typescript
describe('ReactionSlider', () => {
  it('should render with initial value', () => {
    // テスト実装
  });
  
  it('should call onChange when value changes', () => {
    // テスト実装
  });
});
```