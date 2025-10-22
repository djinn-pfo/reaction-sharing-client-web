# 視線推定学習データセット生成システム - 設計書

## 1. 概要

### 1.1 目的
Webカメラ前の視聴者が画面のどこを注視しているかを推定する機械学習モデルのための学習データセットを生成するWebアプリケーションを構築する。

### 1.2 アプローチ
- MediaPipe Face Landmarkerを使用して顔の特徴量を抽出
- 画面上のターゲット点を順番に注視させるキャリブレーションシステム
- 注視点座標と特徴量のペアを収集してデータセット化

---

## 2. データ要素の詳細設計

### 2.1 収集する特徴量

#### A. 頭部位置座標 (x, y, z)
**説明**: カメラを原点としたワールド座標系における頭部の3D位置

**取得方法**:
- MediaPipe Facial Transformation Matrixの平行移動成分（4列目の上3要素）から取得
- 4x4行列の構造:
  ```
  [r11, r12, r13, tx]
  [r21, r22, r23, ty]
  [r31, r32, r33, tz]
  [  0,   0,   0,  1]
  ```
  ここで、`(tx, ty, tz)`が頭部位置

**座標系**:
- X軸: 左(-) ⇔ 右(+)
- Y軸: 上(-) ⇔ 下(+) ※MediaPipe座標系
- Z軸: カメラに近い(-) ⇔ 遠い(+)

**単位**: ピクセル相当（正規化前）またはメートル（正規化後）

**実装コード例**:
```typescript
function extractHeadPosition(transformMatrix: number[] | Float32Array): Point3D {
  // 4x4行列を想定（16要素）
  return {
    x: transformMatrix[12], // または transformMatrix[3] (列優先の場合)
    y: transformMatrix[13], // または transformMatrix[7]
    z: transformMatrix[14]  // または transformMatrix[11]
  };
}
```

---

#### B. 頭部姿勢角度 (roll, pitch, yaw)
**説明**: カメラに対する頭部の回転角度（オイラー角）

**取得方法**:
1. Facial Transformation Matrixから3x3回転行列を抽出
2. 回転行列をオイラー角に変換

**角度定義**:
- **Yaw (ヨー)**: 左右の回転（水平面での首振り）
  - 左向き: 負の値
  - 右向き: 正の値
  - 範囲: -180° ～ +180°

- **Pitch (ピッチ)**: 上下の回転（縦の首振り）
  - 上向き: 負の値
  - 下向き: 正の値
  - 範囲: -90° ～ +90°

- **Roll (ロール)**: 傾き（首を傾げる動作）
  - 左に傾く: 負の値
  - 右に傾く: 正の値
  - 範囲: -180° ～ +180°

**既存実装**:
```typescript
// reaction-sharing-app/src/utils/rotationUtils.ts
export function extractRotationMatrix(matrix: number[] | Float32Array): number[][] {
  // 4x4 → 3x3 回転行列を抽出
  return [
    [matrix[0], matrix[1], matrix[2]],
    [matrix[4], matrix[5], matrix[6]],
    [matrix[8], matrix[9], matrix[10]]
  ];
}

export function matrixToEulerAnglesMediaPipe(R: number[][]): HeadPose {
  // 回転行列からオイラー角を計算（YZX順序）
  const sy = Math.sqrt(R[0][0] * R[0][0] + R[1][0] * R[1][0]);
  const singular = sy < 1e-6;

  let pitch: number, yaw: number, roll: number;

  if (!singular) {
    pitch = Math.atan2(R[2][1], R[2][2]) * (180 / Math.PI);
    yaw = Math.atan2(-R[2][0], sy) * (180 / Math.PI);
    roll = Math.atan2(R[1][0], R[0][0]) * (180 / Math.PI);
  } else {
    pitch = Math.atan2(-R[1][2], R[1][1]) * (180 / Math.PI);
    yaw = Math.atan2(-R[2][0], sy) * (180 / Math.PI);
    roll = 0;
  }

  return { pitch, yaw, roll };
}
```

**活用ファイル**:
- `reaction-sharing-app/src/core/normalizer/FaceNormalizer.ts`
- `reaction-sharing-app/src/utils/rotationUtils.ts`

---

#### C. 眼球方向特徴量 (u, v) ★重要★

**説明**: 目の中における虹彩の相対位置を正規化した2次元ベクトル

**MediaPipe虹彩ランドマーク**:
- 全478ランドマーク中、最後の10点（468-477）が虹彩
- **左目虹彩中心**: Index **468**
- **右目虹彩中心**: Index **473**
- 左目虹彩周辺: 469-472（上下左右の輪郭）
- 右目虹彩周辺: 474-477（上下左右の輪郭）

**有効化条件**:
```typescript
// MediaPipe Face Landmarker初期化時
const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
  refineLandmarks: true, // ← 必須！これで468点→478点に拡張
  // ...
});
```

**目の主要ランドマークインデックス**:
| 部位 | 左目 | 右目 |
|------|------|------|
| 外側目じり | 33 | 263 |
| 内側目じり | 133 | 362 |
| 上瞼（中央） | 159 | 386 |
| 下瞼（中央） | 145 | 374 |
| 虹彩中心 | 468 | 473 |

**u, v 計算アルゴリズム（採用設計）**:

```typescript
interface EyeGazeVector {
  u: number; // 水平方向: -1.0 (左端) ～ 0.0 (中央) ～ +1.0 (右端)
  v: number; // 垂直方向: -1.0 (上端) ～ 0.0 (中央) ～ +1.0 (下端)
}

/**
 * 眼球方向特徴量 (u, v) を計算
 * @param landmarks - 478個の顔ランドマーク
 * @param eyeType - 'left' または 'right'
 * @returns 正規化された眼球方向ベクトル
 */
function calculateEyeGazeVector(
  landmarks: Point3D[],
  eyeType: 'left' | 'right'
): EyeGazeVector {
  if (landmarks.length < 478) {
    throw new Error('Iris landmarks not available. Ensure refineLandmarks=true');
  }

  // 目のランドマークインデックスを定義
  const indices = eyeType === 'left'
    ? {
        outerCorner: 33,   // 外側目じり
        innerCorner: 133,  // 内側目じり
        upperLid: 159,     // 上瞼
        lowerLid: 145,     // 下瞼
        irisCenter: 468    // 虹彩中心
      }
    : {
        outerCorner: 263,  // 外側目じり
        innerCorner: 362,  // 内側目じり
        upperLid: 386,     // 上瞼
        lowerLid: 374,     // 下瞼
        irisCenter: 473    // 虹彩中心
      };

  // 各ランドマークを取得
  const outerCorner = landmarks[indices.outerCorner];
  const innerCorner = landmarks[indices.innerCorner];
  const upperLid = landmarks[indices.upperLid];
  const lowerLid = landmarks[indices.lowerLid];
  const irisCenter = landmarks[indices.irisCenter];

  // 目の境界ボックスを計算
  const eyeWidth = Math.abs(outerCorner.x - innerCorner.x);
  const eyeHeight = Math.abs(upperLid.y - lowerLid.y);

  // 目の中心座標を計算
  const eyeCenterX = (outerCorner.x + innerCorner.x) / 2;
  const eyeCenterY = (upperLid.y + lowerLid.y) / 2;

  // 虹彩中心の目内相対位置を計算
  const deltaX = irisCenter.x - eyeCenterX;
  const deltaY = irisCenter.y - eyeCenterY;

  // 正規化（-1.0 ～ +1.0）
  const u = (eyeWidth > 0) ? (deltaX / (eyeWidth / 2)) : 0.0;
  const v = (eyeHeight > 0) ? (deltaY / (eyeHeight / 2)) : 0.0;

  // クリッピング（範囲外を制限）
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  return {
    u: clamp(u, -1.0, 1.0),
    v: clamp(v, -1.0, 1.0)
  };
}

/**
 * 両目の平均眼球方向を計算
 * @param landmarks - 478個の顔ランドマーク
 * @returns 平均化された眼球方向ベクトル
 */
function calculateAverageGazeVector(landmarks: Point3D[]): EyeGazeVector {
  const leftEye = calculateEyeGazeVector(landmarks, 'left');
  const rightEye = calculateEyeGazeVector(landmarks, 'right');

  return {
    u: (leftEye.u + rightEye.u) / 2,
    v: (leftEye.v + rightEye.v) / 2
  };
}
```

**座標系の注意点**:
- MediaPipeのY軸は下向きが正（画像座標系）
- v値は下向きが正の値になる
- 必要に応じて `v = -v` で反転可能

**データ品質の向上策**:
1. **両目の平均を使用**: ノイズ低減のため両目の平均値を使用
2. **外れ値検出**: |u| > 1.5 または |v| > 1.5 のデータは除外
3. **まばたき検出**: 目が閉じている場合（上下瞼の距離が閾値以下）はスキップ

---

### 2.2 ラベルデータ（教師信号）

#### 画面注視点座標
**説明**: ユーザーが実際に見ている画面上の座標

**データ構造**:
```typescript
interface GazeLabelData {
  screenX: number;        // 画面X座標（ピクセル）
  screenY: number;        // 画面Y座標（ピクセル）
  screenWidth: number;    // 画面幅（ピクセル）
  screenHeight: number;   // 画面高さ（ピクセル）
  normalizedX: number;    // 正規化X座標 (0.0 - 1.0)
  normalizedY: number;    // 正規化Y座標 (0.0 - 1.0)
  targetId: string;       // ターゲットID（キャリブレーション点の識別子）
  targetType: 'circle' | 'cross' | 'dot'; // ターゲットの種類
}
```

---

### 2.3 統合データ形式

**1件のデータサンプル**:
```typescript
interface GazeDataSample {
  // メタデータ
  timestamp: number;           // Unix timestamp (ms)
  sessionId: string;           // セッションID
  userId: string;              // ユーザーID

  // 入力特徴量
  features: {
    headPosition: {
      x: number;               // カメラ座標系のX
      y: number;               // カメラ座標系のY
      z: number;               // カメラ座標系のZ（深度）
    };
    headPose: {
      roll: number;            // 頭部ロール角（度）
      pitch: number;           // 頭部ピッチ角（度）
      yaw: number;             // 頭部ヨー角（度）
    };
    eyeGaze: {
      u: number;               // 水平方向特徴量 (-1.0 ~ 1.0)
      v: number;               // 垂直方向特徴量 (-1.0 ~ 1.0)
      leftEye: {               // 左目の個別値
        u: number;
        v: number;
      };
      rightEye: {              // 右目の個別値
        u: number;
        v: number;
      };
    };
  };

  // ラベル（教師信号）
  label: {
    screenX: number;           // 注視点X座標（ピクセル）
    screenY: number;           // 注視点Y座標（ピクセル）
    screenWidth: number;       // 画面幅
    screenHeight: number;      // 画面高さ
    normalizedX: number;       // 正規化X (0-1)
    normalizedY: number;       // 正規化Y (0-1)
    targetId: string;          // ターゲットID
  };

  // 生データ（デバッグ用・オプション）
  rawData?: {
    landmarks: Point3D[];      // 全478ランドマーク
    transformMatrix: number[]; // 4x4変換行列
  };
}
```

**エクスポート形式**:
- JSON Lines形式（1行1サンプル、ストリーミング対応）
- CSV形式（表形式、Excel互換）

---

## 3. キャリブレーションシステム設計

### 3.1 キャリブレーションフロー

```
[開始]
  ↓
[ユーザー情報入力]
  - ユーザーID
  - セッションメタデータ（年齢、性別、眼鏡有無など）
  ↓
[カメラ初期化・権限取得]
  ↓
[説明画面]
  - 「画面に表示される点を順番に見てください」
  - 「頭はなるべく動かさずに、目だけで追ってください」
  ↓
[キャリブレーション実行] ←───┐
  1. ターゲット表示           │
  2. 1秒間の注視待ち          │ ループ
  3. データ収集（30フレーム）  │ (N点)
  4. 次のターゲットへ         │
  ↓                         │
[全ターゲット完了？] No ─────┘
  ↓ Yes
[検証フェーズ（オプション）]
  - ランダムな点を表示
  - リアルタイム推定を試行
  ↓
[データエクスポート]
  - JSON/CSV形式でダウンロード
  ↓
[完了]
```

---

### 3.2 ターゲット配置パターン

#### パターンA: 9点グリッド（基本）
```
┌─────────────────────────┐
│ 1       2       3       │
│                         │
│ 4       5       6       │  画面を3x3に分割
│                         │
│ 7       8       9       │
└─────────────────────────┘
```

**座標計算**:
```typescript
const gridPoints = [
  { x: 0.15, y: 0.15 }, // 1: 左上
  { x: 0.50, y: 0.15 }, // 2: 中央上
  { x: 0.85, y: 0.15 }, // 3: 右上
  { x: 0.15, y: 0.50 }, // 4: 左中
  { x: 0.50, y: 0.50 }, // 5: 中央
  { x: 0.85, y: 0.50 }, // 6: 右中
  { x: 0.15, y: 0.85 }, // 7: 左下
  { x: 0.50, y: 0.85 }, // 8: 中央下
  { x: 0.85, y: 0.85 }, // 9: 右下
];
```

#### パターンB: 5点クロス（簡易）
```
┌─────────────────────────┐
│         2               │
│                         │
│ 1       5       3       │  四隅+中央
│                         │
│         4               │
└─────────────────────────┘
```

#### パターンC: 25点高密度グリッド（詳細）
```
5x5グリッド（より高精度な学習データ収集用）
```

---

### 3.3 ターゲット表示仕様

**視覚デザイン**:
```typescript
interface CalibrationTarget {
  type: 'expanding-circle' | 'blinking-dot' | 'crosshair';
  size: number;              // 直径（ピクセル）
  color: string;             // 色（例: '#FF0000'）
  animationDuration: number; // アニメーション時間（ms）
}
```

**推奨設定**:
- タイプ: `expanding-circle`（注意を引きやすい）
- サイズ: 20px（初期）→ 40px（拡大）
- 色: 赤 (`#FF0000`) または黄色 (`#FFD700`)
- アニメーション: 500ms かけて拡大 → 500ms 静止

**表示シーケンス**:
```typescript
async function showCalibrationTarget(targetIndex: number, position: {x: number, y: number}) {
  // 1. ターゲット表示
  displayTarget(position.x * screenWidth, position.y * screenHeight);

  // 2. 拡大アニメーション（500ms）
  await animateExpand(500);

  // 3. 安定待ち（500ms）
  await delay(500);

  // 4. データ収集開始（1000ms、約30フレーム）
  const samples = await collectDataSamples(1000, {
    targetId: `target_${targetIndex}`,
    targetX: position.x,
    targetY: position.y
  });

  // 5. ターゲット消去
  hideTarget();

  // 6. 次のターゲットへの移動時間（300ms）
  await delay(300);

  return samples;
}
```

---

### 3.4 データ収集パラメータ

| パラメータ | 値 | 説明 |
|-----------|---|------|
| ターゲット点数 | 9点（基本） | グリッドパターンA |
| 1点あたりの収集時間 | 1000ms | 十分な注視時間を確保 |
| サンプリングレート | 30fps | MediaPipeの処理速度に合わせる |
| 1点あたりのサンプル数 | 約30フレーム | 1000ms × 30fps |
| 総データ数 | 約270サンプル | 9点 × 30フレーム |
| セッション時間 | 約20秒 | 移動時間含む |

---

## 4. 実装ステップ

### Phase 1: 基盤構築（既存機能の活用）
- [ ] 既存の`useMediaPipe`フックを確認・拡張
- [ ] Facial Transformation Matrixの取得確認
- [ ] 虹彩ランドマーク（478点）の取得テスト
- [ ] 頭部位置・姿勢の抽出ロジックを実装

### Phase 2: 眼球方向特徴量の実装
- [ ] `calculateEyeGazeVector()` 関数を実装
- [ ] 左右の目の個別計算
- [ ] 両目の平均計算
- [ ] リアルタイム可視化（デバッグ用）

### Phase 3: キャリブレーション画面の実装
- [ ] ターゲット表示コンポーネント作成
- [ ] アニメーション実装（expanding circle）
- [ ] グリッドパターン生成ロジック
- [ ] シーケンス制御（ターゲット順次表示）

### Phase 4: データ収集システム
- [ ] データサンプル収集ロジック
- [ ] IndexedDBへの保存機能
- [ ] リアルタイムデータ検証
- [ ] エクスポート機能（JSON/CSV）

### Phase 5: UI/UX改善
- [ ] プログレスバー表示
- [ ] ユーザー情報入力フォーム
- [ ] 説明画面・ガイダンス
- [ ] データ可視化ダッシュボード

### Phase 6: データ品質管理
- [ ] 外れ値検出・除外
- [ ] まばたき検出
- [ ] データ統計表示（分布、範囲など）
- [ ] 再キャリブレーション機能

---

## 5. 技術スタック

### フロントエンド
- **React 19.1.1**: UIフレームワーク
- **TypeScript 5.8.3**: 型安全な開発
- **Vite 7.1.7**: 高速ビルド
- **Tailwind CSS 3.4.0**: スタイリング

### 表情認識・AI
- **MediaPipe Face Landmarker**: 478点のランドマーク検出
- **@mediapipe/tasks-vision 0.10.22**: WebAssembly版

### 3D可視化（オプション）
- **Three.js**: デバッグ用3D表示
- **@react-three/fiber**: React統合

### データ保存
- **IndexedDB**: ブラウザ内データベース
- **localForage**: IndexedDBのラッパー（簡易化）

---

## 6. ファイル構成案

```
gazeEstimationLearningDataGeneration/
├── src/
│   ├── components/
│   │   ├── calibration/
│   │   │   ├── CalibrationView.tsx       # メイン画面
│   │   │   ├── CalibrationTarget.tsx     # ターゲット表示
│   │   │   ├── ProgressBar.tsx           # 進捗表示
│   │   │   └── InstructionModal.tsx      # 説明モーダル
│   │   ├── dataExport/
│   │   │   ├── ExportPanel.tsx           # エクスポートUI
│   │   │   └── DataVisualization.tsx     # データ可視化
│   │   └── common/
│   │       ├── Button.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useGazeCalibration.ts         # キャリブレーション制御
│   │   ├── useGazeFeatureExtractor.ts    # 特徴量抽出
│   │   └── useGazeDataCollector.ts       # データ収集
│   ├── services/
│   │   ├── gazeEstimation/
│   │   │   ├── FeatureExtractor.ts       # u,v計算ロジック
│   │   │   ├── HeadPoseCalculator.ts     # roll,pitch,yaw計算
│   │   │   └── DataCollector.ts          # データ収集管理
│   │   └── storage/
│   │       └── GazeDataStorage.ts        # IndexedDB操作
│   ├── types/
│   │   └── gaze.ts                       # 型定義
│   └── utils/
│       ├── gazeVectorCalculation.ts      # u,v計算関数
│       └── dataExport.ts                 # JSON/CSV変換
├── documents/
│   └── gaze_estimation_dataset_design.md # この設計書
└── README.md
```

---

## 7. 座標系と変換の注意事項

### 7.1 MediaPipe座標系
- **X軸**: 左 → 右（正の方向）
- **Y軸**: 上 → 下（正の方向）※画像座標系
- **Z軸**: カメラに近い → 遠い（正の方向）

### 7.2 通常3D座標系
- **X軸**: 左 → 右（正の方向）
- **Y軸**: 下 → 上（正の方向）※通常座標系
- **Z軸**: カメラに近い → 遠い（正の方向）

### 7.3 変換コード（既存実装）
```typescript
// reaction-sharing-app/src/core/normalizer/FaceNormalizer.ts (187-191行目)
const coordinateAdjustedMatrix = [
  [rotationMatrix[0][0], -rotationMatrix[0][1], rotationMatrix[0][2]],
  [-rotationMatrix[1][0], rotationMatrix[1][1], -rotationMatrix[1][2]],
  [rotationMatrix[2][0], -rotationMatrix[2][1], rotationMatrix[2][2]]
];
```

---

## 8. データ品質保証

### 8.1 バリデーションルール
1. **頭部姿勢の範囲チェック**:
   - |yaw| < 45° （正面±45度以内）
   - |pitch| < 30° （上下±30度以内）
   - |roll| < 20° （傾き±20度以内）

2. **眼球方向の範囲チェック**:
   - -1.5 < u < 1.5
   - -1.5 < v < 1.5
   - 範囲外は外れ値として除外

3. **まばたき検出**:
   ```typescript
   function isBlinking(landmarks: Point3D[], eyeType: 'left' | 'right'): boolean {
     const indices = eyeType === 'left'
       ? { upper: 159, lower: 145 }
       : { upper: 386, lower: 374 };

     const upperLid = landmarks[indices.upper];
     const lowerLid = landmarks[indices.lower];
     const eyeOpenness = Math.abs(upperLid.y - lowerLid.y);

     return eyeOpenness < BLINK_THRESHOLD; // 閾値: 5px程度
   }
   ```

### 8.2 統計情報の記録
各セッションで以下を記録：
- 総サンプル数
- 有効サンプル数（バリデーション通過）
- 各特徴量の平均・標準偏差・範囲
- ターゲットごとのサンプル数

---

## 9. 今後の拡張可能性

### 9.1 追加特徴量候補
- 瞳孔径（虹彩周辺ランドマークから推定）
- 目の開閉度（Eye Aspect Ratio）
- まばたき頻度
- 両目の輻輳角（converge angle）

### 9.2 キャリブレーション改善
- 動的ターゲット（移動する点）
- ランダム配置
- マルチセッション対応（複数人のデータ収集）

### 9.3 リアルタイム推定
- 収集したデータで簡易モデルを学習
- ブラウザ内でTensorFlow.js推論
- リアルタイム視線可視化

---

## 10. 参考文献

- [MediaPipe Face Landmarker Documentation](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)
- [MediaPipe 3D Face Transform](https://developers.googleblog.com/en/mediapipe-3d-face-transform/)
- [MediaPipe Iris Tracking](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/iris.md)
- [Eye Tracking: A Comprehensive Guide to Methods and Measures](https://imotions.com/blog/learning/research-fundamentals/eye-tracking/)

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-17 | 1.0.0 | 初版作成 |
