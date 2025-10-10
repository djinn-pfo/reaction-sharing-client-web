import type {
  Point3D,
  BoundingBox3D,
  NormalizedLandmarks,
  NormalizationParams,
  HeadPose
} from '../../types';
import {
  extractRotationMatrix,
  matrixToEulerAnglesMediaPipe,
  invertMatrix3x3,
  applyRotationToPoints,
} from '../../utils/rotationUtils';

export class FaceNormalizer {
  private params: NormalizationParams;
  private lastPoseLogTime: number = 0;

  constructor(params?: Partial<NormalizationParams>) {
    this.params = {
      targetSize: 500,
      preserveAspectRatio: true,
      centerToOrigin: true,
      rotateToFront: true,
      ...params
    };
  }

  /**
   * 3Dバウンディングボックスを計算
   */
  calculateBoundingBox(landmarks: Point3D[]): BoundingBox3D {
    if (landmarks.length === 0) {
      throw new Error('No landmarks provided');
    }

    const xs = landmarks.map(p => p.x);
    const ys = landmarks.map(p => p.y);
    const zs = landmarks.map(p => p.z);

    const min = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      z: Math.min(...zs)
    };

    const max = {
      x: Math.max(...xs),
      y: Math.max(...ys),
      z: Math.max(...zs)
    };

    const width = max.x - min.x;
    const height = max.y - min.y;
    const depth = max.z - min.z;

    const center = {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2
    };

    return { min, max, width, height, depth, center };
  }

  /**
   * 座標を原点中心に移動
   */
  centerToOrigin(landmarks: Point3D[]): { points: Point3D[], translation: Point3D } {
    const bbox = this.calculateBoundingBox(landmarks);
    const translation = bbox.center;

    const centeredPoints = landmarks.map(point => ({
      x: point.x - translation.x,
      y: point.y - translation.y,
      z: point.z - translation.z
    }));

    return { points: centeredPoints, translation };
  }

  /**
   * 顔正中線の長さを計算（ランドマークベース）
   */
  private calculateFaceMidlineLength(landmarks: Point3D[]): number {
    // 顔上部のランドマーク（109, 10, 338）
    const topIndices = [109, 10, 338];
    // 顔下部のランドマーク（148, 152, 377）
    const bottomIndices = [148, 152, 377];

    // 各グループの中心座標を計算
    const topCenter = this.calculateCenterPoint(landmarks, topIndices);
    const bottomCenter = this.calculateCenterPoint(landmarks, bottomIndices);

    // 3Dユークリッド距離を計算
    const dx = topCenter.x - bottomCenter.x;
    const dy = topCenter.y - bottomCenter.y;
    const dz = topCenter.z - bottomCenter.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 指定されたインデックスのランドマークの中心座標を計算
   */
  private calculateCenterPoint(landmarks: Point3D[], indices: number[]): Point3D {
    const validPoints = indices
      .filter(i => i < landmarks.length)
      .map(i => landmarks[i]);

    if (validPoints.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const sum = validPoints.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
        z: acc.z + point.z
      }),
      { x: 0, y: 0, z: 0 }
    );

    return {
      x: sum.x / validPoints.length,
      y: sum.y / validPoints.length,
      z: sum.z / validPoints.length
    };
  }

  /**
   * スケールを正規化（ランドマークベース：顔正中線を500pxに）
   */
  normalizeScale(landmarks: Point3D[], bbox: BoundingBox3D): { points: Point3D[], scaleFactor: Point3D } {
    const targetSize = this.params.targetSize;

    let scale: number;

    if (this.params.preserveAspectRatio) {
      // 顔正中線の長さで正規化（ランドマークベース）
      const midlineLength = this.calculateFaceMidlineLength(landmarks);
      scale = midlineLength > 0 ? targetSize / midlineLength : 1;

      // console.log(`🎯 Landmark-based normalization: midline=${midlineLength.toFixed(2)}px, scale=${scale.toFixed(4)}`);
    } else {
      // 各軸独立でスケール（バウンディングボックスベース）
      const maxDimension = Math.max(bbox.width, bbox.height, bbox.depth);
      scale = maxDimension > 0 ? targetSize / maxDimension : 1;
    }

    const scaledPoints = landmarks.map(point => ({
      x: point.x * scale,
      y: point.y * scale,
      z: point.z * scale
    }));

    return {
      points: scaledPoints,
      scaleFactor: { x: scale, y: scale, z: scale }
    };
  }

  /**
   * 正面向きに回転補正
   */
  rotateToFront(landmarks: Point3D[], transformMatrix?: any): { points: Point3D[], rotation: HeadPose } {
    if (!transformMatrix || !this.params.rotateToFront) {
      // 変換行列がない場合は、ランドマークベースで簡易的な姿勢推定を行う
      console.log('⚠️ No transformation matrix available, using landmark-based pose estimation');
      const estimatedPose = this.estimatePoseFromLandmarks(landmarks);
      return {
        points: landmarks, // 変換行列がないので回転補正はスキップ
        rotation: estimatedPose
      };
    }

    try {
      // 4x4変換行列から3x3回転行列を抽出
      const matrixData = transformMatrix.data || transformMatrix;
      const rotationMatrix = extractRotationMatrix(matrixData);

      // 頭部姿勢を計算
      const headPose = matrixToEulerAnglesMediaPipe(rotationMatrix);

      // MediaPipe座標系（+Y下）から通常座標系（+Y上）に変換
      // Y軸の行と列の符号を反転
      const coordinateAdjustedMatrix = [
        [rotationMatrix[0][0], -rotationMatrix[0][1], rotationMatrix[0][2]],
        [-rotationMatrix[1][0], rotationMatrix[1][1], -rotationMatrix[1][2]],
        [rotationMatrix[2][0], -rotationMatrix[2][1], rotationMatrix[2][2]]
      ];

      // 逆回転行列を計算して正面向きに補正
      const inverseRotation = invertMatrix3x3(coordinateAdjustedMatrix);
      // const inverseRotation = invertMatrix3x3(rotationMatrix);

      // 回転を適用
      const rotatedPoints = applyRotationToPoints(landmarks, inverseRotation);

      return {
        points: rotatedPoints,
        rotation: headPose
      };
    } catch (error) {
      console.warn('Failed to apply rotation correction:', error);
      return {
        points: landmarks,
        rotation: { yaw: 0, pitch: 0, roll: 0 }
      };
    }
  }

  /**
   * メイン正規化メソッド
   */
  normalize(landmarks: Point3D[], transformMatrix?: any): NormalizedLandmarks {
    if (landmarks.length === 0) {
      throw new Error('No landmarks provided for normalization');
    }

    // 元のランドマークを保存
    const original = [...landmarks];
    let processedPoints = [...landmarks];

    // 1. 回転補正（正面向きに）- 中心化の前に実行
    let rotation = { yaw: 0, pitch: 0, roll: 0 };
    if (this.params.rotateToFront && transformMatrix) {
      const rotated = this.rotateToFront(processedPoints, transformMatrix);
      processedPoints = rotated.points;
      rotation = rotated.rotation;
    }

    // 2. 中心化（回転補正後にバウンディングボックスを計算）
    let translation = { x: 0, y: 0, z: 0 };
    if (this.params.centerToOrigin) {
      const centered = this.centerToOrigin(processedPoints);
      processedPoints = centered.points;
      translation = centered.translation;
    }

    // 3. バウンディングボックス計算（回転後）
    const boundingBox = this.calculateBoundingBox(processedPoints);

    // 4. スケール正規化
    const scaled = this.normalizeScale(processedPoints, boundingBox);
    processedPoints = scaled.points;
    const scaleFactor = scaled.scaleFactor;

    return {
      original,
      normalized: processedPoints,
      boundingBox: this.calculateBoundingBox(processedPoints),
      scaleFactor,
      rotation,
      translation
    };
  }

  /**
   * 正規化パラメータを更新
   */
  updateParams(params: Partial<NormalizationParams>): void {
    this.params = { ...this.params, ...params };
  }

  /**
   * ランドマークから簡易的な頭部姿勢を推定
   */
  private estimatePoseFromLandmarks(landmarks: Point3D[]): HeadPose {
    if (landmarks.length < 468) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }

    try {
      // MediaPipeの主要ランドマーク位置
      const noseTip = landmarks[1];           // 鼻先
      const leftEyeCorner = landmarks[33];    // 左目じり
      const rightEyeCorner = landmarks[263];  // 右目じり
      const leftMouth = landmarks[61];        // 左口角
      const rightMouth = landmarks[291];      // 右口角

      // Yaw (左右の向き) - 左右の目の位置から推定
      const eyeCenterX = (leftEyeCorner.x + rightEyeCorner.x) / 2;
      const yaw = Math.atan2(noseTip.x - eyeCenterX, 100) * (180 / Math.PI); // 100は仮想的な奥行き

      // Pitch (上下の向き) - 鼻先と口の位置から推定
      const mouthCenterY = (leftMouth.y + rightMouth.y) / 2;
      const pitch = Math.atan2(noseTip.y - mouthCenterY, 50) * (180 / Math.PI); // 50は仮想的な距離

      // Roll (傾き) - 左右の目の高さの差から推定
      const roll = Math.atan2(rightEyeCorner.y - leftEyeCorner.y, rightEyeCorner.x - leftEyeCorner.x) * (180 / Math.PI);

      // 5秒に1回だけログ出力
      const now = Date.now();
      if (!this.lastPoseLogTime || now - this.lastPoseLogTime > 5000) {
        console.log('📐 Landmark-based pose estimation:', { yaw, pitch, roll });
        this.lastPoseLogTime = now;
      }

      return { yaw, pitch, roll };
    } catch (error) {
      console.warn('Failed to estimate pose from landmarks:', error);
      return { yaw: 0, pitch: 0, roll: 0 };
    }
  }

  /**
   * 現在のパラメータを取得
   */
  getParams(): NormalizationParams {
    return { ...this.params };
  }
}