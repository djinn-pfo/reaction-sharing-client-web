/**
 * useLaughPlayer Hook
 *
 * 笑い声のトリガー判定と再生を管理するカスタムフック
 */

import { useCallback, useRef } from 'react';
import { LaughPlayer } from '../services/laugh/LaughPlayer';
import type { LaughLevel } from '../types/laugh';

export interface UseLaughPlayerOptions {
  /** 選択されたパターン（例: "male1"） */
  selectedPattern: string;

  /** 笑い声がトリガーされた時のコールバック */
  onLaughTriggered?: (presetId: string, level: LaughLevel) => void;
}

export const useLaughPlayer = (options: UseLaughPlayerOptions) => {
  const { selectedPattern, onLaughTriggered } = options;
  const playerRef = useRef<LaughPlayer>(new LaughPlayer());

  /**
   * 感情値を処理してトリガー判定
   *
   * @param intensity 現在の感情強度 (0-100)
   */
  const processIntensity = useCallback(async (intensity: number) => {
    const player = playerRef.current;
    const result = player.checkTrigger(intensity);

    if (result.shouldTrigger && result.level) {
      const presetId = `${selectedPattern}_${result.level}`;

      console.log(`🎵 [useLaughPlayer] Triggering laugh: ${presetId}`);

      try {
        // 音声再生
        await player.playPreset(presetId);

        // コールバック
        onLaughTriggered?.(presetId, result.level);

        console.log(`✅ [useLaughPlayer] Laugh played successfully: ${presetId}`);
      } catch (error) {
        console.error(`❌ [useLaughPlayer] Failed to play laugh ${presetId}:`, error);
      }
    }
  }, [selectedPattern, onLaughTriggered]);

  /**
   * プリセットIDで直接再生（他ユーザーの笑い声受信時）
   *
   * @param presetId プリセットID（例: "female2_large"）
   */
  const playPreset = useCallback(async (presetId: string) => {
    try {
      console.log(`🎵 [useLaughPlayer] Playing other user's laugh: ${presetId}`);
      await playerRef.current.playPreset(presetId);
      console.log(`✅ [useLaughPlayer] Other user's laugh played: ${presetId}`);
    } catch (error) {
      console.error(`❌ [useLaughPlayer] Failed to play preset ${presetId}:`, error);
    }
  }, []);

  /**
   * previousIntensityをリセット
   */
  const resetIntensity = useCallback(() => {
    playerRef.current.resetIntensity();
    console.log(`🔄 [useLaughPlayer] Intensity reset`);
  }, []);

  /**
   * 現在のpreviousIntensityを取得
   */
  const getPreviousIntensity = useCallback(() => {
    return playerRef.current.getPreviousIntensity();
  }, []);

  /**
   * ミュート状態を設定
   */
  const setMuted = useCallback((muted: boolean) => {
    playerRef.current.setMuted(muted);
  }, []);

  /**
   * ミュート状態を取得
   */
  const getMuted = useCallback(() => {
    return playerRef.current.getMuted();
  }, []);

  return {
    processIntensity,
    playPreset,
    resetIntensity,
    getPreviousIntensity,
    setMuted,
    getMuted
  };
};
