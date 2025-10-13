/**
 * Laugh Player
 *
 * 笑い声のトリガー判定と音声再生を担当
 */

import { LaughPresetService } from './LaughPresetService';
import type { LaughLevel, LaughTriggerResult } from '../../types/laugh';

export class LaughPlayer {
  private presetService: LaughPresetService;
  private previousIntensity: number = 0;
  private isPlaying: boolean = false; // 再生中フラグ
  private currentAudio: HTMLAudioElement | null = null; // 現在再生中のAudio要素
  private isMuted: boolean = false; // ミュートフラグ

  constructor() {
    this.presetService = new LaughPresetService();
  }

  /**
   * トリガー判定とレベル決定
   *
   * @param currentIntensity 現在の感情強度 (0-100)
   * @returns トリガー判定結果
   */
  checkTrigger(currentIntensity: number): LaughTriggerResult {
    // Δintensity を計算
    const delta = currentIntensity - this.previousIntensity;

    // トリガー判定: Δintensity >= 10
    if (delta < 10) {
      this.previousIntensity = currentIntensity;
      return {
        shouldTrigger: false,
        level: null,
        presetId: null
      };
    }

    // レベル判定
    let level: LaughLevel | null = null;

    if (currentIntensity < 20) {
      // 0-19: 無音（声にならない笑い）
      level = null;
    } else if (currentIntensity < 40) {
      // 20-39: 小笑い
      level = 'small';
    } else if (currentIntensity < 70) {
      // 40-69: 中笑い
      level = 'medium';
    } else {
      // 70-100: 大笑い
      level = 'large';
    }

    // previousIntensity を更新
    this.previousIntensity = currentIntensity;

    console.log(`🎯 [LaughPlayer] Trigger check: intensity=${currentIntensity}, Δ=${delta}, level=${level}`);

    return {
      shouldTrigger: level !== null,
      level,
      presetId: null // patternと組み合わせて後で設定される
    };
  }

  /**
   * 音声を再生（ArrayBufferから）
   *
   * @param audioData 音声データ（ArrayBuffer）
   */
  async playAudioFromBuffer(audioData: ArrayBuffer): Promise<void> {
    try {
      // ミュート中の場合はスキップ
      if (this.isMuted) {
        console.log(`🔇 [LaughPlayer] Muted, skipping playback`);
        return;
      }

      // 既に再生中の場合はスキップ
      if (this.isPlaying) {
        console.log(`⏭️ [LaughPlayer] Already playing, skipping new playback`);
        return;
      }

      // ArrayBufferをBlobに変換
      const blob = new Blob([audioData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      // Audio要素を作成して再生
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.isPlaying = true;

      await audio.play();

      console.log(`🔊 [LaughPlayer] Audio playing (${(audioData.byteLength / 1024).toFixed(2)} KB)`);

      // 再生終了後にURLを解放してフラグをリセット
      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.isPlaying = false;
        this.currentAudio = null;
        console.log(`✅ [LaughPlayer] Audio playback completed, ready for next`);
      };

      // エラーハンドリング
      audio.onerror = (error) => {
        console.error('❌ [LaughPlayer] Audio playback error:', error);
        URL.revokeObjectURL(url);
        this.isPlaying = false;
        this.currentAudio = null;
      };
    } catch (error) {
      console.error('❌ [LaughPlayer] Failed to play audio:', error);
      this.isPlaying = false;
      this.currentAudio = null;
      throw error;
    }
  }

  /**
   * プリセットIDで音声を再生
   *
   * @param presetId プリセットID（例: "male1_medium"）
   */
  async playPreset(presetId: string): Promise<void> {
    try {
      console.log(`🎵 [LaughPlayer] Playing preset: ${presetId}`);

      // IndexedDBから取得
      const preset = await this.presetService.getPreset(presetId);

      if (!preset) {
        throw new Error(`Preset not found: ${presetId}`);
      }

      // 音声を再生
      await this.playAudioFromBuffer(preset.audioData);
    } catch (error) {
      console.error(`❌ [LaughPlayer] Failed to play preset ${presetId}:`, error);
      throw error;
    }
  }

  /**
   * previousIntensityをリセット
   */
  resetIntensity(): void {
    this.previousIntensity = 0;
    console.log(`🔄 [LaughPlayer] Intensity reset to 0`);
  }

  /**
   * previousIntensityを取得
   */
  getPreviousIntensity(): number {
    return this.previousIntensity;
  }

  /**
   * previousIntensityを設定（テスト用）
   */
  setPreviousIntensity(value: number): void {
    this.previousIntensity = value;
  }

  /**
   * 再生中かどうかを取得
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 現在の再生を停止（緊急時用）
   */
  stopCurrentPlayback(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.isPlaying = false;
      console.log(`🛑 [LaughPlayer] Playback stopped`);
    }
  }

  /**
   * ミュート状態を設定
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    console.log(`${muted ? '🔇' : '🔊'} [LaughPlayer] Mute ${muted ? 'enabled' : 'disabled'}`);
  }

  /**
   * ミュート状態を取得
   */
  getMuted(): boolean {
    return this.isMuted;
  }
}
