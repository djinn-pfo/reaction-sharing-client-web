// 基本型定義
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

// 顔の向き（既存から継承）
export interface HeadPose {
  yaw: number;   // -180〜+180度
  pitch: number; // -90〜+90度
  roll: number;  // -180〜+180度
}

// 顔位置（既存から継承・拡張）
export interface FacePosition {
  landmarkCentroid: Point2D;
  boundingBoxCenter: Point2D;
  screenCenter: Point2D;
  distance: number;
}

// 首位置（新規）
export interface NeckPosition extends Point3D {
  confidence: number;
}

// 笑顔特徴量（既存から継承）
export interface SmileFeatures {
  leftReference: number;
  rightReference: number;
  leftDensity: number;
  rightDensity: number;
  mouth: number;
}

// データ品質（新規）
export type DataQuality = 'good' | 'acceptable' | 'poor';

export interface SimpleQualityCheck {
  isFaceDetected: boolean;
  isFaceComplete: boolean;
  isStable: boolean;
  isPoseDetected: boolean;
  overall: DataQuality;
}

// MediaPipe検出結果
export interface DetectionResult {
  faceLandmarks: any[] | null;  // MediaPipeのFaceLandmarks型
  faceTransformation: any | null; // MediaPipeのMatrix型
  poseLandmarks: any[] | null;   // MediaPipeのPoseLandmarks型（Phase 2で実装）
  timestamp: number;
}

// 統一座標系
export interface UnifiedLandmarks {
  faceLandmarks: Point3D[];
  neckPosition: NeckPosition;
  headPose: HeadPose;
  scale: NormalizationScale;
}

export interface NormalizationScale {
  x: number;
  y: number;
  z: number;
}

// 補正データポイント
export interface CorrectionDataPoint {
  features: SmileFeatures;
  headPose: HeadPose;
  neckPosition: NeckPosition;
  quality: DataQuality;
  timestamp: number;
}

// 補正係数
export type CorrectionCoefficients = {
  [K in keyof SmileFeatures]: {
    intercept: number;
    yaw: number;
    pitch: number;
    roll: number;
    rSquared: number;
  };
};

// アプリケーション状態
export type AppPhase = 'initialization' | 'true_value_sampling' | 'data_collection' | 'operation' | 'ready' | 'detecting' | 'error';
export type AppMode = 'calibration' | 'collection' | 'analysis';

// 回帰分析結果（既存から継承）
export interface RegressionResult {
  coefficients: number[];
  rSquared: number;
}

// 境界ボックス
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 収集進捗
export interface CollectionProgress {
  totalPoints: number;
  coverage: number;
  isComplete: boolean;
}

// 3D正規化関連の型定義
export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
  width: number;
  height: number;
  depth: number;
  center: Point3D;
}

export interface NormalizedLandmarks {
  original: Point3D[];
  normalized: Point3D[];
  boundingBox: BoundingBox3D;
  scaleFactor: Point3D;
  rotation: HeadPose;
  translation: Point3D;
}

export interface NormalizationParams {
  targetSize: number;  // デフォルト: 500
  preserveAspectRatio: boolean;  // デフォルト: true
  centerToOrigin: boolean;  // デフォルト: true
  rotateToFront: boolean;  // デフォルト: true
}