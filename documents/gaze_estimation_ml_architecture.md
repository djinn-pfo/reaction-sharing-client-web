# 視線推定機械学習モデル アーキテクチャ設計

## 概要

外付けWebカメラの位置が可変である環境に対応するため、**転移学習**を活用したEnd-to-End深層学習モデルを採用する。

### 基本戦略

1. **ベースモデル訓練**: 多様なユーザー・環境から収集した大規模データセットで基盤モデルを学習
2. **ユーザー適応**: 実運用時に少数サンプル（20-50個）でファインチューニングを実施し、各ユーザーのカメラ配置に適応

この方式により、ユーザーごとの長時間キャリブレーションを回避しつつ高精度な推定を実現する。

---

## モデルアーキテクチャ

### End-to-End + Frozen Lower Layers 方式

下位層（特徴抽出）を共有し、上位層（ユーザー適応）のみをファインチューニングする。

```
入力層 (16次元)
    ↓
[共有層 - ベース訓練後に凍結]
    ↓
shared_dense1 (128ユニット, ReLU, Dropout 0.3)
    ↓
shared_dense2 (64ユニット, ReLU, Dropout 0.3)
    ↓
shared_dense3 (32ユニット, ReLU, Dropout 0.2)
    ↓
[適応層 - ファインチューニング時に訓練可能]
    ↓
adapter_dense1 (16ユニット, ReLU)
    ↓
adapter_dense2 (8ユニット, ReLU)
    ↓
出力層 (2ユニット, Linear)
    ↓
出力: (screen_x, screen_y) 正規化座標 [0, 1]
```

### レイヤー構成詳細

| レイヤー名 | ユニット数 | 活性化関数 | Dropout | 訓練フェーズ |
|-----------|----------|----------|---------|------------|
| shared_dense1 | 128 | ReLU | 0.3 | ベースのみ |
| shared_dense2 | 64 | ReLU | 0.3 | ベースのみ |
| shared_dense3 | 32 | ReLU | 0.2 | ベースのみ |
| adapter_dense1 | 16 | ReLU | - | ベース+FT |
| adapter_dense2 | 8 | ReLU | - | ベース+FT |
| output | 2 | Linear | - | ベース+FT |

**FT = Fine-Tuning**

---

## 入力特徴量 (16次元)

### 基本特徴 (10次元)

| 特徴量 | 次元数 | 説明 |
|-------|-------|------|
| 頭部位置 | 3 | (x, y, z) カメラ座標系 |
| 頭部姿勢 | 3 | (roll, pitch, yaw) 度数法 |
| 眼球方向 | 4 | (left_u, left_v, right_u, right_v) 正規化 [-1, 1] |

### 追加特徴 (6次元)

| 特徴量 | 次元数 | 計算方法 |
|-------|-------|---------|
| 両眼平均視線 | 2 | (avg_u, avg_v) = ((left_u + right_u)/2, (left_v + right_v)/2) |
| 頭部距離 | 1 | head_distance = sqrt(x² + y² + z²) |
| 頭部方向ベクトル | 3 | (forward_x, forward_y, forward_z) = Rotation Matrix × [0, 0, 1]ᵀ |

**合計: 16次元**

---

## 実装コード

### 1. モデル構築 (TensorFlow.js)

```typescript
import * as tf from '@tensorflow/tfjs';

interface ModelConfig {
  inputDim: number;
  sharedLayers: number[];
  adapterLayers: number[];
  dropoutRates: number[];
}

const DEFAULT_CONFIG: ModelConfig = {
  inputDim: 16,
  sharedLayers: [128, 64, 32],
  adapterLayers: [16, 8],
  dropoutRates: [0.3, 0.3, 0.2]
};

/**
 * ベースモデルを構築
 */
function buildBaseModel(config: ModelConfig = DEFAULT_CONFIG): tf.LayersModel {
  const input = tf.input({ shape: [config.inputDim], name: 'input' });

  // 共有層 (Shared Layers) - ファインチューニング時に凍結
  let x = tf.layers.dense({
    units: config.sharedLayers[0],
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
    name: 'shared_dense1'
  }).apply(input) as tf.SymbolicTensor;

  x = tf.layers.dropout({ rate: config.dropoutRates[0], name: 'shared_dropout1' })
    .apply(x) as tf.SymbolicTensor;

  x = tf.layers.dense({
    units: config.sharedLayers[1],
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
    name: 'shared_dense2'
  }).apply(x) as tf.SymbolicTensor;

  x = tf.layers.dropout({ rate: config.dropoutRates[1], name: 'shared_dropout2' })
    .apply(x) as tf.SymbolicTensor;

  x = tf.layers.dense({
    units: config.sharedLayers[2],
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
    name: 'shared_dense3'
  }).apply(x) as tf.SymbolicTensor;

  x = tf.layers.dropout({ rate: config.dropoutRates[2], name: 'shared_dropout3' })
    .apply(x) as tf.SymbolicTensor;

  // 適応層 (Adapter Layers) - ファインチューニング時に訓練可能
  x = tf.layers.dense({
    units: config.adapterLayers[0],
    activation: 'relu',
    name: 'adapter_dense1'
  }).apply(x) as tf.SymbolicTensor;

  x = tf.layers.dense({
    units: config.adapterLayers[1],
    activation: 'relu',
    name: 'adapter_dense2'
  }).apply(x) as tf.SymbolicTensor;

  // 出力層: (screen_x, screen_y) 正規化座標
  const output = tf.layers.dense({
    units: 2,
    activation: 'linear',
    name: 'output'
  }).apply(x) as tf.SymbolicTensor;

  const model = tf.model({ inputs: input, outputs: output });

  return model;
}
```

### 2. ベースモデル訓練

```typescript
/**
 * 大規模データセットでベースモデルを訓練
 */
async function trainBaseModel(
  model: tf.LayersModel,
  trainData: { features: number[][], labels: number[][] },
  validationData: { features: number[][], labels: number[][] }
): Promise<void> {
  // データをTensorに変換
  const xTrain = tf.tensor2d(trainData.features);
  const yTrain = tf.tensor2d(trainData.labels);
  const xVal = tf.tensor2d(validationData.features);
  const yVal = tf.tensor2d(validationData.labels);

  // コンパイル
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  // 訓練
  const history = await model.fit(xTrain, yTrain, {
    epochs: 100,
    batchSize: 32,
    validationData: [xVal, yVal],
    callbacks: [
      tf.callbacks.earlyStopping({ monitor: 'val_loss', patience: 10 }),
      tf.callbacks.reduceLROnPlateau({ monitor: 'val_loss', factor: 0.5, patience: 5 })
    ],
    verbose: 1
  });

  // メモリ解放
  xTrain.dispose();
  yTrain.dispose();
  xVal.dispose();
  yVal.dispose();

  console.log('ベースモデル訓練完了');
  console.log('Final training MAE:', history.history.mae[history.history.mae.length - 1]);
  console.log('Final validation MAE:', history.history.val_mae[history.history.val_mae.length - 1]);
}
```

### 3. 共有層の凍結 + ファインチューニング

```typescript
/**
 * 共有層を凍結してファインチューニング用に準備
 */
function freezeSharedLayers(model: tf.LayersModel): void {
  const sharedLayerNames = [
    'shared_dense1', 'shared_dropout1',
    'shared_dense2', 'shared_dropout2',
    'shared_dense3', 'shared_dropout3'
  ];

  model.layers.forEach(layer => {
    if (sharedLayerNames.includes(layer.name)) {
      layer.trainable = false;
    }
  });

  console.log('共有層を凍結しました');
}

/**
 * ユーザー固有データでファインチューニング
 */
async function fineTuneForUser(
  model: tf.LayersModel,
  userData: { features: number[][], labels: number[][] }
): Promise<void> {
  // 共有層を凍結
  freezeSharedLayers(model);

  // 再コンパイル (学習率を下げる)
  model.compile({
    optimizer: tf.train.adam(0.0001), // 学習率を1/10に
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  const xUser = tf.tensor2d(userData.features);
  const yUser = tf.tensor2d(userData.labels);

  // ファインチューニング (小エポック数)
  await model.fit(xUser, yUser, {
    epochs: 30,
    batchSize: 8,
    shuffle: true,
    callbacks: [
      tf.callbacks.earlyStopping({ monitor: 'loss', patience: 5 })
    ],
    verbose: 1
  });

  xUser.dispose();
  yUser.dispose();

  console.log('ファインチューニング完了');
}
```

### 4. 特徴量エンジニアリング

```typescript
import type { GazeDataSample } from '../types/gaze';

/**
 * 16次元特徴ベクトルを生成
 */
function extractFeatures(sample: GazeDataSample): number[] {
  const { headPosition, headPose, eyeGaze } = sample.features;

  // 基本特徴 (10次元)
  const basicFeatures = [
    headPosition.x,
    headPosition.y,
    headPosition.z,
    headPose.roll,
    headPose.pitch,
    headPose.yaw,
    eyeGaze.leftEye.u,
    eyeGaze.leftEye.v,
    eyeGaze.rightEye.u,
    eyeGaze.rightEye.v
  ];

  // 追加特徴 (6次元)

  // 1. 両眼平均視線 (2次元)
  const avgU = (eyeGaze.leftEye.u + eyeGaze.rightEye.u) / 2;
  const avgV = (eyeGaze.leftEye.v + eyeGaze.rightEye.v) / 2;

  // 2. 頭部距離 (1次元)
  const headDistance = Math.sqrt(
    headPosition.x ** 2 + headPosition.y ** 2 + headPosition.z ** 2
  );

  // 3. 頭部方向ベクトル (3次元)
  // オイラー角から回転行列を再構築して前方ベクトルを計算
  const rollRad = (headPose.roll * Math.PI) / 180;
  const pitchRad = (headPose.pitch * Math.PI) / 180;
  const yawRad = (headPose.yaw * Math.PI) / 180;

  // 簡易的な前方ベクトル (yaw, pitch主体)
  const forwardX = Math.sin(yawRad) * Math.cos(pitchRad);
  const forwardY = -Math.sin(pitchRad);
  const forwardZ = Math.cos(yawRad) * Math.cos(pitchRad);

  const additionalFeatures = [
    avgU,
    avgV,
    headDistance,
    forwardX,
    forwardY,
    forwardZ
  ];

  return [...basicFeatures, ...additionalFeatures];
}

/**
 * データセット全体から特徴量行列とラベル行列を生成
 */
function prepareDataset(samples: GazeDataSample[]): {
  features: number[][],
  labels: number[][]
} {
  const features: number[][] = [];
  const labels: number[][] = [];

  samples.forEach(sample => {
    const featureVector = extractFeatures(sample);
    const labelVector = [
      sample.label.normalizedX,
      sample.label.normalizedY
    ];

    features.push(featureVector);
    labels.push(labelVector);
  });

  return { features, labels };
}
```

---

## 訓練データ要件

### ベースモデル訓練

- **データ量**: 3,000 ~ 10,000 サンプル
- **ユーザー数**: 10 ~ 50 人
- **カメラ配置**: 多様な配置 (上部、側面、下部、距離変動)
- **キャリブレーションパターン**: 9点グリッド × 30サンプル/点
- **収集環境**: 異なる照明条件・背景・姿勢

### ファインチューニング

- **データ量**: 20 ~ 50 サンプル/ユーザー
- **キャリブレーションパターン**: 5点クイック校正
- **収集時間**: 約10秒 (5点 × 2秒/点)

---

## クイックキャリブレーション (5点パターン)

ファインチューニング用の軽量キャリブレーション。

```typescript
// 5点パターン: 四隅 + 中央
const QUICK_CALIBRATION_TARGETS = [
  { x: 0.50, y: 0.50, id: 'center' },   // 中央
  { x: 0.15, y: 0.15, id: 'top_left' },    // 左上
  { x: 0.85, y: 0.15, id: 'top_right' },   // 右上
  { x: 0.15, y: 0.85, id: 'bottom_left' }, // 左下
  { x: 0.85, y: 0.85, id: 'bottom_right' } // 右下
];

const QUICK_COLLECTION_DURATION_MS = 500; // 0.5秒/点
const QUICK_FRAME_INTERVAL_MS = 50; // 20fps
// → 約10サンプル/点 × 5点 = 50サンプル
```

---

## モデル保存・読み込み

```typescript
/**
 * ベースモデルを保存
 */
async function saveBaseModel(model: tf.LayersModel, path: string): Promise<void> {
  await model.save(`file://${path}`);
  console.log('ベースモデルを保存:', path);
}

/**
 * ベースモデルを読み込み
 */
async function loadBaseModel(path: string): Promise<tf.LayersModel> {
  const model = await tf.loadLayersModel(`file://${path}/model.json`);
  console.log('ベースモデルを読み込み:', path);
  return model;
}

/**
 * ファインチューニング済みモデルを保存
 */
async function saveFineTunedModel(
  model: tf.LayersModel,
  userId: string,
  path: string
): Promise<void> {
  const userModelPath = `${path}/user_${userId}`;
  await model.save(`file://${userModelPath}`);
  console.log('ユーザーモデルを保存:', userModelPath);
}

/**
 * ファインチューニング済みモデルを読み込み
 */
async function loadFineTunedModel(
  userId: string,
  path: string
): Promise<tf.LayersModel> {
  const userModelPath = `${path}/user_${userId}/model.json`;
  const model = await tf.loadLayersModel(`file://${userModelPath}`);
  console.log('ユーザーモデルを読み込み:', userModelPath);
  return model;
}
```

---

## 推論 (本番運用)

```typescript
/**
 * リアルタイム視線推定
 */
async function predictGazePoint(
  model: tf.LayersModel,
  currentSample: GazeDataSample
): Promise<{ x: number, y: number }> {
  const features = extractFeatures(currentSample);
  const inputTensor = tf.tensor2d([features]); // shape: [1, 16]

  const prediction = model.predict(inputTensor) as tf.Tensor;
  const [normalizedX, normalizedY] = await prediction.data();

  // メモリ解放
  inputTensor.dispose();
  prediction.dispose();

  // ピクセル座標に変換
  return {
    x: normalizedX * window.innerWidth,
    y: normalizedY * window.innerHeight
  };
}
```

---

## ブラウザ対応 (TensorFlow.js)

### WebGL バックエンド推奨

```typescript
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

async function initializeTensorFlow(): Promise<void> {
  await tf.setBackend('webgl');
  await tf.ready();
  console.log('TensorFlow.js backend:', tf.getBackend());
}
```

### モデルのIndexedDB保存

```typescript
// ベースモデルをブラウザに保存
await model.save('indexeddb://gaze-estimation-base-model');

// ブラウザから読み込み
const model = await tf.loadLayersModel('indexeddb://gaze-estimation-base-model');
```

---

## 評価指標

### 精度評価

- **MAE (Mean Absolute Error)**: ピクセル単位の平均誤差
- **Euclidean Distance**: 予測点と正解点のユークリッド距離
- **角度誤差**: 視覚角度での誤差 (度)

```typescript
/**
 * ピクセル単位のMAEを計算
 */
function calculateMAE(
  predictions: { x: number, y: number }[],
  labels: { x: number, y: number }[]
): number {
  const errors = predictions.map((pred, i) => {
    const dx = Math.abs(pred.x - labels[i].x);
    const dy = Math.abs(pred.y - labels[i].y);
    return (dx + dy) / 2;
  });

  return errors.reduce((sum, e) => sum + e, 0) / errors.length;
}

/**
 * ユークリッド距離の平均を計算
 */
function calculateEuclideanDistance(
  predictions: { x: number, y: number }[],
  labels: { x: number, y: number }[]
): number {
  const distances = predictions.map((pred, i) => {
    const dx = pred.x - labels[i].x;
    const dy = pred.y - labels[i].y;
    return Math.sqrt(dx ** 2 + dy ** 2);
  });

  return distances.reduce((sum, d) => sum + d, 0) / distances.length;
}
```

### 目標精度

- **ベースモデル**: MAE < 100px (FullHD画面)
- **ファインチューニング後**: MAE < 50px (FullHD画面)
- **理想**: < 30px (約1.5度の視覚角度)

---

## 実装フロー

### フェーズ1: データ収集 (完了)

- ✅ 9点グリッドキャリブレーションWebアプリ完成
- ✅ MediaPipe統合
- ✅ JSONデータエクスポート

### フェーズ2: ベースモデル訓練 (次ステップ)

1. 複数ユーザーから9点キャリブレーションデータ収集
2. データ前処理・正規化
3. 訓練/検証データ分割 (80/20)
4. モデル訓練 (100エポック、Early Stopping)
5. モデル評価・保存

### フェーズ3: ファインチューニング実装

1. 5点クイックキャリブレーション機能追加
2. ベースモデル読み込み機能
3. 共有層凍結ロジック
4. ファインチューニング実行
5. ユーザー別モデル保存

### フェーズ4: リアルタイム推論

1. WebRTCカメラストリーム統合
2. MediaPipe連続処理
3. モデル推論パイプライン
4. 視線ポイント可視化UI

---

## 参考文献

- [TensorFlow.js Transfer Learning Guide](https://www.tensorflow.org/js/tutorials/transfer/what_is_transfer_learning)
- [MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)
- [Fine-tuning Best Practices](https://www.tensorflow.org/tutorials/images/transfer_learning)

---

## ライセンス

MIT
