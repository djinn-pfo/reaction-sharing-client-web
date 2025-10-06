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

// 3Dバウンディングボックス
export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
  width: number;
  height: number;
  depth: number;
  center: Point3D;
}

// 正規化されたランドマーク
export interface NormalizedLandmarks {
  original: Point3D[];
  normalized: Point3D[];
  boundingBox: BoundingBox3D;
  scaleFactor: Point3D;
  rotation: HeadPose;
  translation: Point3D;
}

// 正規化パラメータ
export interface NormalizationParams {
  targetSize: number;
  preserveAspectRatio: boolean;
  centerToOrigin: boolean;
  rotateToFront: boolean;
}

// MediaPipe検出結果
export interface DetectionResult {
  faceLandmarks: any[] | null;
  faceTransformation: any | null;
  poseLandmarks: any[] | null;
  timestamp: number;
}