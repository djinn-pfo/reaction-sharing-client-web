import type { Point3D, HeadPose } from '../types';

/**
 * 回転行列の各列を正規化（スケールを除去）
 */
function normalizeRotationMatrix(matrix: number[][]): number[][] {
  const normalized: number[][] = [[], [], []];

  for (let col = 0; col < 3; col++) {
    // 各列のベクトルを抽出
    const vector = [matrix[0][col], matrix[1][col], matrix[2][col]];

    // ベクトルの長さを計算
    const length = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);

    // 正規化（長さで割る）
    if (length > 0.00001) {
      normalized[0][col] = vector[0] / length;
      normalized[1][col] = vector[1] / length;
      normalized[2][col] = vector[2] / length;
    } else {
      // 長さが0の場合は単位ベクトルとして扱う
      normalized[0][col] = col === 0 ? 1 : 0;
      normalized[1][col] = col === 1 ? 1 : 0;
      normalized[2][col] = col === 2 ? 1 : 0;
    }
  }

  return normalized;
}

/**
 * 4x4変換行列から3x3回転行列を抽出
 * MediaPipeの変換行列はcolumn-major形式
 */
export function extractRotationMatrix(transformMatrix: number[][] | Float32Array | number[]): number[][] {
  // Float32Arrayまたは通常のArray（16要素の1次元配列）の場合は4x4行列として解釈
  if (transformMatrix instanceof Float32Array || (Array.isArray(transformMatrix) && transformMatrix.length === 16)) {
    if (transformMatrix.length !== 16) {
      throw new Error(`Expected 16 elements for 4x4 matrix, got ${transformMatrix.length}`);
    }
    // MediaPipeはcolumn-major (OpenGL形式) なので、転置して読み取る
    // column-major: data[col * 4 + row] = matrix[row][col]
    const matrix4x4: number[][] = [];
    const flatMatrix = transformMatrix as number[] | Float32Array;
    for (let i = 0; i < 4; i++) {
      matrix4x4[i] = [];
      for (let j = 0; j < 4; j++) {
        // column-majorなので、行列の[i][j]要素は配列の[j * 4 + i]にある
        // matrix4x4[i][j] = flatMatrix[j * 4 + i];
        matrix4x4[i][j] = flatMatrix[i * 4 + j];
      }
    }

    // 左上の3x3部分を抽出
    const rotation = [
      [matrix4x4[0][0], matrix4x4[0][1], matrix4x4[0][2]],
      [matrix4x4[1][0], matrix4x4[1][1], matrix4x4[1][2]],
      [matrix4x4[2][0], matrix4x4[2][1], matrix4x4[2][2]]
    ];

    // 各列を正規化してスケールを除去（MediaPipe公式推奨）
    return normalizeRotationMatrix(rotation);
  }

  // 2次元配列の場合
  if (Array.isArray(transformMatrix) && Array.isArray(transformMatrix[0])) {
    // MediaPipeの変換行列は4x4（最後の行は [0, 0, 0, 1]）
    // 回転成分は左上の3x3部分
    const matrix2D = transformMatrix as number[][];
    const rotation = [
      [matrix2D[0][0], matrix2D[0][1], matrix2D[0][2]],
      [matrix2D[1][0], matrix2D[1][1], matrix2D[1][2]],
      [matrix2D[2][0], matrix2D[2][1], matrix2D[2][2]]
    ];
    /*
    const rotation = [
      [matrix2D[0][0], matrix2D[1][0], matrix2D[2][0]],
      [matrix2D[0][1], matrix2D[1][1], matrix2D[2][1]],
      [matrix2D[0][2], matrix2D[1][2], matrix2D[2][2]]
    ]
    */

    // 各列を正規化してスケールを除去
    return normalizeRotationMatrix(rotation);
  }

  throw new Error(`Unsupported matrix format: ${typeof transformMatrix}, length: ${Array.isArray(transformMatrix) ? transformMatrix.length : 'N/A'}`);
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

  // Y-X-Z回転順序
  let yaw, pitch, roll;

  // X軸回転（Pitch）
  const sinPitch = R[2][1];

  if (Math.abs(sinPitch) >= 0.99999) {
    // ジンバルロック
    pitch = Math.asin(sinPitch);
    yaw = Math.atan2(-R[0][2], R[0][0]);
    roll = 0;
  } else {
    pitch = Math.asin(sinPitch);
    yaw = Math.atan2(-R[2][0], R[2][2]);
    roll = Math.atan2(-R[0][1], R[1][1]);
  }

  return {
    yaw: yaw * (180 / Math.PI),
    pitch: pitch * (180 / Math.PI),
    roll: roll * (180 / Math.PI)
  };
}

/**
 * MediaPipe専用のオイラー角計算
 * MediaPipe座標系: +X右, +Y下, +Z カメラ向き
 * Tait-Bryan順序: R = R_y(yaw) · R_x(pitch) · R_z(roll)
 */
export function matrixToEulerAnglesMediaPipe(rotationMatrix: number[][]): HeadPose {
  const R = rotationMatrix;

  // MediaPipe公式実装に基づく抽出式
  // pitch = asin(clamp(-R[1][2], -1, 1))
  // yaw   = atan2(R[0][2], R[2][2])
  // roll  = atan2(R[1][0], R[1][1])

  const sinPitch = Math.max(-1, Math.min(1, -R[1][2]));
  const pitch = Math.asin(sinPitch) * (180 / Math.PI);

  let yaw: number;
  let roll: number;

  // ジンバルロック判定
  if (Math.abs(R[1][2]) < 0.99999) {
    yaw = Math.atan2(R[0][2], R[2][2]) * (180 / Math.PI);
    roll = Math.atan2(R[1][0], R[1][1]) * (180 / Math.PI);
  } else {
    // ジンバルロック時
    yaw = Math.atan2(-R[0][1], R[0][0]) * (180 / Math.PI);
    roll = 0;
  }

  return { yaw, pitch, roll };
}

/**
 * 3x3行列の逆行列を計算
 */
export function invertMatrix3x3(matrix: number[][]): number[][] {
  const det =
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);

  if (Math.abs(det) < 1e-10) {
    throw new Error('Matrix is not invertible');
  }

  const invDet = 1 / det;

  return [
    [
      (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) * invDet,
      (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) * invDet,
      (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) * invDet
    ],
    [
      (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) * invDet,
      (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) * invDet,
      (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) * invDet
    ],
    [
      (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) * invDet,
      (matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) * invDet,
      (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) * invDet
    ]
  ];
}

/**
 * 回転行列を3D点に適用
 */
export function applyRotationToPoints(points: Point3D[], rotationMatrix: number[][]): Point3D[] {
  return points.map(point => {
    const x = rotationMatrix[0][0] * point.x + rotationMatrix[0][1] * point.y + rotationMatrix[0][2] * point.z;
    const y = rotationMatrix[1][0] * point.x + rotationMatrix[1][1] * point.y + rotationMatrix[1][2] * point.z;
    const z = rotationMatrix[2][0] * point.x + rotationMatrix[2][1] * point.y + rotationMatrix[2][2] * point.z;

    return { x, y, z };
  });
}

/**
 * デバッグ用：変換行列の内容を表示
 */
export function debugTransformMatrix(matrix: number[][], label: string = 'Transform Matrix'): void {
  console.log(`${label}:`);
  matrix.forEach((row, i) => {
    console.log(`  [${i}]: [${row.map(val => val.toFixed(4)).join(', ')}]`);
  });
}