import {
  Point3D,
  BoundingBox3D,
  NormalizedLandmarks,
  NormalizationParams,
  HeadPose
} from '../../types';
import {
  extractRotationMatrix,
  matrixToEulerAngles,
  matrixToEulerAnglesAlt,
  matrixToEulerAnglesMediaPipe,
  invertMatrix3x3,
  applyRotationToPoints,
  debugTransformMatrix
} from '../../utils/rotationUtils';

export class FaceNormalizer {
  private params: NormalizationParams;

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
   * 500×500×500に正規化（アスペクト比保持）
   */
  normalizeScale(landmarks: Point3D[], bbox: BoundingBox3D): { points: Point3D[], scaleFactor: Point3D } {
    const { targetSize, preserveAspectRatio } = this.params;

    let scaleX = targetSize / bbox.width;
    let scaleY = targetSize / bbox.height;
    let scaleZ = targetSize / bbox.depth;

    // ゼロ除算を防ぐ
    if (bbox.width === 0) scaleX = 1;
    if (bbox.height === 0) scaleY = 1;
    if (bbox.depth === 0) scaleZ = 1;

    if (preserveAspectRatio) {
      // アスペクト比を保持する場合、最小スケールを使用
      const uniformScale = Math.min(scaleX, scaleY, scaleZ);
      scaleX = scaleY = scaleZ = uniformScale;
    }

    const normalized = landmarks.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
      z: p.z * scaleZ
    }));

    return {
      points: normalized,
      scaleFactor: { x: scaleX, y: scaleY, z: scaleZ }
    };
  }

  /**
   * 中心を原点に移動
   */
  centerToOrigin(landmarks: Point3D[]): { points: Point3D[], translation: Point3D } {
    const bbox = this.calculateBoundingBox(landmarks);
    const translation = {
      x: -bbox.center.x,
      y: -bbox.center.y,
      z: -bbox.center.z
    };

    const centered = landmarks.map(p => ({
      x: p.x + translation.x,
      y: p.y + translation.y,
      z: p.z + translation.z
    }));

    return { points: centered, translation };
  }

  /**
   * 正面向きに回転補正
   * @param landmarks ランドマーク
   * @param transformMatrix MediaPipeからの変換行列
   */
  rotateToFront(landmarks: Point3D[], transformMatrix?: any): { points: Point3D[], rotation: HeadPose } {
    if (!transformMatrix) {
      // 変換行列が提供されていない場合は回転なし
      return {
        points: landmarks,
        rotation: { yaw: 0, pitch: 0, roll: 0 }
      };
    }

    try {
      // デバッグ用に変換行列を表示
      // debugTransformMatrix(transformMatrix);

      // MediaPipeの変換行列から4x4行列を構築
      let matrix4x4: number[][];

      if (transformMatrix.data) {
        // Float32Arrayの場合
        const data = Array.from(transformMatrix.data as ArrayLike<number>) as number[];
        matrix4x4 = [
          [data[0], data[1], data[2], data[3]],
          [data[4], data[5], data[6], data[7]],
          [data[8], data[9], data[10], data[11]],
          [data[12], data[13], data[14], data[15]]
        ];
      } else if (Array.isArray(transformMatrix)) {
        // 既に配列の場合
        matrix4x4 = transformMatrix;
      } else {
        console.warn('Unknown transform matrix format');
        return {
          points: landmarks,
          rotation: { yaw: 0, pitch: 0, roll: 0 }
        };
      }

      // 3x3回転行列を抽出
      const rotationMatrix = extractRotationMatrix(matrix4x4);

      // 複数の方法でオイラー角を計算して比較
      const rotation1 = matrixToEulerAngles(rotationMatrix);
      const rotation2 = matrixToEulerAnglesAlt(rotationMatrix);
      const rotation3 = matrixToEulerAnglesMediaPipe(rotationMatrix);

      // console.log('=== Rotation Angle Comparison ===');
      // console.log('Method 1 (ZYX):', rotation1);
      // console.log('Method 2 (Alt):', rotation2);
      // console.log('Method 3 (MP):', rotation3);

      // MediaPipe特化の方法を使用
      const rotation = rotation3;

      // 逆回転行列を計算（正面向きにするため）
      const inverseRotationMatrix = invertMatrix3x3(rotationMatrix);

      // ランドマークに逆回転を適用
      const rotatedPoints = applyRotationToPoints(landmarks, inverseRotationMatrix);

      // console.log('Using MediaPipe method:', rotation);
      // console.log('Applied inverse rotation');

      return {
        points: rotatedPoints,
        rotation
      };

    } catch (error) {
      console.error('Error in rotation correction:', error);
      return {
        points: landmarks,
        rotation: { yaw: 0, pitch: 0, roll: 0 }
      };
    }
  }

  /**
   * 統合正規化処理
   */
  normalize(landmarks: Point3D[], transformMatrix?: any): NormalizedLandmarks {
    // 元のランドマークを保持
    const original = [...landmarks];

    // バウンディングボックス計算
    const boundingBox = this.calculateBoundingBox(landmarks);

    let processedLandmarks = landmarks;
    let scaleFactor = { x: 1, y: 1, z: 1 };
    let translation = { x: 0, y: 0, z: 0 };
    let rotation = { yaw: 0, pitch: 0, roll: 0 };

    // 1. スケール正規化
    if (this.params.targetSize > 0) {
      const scaled = this.normalizeScale(processedLandmarks, boundingBox);
      processedLandmarks = scaled.points;
      scaleFactor = scaled.scaleFactor;
    }

    // 2. 中心移動
    if (this.params.centerToOrigin) {
      const centered = this.centerToOrigin(processedLandmarks);
      processedLandmarks = centered.points;
      translation = centered.translation;
    }

    // 3. 回転補正
    if (this.params.rotateToFront) {
      const rotated = this.rotateToFront(processedLandmarks, transformMatrix);
      processedLandmarks = rotated.points;
      rotation = rotated.rotation;
    }

    return {
      original,
      normalized: processedLandmarks,
      boundingBox,
      scaleFactor,
      rotation,
      translation
    };
  }

  /**
   * パラメータを更新
   */
  updateParams(params: Partial<NormalizationParams>): void {
    this.params = { ...this.params, ...params };
  }
}