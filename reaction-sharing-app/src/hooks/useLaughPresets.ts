/**
 * useLaughPresets Hook
 *
 * プリセット一覧の取得とダウンロードを管理するカスタムフック
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LaughPresetService } from '../services/laugh/LaughPresetService';
import type { LaughPreset } from '../types/laugh';

export const useLaughPresets = () => {
  const [presets, setPresets] = useState<LaughPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const presetServiceRef = useRef<LaughPresetService>(new LaughPresetService());

  // プリセット一覧を取得
  useEffect(() => {
    const loadPresets = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 [useLaughPresets] Fetching presets...');
        const fetchedPresets = await presetServiceRef.current.fetchPresets();

        setPresets(fetchedPresets);
        console.log(`✅ [useLaughPresets] Loaded ${fetchedPresets.length} presets`);
      } catch (err) {
        console.error('❌ [useLaughPresets] Failed to load presets:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadPresets();
  }, []);

  // 全プリセットをダウンロード
  const downloadAllPresets = useCallback(async () => {
    if (presets.length === 0) {
      console.warn('⚠️ [useLaughPresets] No presets to download');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      console.log(`🚀 [useLaughPresets] Starting download of ${presets.length} presets`);

      await presetServiceRef.current.downloadAllPresets(presets, (current, total) => {
        setDownloadProgress(current);
        console.log(`📊 [useLaughPresets] Progress: ${current}/${total}`);
      });

      console.log('🎉 [useLaughPresets] All presets downloaded successfully');
    } catch (err) {
      console.error('❌ [useLaughPresets] Failed to download presets:', err);
      throw err;
    } finally {
      setIsDownloading(false);
    }
  }, [presets]);

  // 単一プリセットをダウンロード
  const downloadPreset = useCallback(async (preset: LaughPreset) => {
    try {
      console.log(`⬇️ [useLaughPresets] Downloading single preset: ${preset.id}`);

      const audioData = await presetServiceRef.current.downloadPresetAudio(preset.url);
      await presetServiceRef.current.savePreset(preset, audioData);

      console.log(`✅ [useLaughPresets] Preset ${preset.id} downloaded`);
    } catch (err) {
      console.error(`❌ [useLaughPresets] Failed to download preset ${preset.id}:`, err);
      throw err;
    }
  }, []);

  // キャッシュされたプリセット数を取得
  const getCachedCount = useCallback(async () => {
    try {
      const count = await presetServiceRef.current.getPresetCount();
      console.log(`📊 [useLaughPresets] Cached presets: ${count}`);
      return count;
    } catch (err) {
      console.error('❌ [useLaughPresets] Failed to get cached count:', err);
      return 0;
    }
  }, []);

  return {
    presets,
    loading,
    error,
    downloadProgress,
    isDownloading,
    downloadAllPresets,
    downloadPreset,
    getCachedCount
  };
};
