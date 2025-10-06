import { Point3D, HeadPose } from '../types';

/**
 * 4x4変換行列から3x3回転行列を抽出
 */
export function extractRotationMatrix(transformMatrix: number[][]): number[][] {
  // MediaPipeの変換行列は4x4（最後の行は [0, 0, 0, 1]）
  // 回転成分は左上の3x3部分
  return [
    [transformMatrix[0][0], transformMatrix[0][1], transformMatrix[0][2]],
    [transformMatrix[1][0], transformMatrix[1][1], transformMatrix[1][2]],
    [transformMatrix[2][0], transformMatrix[2][1], transformMatrix[2][2]]
  ];
}

/**
 * 回転行列からオイラー角（Yaw, Pitch, Roll）を計算
 * 方法1: ZYX回転順序 (従来)
 */
export function matrixToEulerAngles(rotationMatrix: number[][]): HeadPose {
  const R = rotationMatrix;

  // ZYX回転順序でオイラー角を計算
  let yaw, pitch, roll;

  // Pitch (Y軸回転) を計算
  const sinPitch = -R[2][0];

  if (Math.abs(sinPitch) >= 0.99999) {
    // ジンバルロック状態
    pitch = Math.asin(sinPitch);
    yaw = Math.atan2(-R[0][1], R[1][1]);
    roll = 0;
  } else {
    pitch = Math.asin(sinPitch);
    yaw = Math.atan2(R[1][0], R[0][0]);
    roll = Math.atan2(R[2][1], R[2][2]);
  }

  // ラジアンから度に変換
  return {
    yaw: yaw * (180 / Math.PI),
    pitch: pitch * (180 / Math.PI),
    roll: roll * (180 / Math.PI)
  };
}

/**
 * 回転行列からオイラー角を計算（代替方法）
 * 方法2: XYZ回転順序またはY-X-Z順序
 */
export function matrixToEulerAnglesAlt(rotationMatrix: number[][]): HeadPose {
  const R = rotationMatrix;

  // 代替方法: 異なる行列要素を使用
  let yaw, pitch, roll;

  // Y軸回転 (ヨー): 水平回転
  yaw = Math.atan2(R[0][2], R[2][2]);

  // X軸回転 (ピッチ): 垂直回転
  const sinPitch = -R[1][2];
  pitch = Math.asin(Math.max(-1, Math.min(1, sinPitch)));

  // Z軸回転 (ロール): 傾き
  roll = Math.atan2(R[1][0], R[1][1]);

  // ラジアンから度に変換
  return {
    yaw: yaw * (180 / Math.PI),
    pitch: pitch * (180 / Math.PI),
    roll: roll * (180 / Math.PI)
  };
}

/**
 * 回転行列からオイラー角を計算（方法3）
 * MediaPipe座標系に特化した計算
 */
export function matrixToEulerAnglesMediaPipe(rotationMatrix: number[][]): HeadPose {
  const R = rotationMatrix;

  // MediaPipeの座標系に合わせた抽出
  // 首を左右に振る = Yaw、上下に振る = Pitch、傾ける = Roll
  let yaw, pitch, roll;

  // Yaw (首の左右回転): R[0][2]とR[2][2]から計算
  yaw = Math.atan2(-R[0][2], R[2][2]);

  // Pitch (首の上下回転): R[1][2]から計算
  const sinPitch = R[1][2];
  pitch = Math.asin(Math.max(-1, Math.min(1, sinPitch)));

  // Roll (首の傾き): R[1][0]とR[1][1]から計算
  roll = Math.atan2(-R[1][0], R[1][1]);

  // ラジアンから度に変換
  return {
    yaw: yaw * (180 / Math.PI),
    pitch: pitch * (180 / Math.PI),
    roll: roll * (180 / Math.PI)
  };
}

/**
 * オイラー角から回転行列を生成
 */
export function eulerAnglesToMatrix(angles: HeadPose): number[][] {
  // 度からラジアンに変換
  const yaw = angles.yaw * (Math.PI / 180);
  const pitch = angles.pitch * (Math.PI / 180);
  const roll = angles.roll * (Math.PI / 180);

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  // ZYX回転順序の回転行列
  return [
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr]
  ];
}

/**
 * 3x3行列の逆行列を計算
 */
export function invertMatrix3x3(matrix: number[][]): number[][] {
  const m = matrix;
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  if (Math.abs(det) < 1e-10) {
    throw new Error('Matrix is not invertible');
  }

  const invDet = 1.0 / det;

  return [
    [
      (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet,
      (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet,
      (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet
    ],
    [
      (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet,
      (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet,
      (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * invDet
    ],
    [
      (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet,
      (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * invDet,
      (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet
    ]
  ];
}

/**
 * 3D点に3x3回転行列を適用
 */
export function applyRotationMatrix(point: Point3D, rotationMatrix: number[][]): Point3D {
  const R = rotationMatrix;
  return {
    x: R[0][0] * point.x + R[0][1] * point.y + R[0][2] * point.z,
    y: R[1][0] * point.x + R[1][1] * point.y + R[1][2] * point.z,
    z: R[2][0] * point.x + R[2][1] * point.y + R[2][2] * point.z
  };
}

/**
 * 点の配列に回転行列を適用
 */
export function applyRotationToPoints(points: Point3D[], rotationMatrix: number[][]): Point3D[] {
  return points.map(point => applyRotationMatrix(point, rotationMatrix));
}

/**
 * MediaPipeの変換行列をデバッグ用に表示
 */
export function debugTransformMatrix(transformMatrix: any): void {
  console.log('Transform Matrix:', transformMatrix);

  if (transformMatrix && transformMatrix.data) {
    const matrix = Array.from(transformMatrix.data as ArrayLike<number>) as number[];
    console.log('Matrix data (flat):', matrix);

    // 4x4行列として表示
    console.log('4x4 Matrix:');
    for (let i = 0; i < 4; i++) {
      const row: number[] = matrix.slice(i * 4, (i + 1) * 4);
      console.log(`[${row.map((x: number) => x.toFixed(3)).join(', ')}]`);
    }
  }
}