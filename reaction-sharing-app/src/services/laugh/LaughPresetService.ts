/**
 * Laugh Preset Service
 *
 * プリセット一覧の取得、音声ファイルのダウンロード、IndexedDB操作を担当
 */

import { IndexedDBManager } from './IndexedDBManager';
import { config } from '../../config/environment';
import type { LaughPreset, BackendPresetsResponse, LaughPresetDB } from '../../types/laugh';

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
      console.log(`📡 [LaughPresetService] Fetching presets from ${config.laughApiUrl}/api/v1/laugh/presets`);

      const response = await fetch(`${config.laughApiUrl}/api/v1/laugh/presets`);

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
    const fullUrl = `${config.staticBaseUrl}${url}`;
    console.log(`⬇️ [LaughPresetService] Downloading audio: ${fullUrl}`);

    const response = await fetch(fullUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ [LaughPresetService] Downloaded audio: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

    return arrayBuffer;
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
