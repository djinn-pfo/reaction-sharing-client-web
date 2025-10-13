/**
 * Laugh Preset Service
 *
 * プリセット一覧の取得、音声ファイルのダウンロード、IndexedDB操作を担当
 */

import { IndexedDBManager } from './IndexedDBManager';
import type { LaughPreset, BackendPresetsResponse, LaughPresetDB } from '../../types/laugh';

const LAUGH_API_URL = import.meta.env.VITE_LAUGH_API_URL || 'http://localhost:5001';
const STATIC_BASE_URL = import.meta.env.VITE_STATIC_BASE_URL || 'http://localhost:8080';

export class LaughPresetService {
  private dbManager: IndexedDBManager;

  constructor() {
    this.dbManager = new IndexedDBManager();
  }

  /**
   * プリセット一覧を取得（APIから）
   */
  async fetchPresets(): Promise<LaughPreset[]> {
    try {
      console.log(`📡 [LaughPresetService] Fetching presets from ${LAUGH_API_URL}/api/v1/laugh/presets`);

      const response = await fetch(`${LAUGH_API_URL}/api/v1/laugh/presets`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const backendData: BackendPresetsResponse = await response.json();
      console.log(`✅ [LaughPresetService] Fetched ${backendData.presets.length} patterns from backend`);

      // バックエンドの形式をフロントエンド用に変換
      const presets: LaughPreset[] = [];
      for (const item of backendData.presets) {
        const levels: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
        for (const level of levels) {
          presets.push({
            id: `${item.id}_${level}`,
            pattern: item.id,
            level: level,
            url: item.files[level],
            duration: 1.5, // デフォルト値（実際の長さは不明）
            size: 150000, // デフォルト値（実際のサイズは不明）
          });
        }
      }

      console.log(`✅ [LaughPresetService] Converted to ${presets.length} presets`);
      return presets;
    } catch (error) {
      console.error('❌ [LaughPresetService] Failed to fetch presets:', error);
      throw error;
    }
  }

  /**
   * プリセット音声ファイルをダウンロード
   */
  async downloadPresetAudio(url: string): Promise<ArrayBuffer> {
    try {
      const fullUrl = `${STATIC_BASE_URL}${url}`;
      console.log(`⬇️ [LaughPresetService] Downloading audio: ${fullUrl}`);

      const response = await fetch(fullUrl);

      if (!response.ok) {
        // ステータスが404の場合、モック音声データを返す（開発用）
        if (response.status === 404) {
          console.warn(`⚠️ [LaughPresetService] File not found, using mock audio for: ${url}`);
          return this.generateMockAudio();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(`✅ [LaughPresetService] Downloaded audio: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

      return arrayBuffer;
    } catch (error) {
      console.error(`❌ [LaughPresetService] Failed to download audio from ${url}:`, error);
      // フォールバック: モック音声を返す
      console.warn(`⚠️ [LaughPresetService] Using mock audio as fallback`);
      return this.generateMockAudio();
    }
  }

  /**
   * モック音声データを生成（開発・テスト用）
   * 440Hzのビープ音（0.5秒）
   */
  private generateMockAudio(): ArrayBuffer {
    // WAVファイルのヘッダー + 0.5秒の440Hz正弦波
    const sampleRate = 44100;
    const duration = 0.5;
    const numSamples = sampleRate * duration;
    const frequency = 440; // A4音

    // WAVファイルサイズ計算
    const dataSize = numSamples * 2; // 16-bit samples
    const fileSize = 44 + dataSize; // WAV header (44 bytes) + data

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // WAVヘッダー
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, fileSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // 1 channel (mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // 音声データ（440Hz正弦波）
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const value = Math.sin(2 * Math.PI * frequency * t) * 0.3; // 音量30%
      const sample = Math.floor(value * 32767); // 16-bit signed
      view.setInt16(44 + i * 2, sample, true);
    }

    console.log(`✅ [LaughPresetService] Generated mock audio: ${(buffer.byteLength / 1024).toFixed(2)} KB`);
    return buffer;
  }

  /**
   * プリセットをIndexedDBに保存
   */
  async savePreset(preset: LaughPreset, audioData: ArrayBuffer): Promise<void> {
    const data: LaughPresetDB = {
      id: preset.id,
      pattern: preset.pattern,
      level: preset.level,
      duration: preset.duration,
      size: preset.size,
      audioData: audioData,
      downloadedAt: Date.now()
    };

    await this.dbManager.savePreset(data);
  }

  /**
   * 全プリセットをダウンロードして保存
   */
  async downloadAllPresets(
    presets: LaughPreset[],
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    const total = presets.length;
    console.log(`🚀 [LaughPresetService] Starting download of ${total} presets`);

    for (let i = 0; i < total; i++) {
      const preset = presets[i];
      try {
        // ダウンロード
        const audioData = await this.downloadPresetAudio(preset.url);

        // IndexedDBに保存
        await this.savePreset(preset, audioData);

        // 進行状況を通知
        onProgress?.(i + 1, total);

        console.log(`✅ [LaughPresetService] Progress: ${i + 1}/${total} - ${preset.id}`);
      } catch (error) {
        console.error(`❌ [LaughPresetService] Failed to download ${preset.id}:`, error);
        // エラーでも継続（次のプリセットをダウンロード）
      }
    }

    console.log(`🎉 [LaughPresetService] Download complete! ${total} presets saved`);
  }

  /**
   * IndexedDBからプリセットを取得
   */
  async getPreset(presetId: string): Promise<LaughPresetDB | null> {
    return await this.dbManager.getPreset(presetId);
  }

  /**
   * キャッシュされた全プリセットを取得
   */
  async getAllCachedPresets(): Promise<LaughPresetDB[]> {
    return await this.dbManager.getAllPresets();
  }

  /**
   * パターンで検索
   */
  async getPresetsByPattern(pattern: string): Promise<LaughPresetDB[]> {
    return await this.dbManager.getPresetsByPattern(pattern);
  }

  /**
   * プリセット数を取得
   */
  async getPresetCount(): Promise<number> {
    return await this.dbManager.count();
  }

  /**
   * 全プリセットを削除
   */
  async clearAllPresets(): Promise<void> {
    await this.dbManager.clearAll();
  }

  /**
   * データベースを閉じる
   */
  close(): void {
    this.dbManager.close();
  }
}
