import type { FaceLandmark } from '../hooks/useMediaPipe';

/**
 * Delta-Delta圧縮のためのランドマーク履歴管理
 */
export class LandmarkCompressor {
  private previousLandmarks: FaceLandmark[] | null = null;
  private previousDeltas: number[] | null = null;

  /**
   * ランドマークデータをdelta-delta圧縮してバイナリ化
   */
  public compress(landmarks: FaceLandmark[]): Uint8Array | null {
    if (!landmarks || landmarks.length === 0) {
      return null;
    }

    // 初回の場合は全データを送信
    if (!this.previousLandmarks) {
      this.previousLandmarks = [...landmarks];
      return this.encodeFullLandmarks(landmarks);
    }

    // Delta計算 (現在の座標 - 前回の座標)
    const deltas = this.calculateDeltas(landmarks, this.previousLandmarks);

    // Delta-Delta計算 (現在のDelta - 前回のDelta)
    let deltaDelta: number[];

    if (!this.previousDeltas) {
      // 初回Delta送信
      deltaDelta = deltas;
    } else {
      deltaDelta = deltas.map((delta, i) => delta - (this.previousDeltas![i] || 0));
    }

    // 履歴を更新
    this.previousLandmarks = [...landmarks];
    this.previousDeltas = deltas;

    return this.encodeDeltaDelta(deltaDelta);
  }

  /**
   * ランドマーク間のDelta（差分）を計算
   */
  private calculateDeltas(current: FaceLandmark[], previous: FaceLandmark[]): number[] {
    const deltas: number[] = [];

    for (let i = 0; i < Math.min(current.length, previous.length); i++) {
      deltas.push(
        current[i].x - previous[i].x,  // X差分
        current[i].y - previous[i].y,  // Y差分
        (current[i].z || 0) - (previous[i].z || 0)  // Z差分
      );
    }

    return deltas;
  }

  /**
   * 初回送信用：全ランドマークをバイナリエンコード
   */
  private encodeFullLandmarks(landmarks: FaceLandmark[]): Uint8Array {
    const buffer = new ArrayBuffer(1 + landmarks.length * 12); // 1byte(type) + 3*4bytes per landmark
    const view = new DataView(buffer);

    // データタイプ: 0 = 全データ
    view.setUint8(0, 0);

    let offset = 1;
    for (const landmark of landmarks) {
      view.setFloat32(offset, landmark.x, true); // Little Endian
      view.setFloat32(offset + 4, landmark.y, true);
      view.setFloat32(offset + 8, landmark.z || 0, true);
      offset += 12;
    }

    return new Uint8Array(buffer);
  }

  /**
   * Delta-Deltaデータをバイナリエンコード
   */
  private encodeDeltaDelta(deltaDelta: number[]): Uint8Array {
    // 量子化して圧縮率を向上（精度とサイズのトレードオフ）
    const quantizedData = this.quantizeDeltaDelta(deltaDelta);

    const buffer = new ArrayBuffer(1 + 2 + quantizedData.length * 2); // 1byte(type) + 2bytes(count) + 2bytes per value
    const view = new DataView(buffer);

    // データタイプ: 1 = Delta-Delta
    view.setUint8(0, 1);

    // データ数
    view.setUint16(1, quantizedData.length, true);

    // Delta-Deltaデータ
    let offset = 3;
    for (const value of quantizedData) {
      view.setInt16(offset, value, true); // 16bit符号付き整数
      offset += 2;
    }

    return new Uint8Array(buffer);
  }

  /**
   * Delta-Deltaデータを量子化（精度を落として圧縮）
   */
  private quantizeDeltaDelta(deltaDelta: number[]): number[] {
    const scale = 10000; // 0.0001の精度
    return deltaDelta.map(value => Math.round(value * scale));
  }

  /**
   * 圧縮状態をリセット（新しいセッション開始時）
   */
  public reset(): void {
    this.previousLandmarks = null;
    this.previousDeltas = null;
  }

  /**
   * 圧縮効果の統計情報
   */
  public getCompressionStats(): { isInitialized: boolean; compressionRatio: number } {
    if (!this.previousLandmarks) {
      return { isInitialized: false, compressionRatio: 0 };
    }

    const fullSize = this.previousLandmarks.length * 12; // 3 * 4 bytes per landmark
    const compressedSize = this.previousDeltas ? this.previousDeltas.length * 2 : fullSize; // 2 bytes per delta-delta value

    return {
      isInitialized: true,
      compressionRatio: compressedSize / fullSize
    };
  }
}

/**
 * WebSocketでバイナリ送信するためのメッセージフォーマット
 */
export interface BinaryLandmarkMessage {
  type: 'landmark-data';
  roomId: string;
  userId: string;
  timestamp: number;
  compressionType: 'delta-delta' | 'full';
  data: Uint8Array;
}

/**
 * バイナリメッセージをWebSocket送信用にエンコード
 */
export function encodeBinaryMessage(message: BinaryLandmarkMessage): ArrayBuffer {
  const metadataJson = JSON.stringify({
    type: message.type,
    roomId: message.roomId,
    userId: message.userId,
    timestamp: message.timestamp,
    compressionType: message.compressionType,
    dataLength: message.data.length
  });

  const metadataBytes = new TextEncoder().encode(metadataJson);
  const totalLength = 4 + metadataBytes.length + message.data.length;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // メタデータ長（4 bytes）
  view.setUint32(0, metadataBytes.length, true);

  // メタデータ（JSON）
  new Uint8Array(buffer, 4, metadataBytes.length).set(metadataBytes);

  // バイナリデータ
  new Uint8Array(buffer, 4 + metadataBytes.length).set(message.data);

  return buffer;
}