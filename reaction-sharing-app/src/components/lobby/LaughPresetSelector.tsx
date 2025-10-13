/**
 * LaughPresetSelector Component
 *
 * ロビー画面で笑い声プリセットを選択するUIコンポーネント
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLaughPresets } from '../../hooks/useLaughPresets';
import { useLaughPlayer } from '../../hooks/useLaughPlayer';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface LaughPresetSelectorProps {
  /** 初期選択パターン（LocalStorageから読み込み） */
  initialPattern?: string;
  /** 選択完了時のコールバック */
  onSelect?: (pattern: string) => void;
}

// パターンごとの絵文字アイコン
const PATTERN_ICONS: Record<string, string> = {
  male1: '😄',
  male2: '😆',
  male3: '🤣',
  female1: '😊',
  female2: '😁',
  female3: '😂',
};

// パターンの表示名
const PATTERN_LABELS: Record<string, string> = {
  male1: '男性1',
  male2: '男性2',
  male3: '男性3',
  female1: '女性1',
  female2: '女性2',
  female3: '女性3',
};

export const LaughPresetSelector: React.FC<LaughPresetSelectorProps> = ({
  initialPattern = 'male1',
  onSelect,
}) => {
  const [selectedPattern, setSelectedPattern] = useState<string>(initialPattern);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);

  const {
    presets,
    loading: presetsLoading,
    downloadProgress,
    isDownloading,
    downloadAllPresets,
    getCachedCount,
  } = useLaughPresets();

  const { playPreset } = useLaughPlayer({
    selectedPattern,
  });

  // LocalStorageから選択済みパターンを読み込み
  useEffect(() => {
    const savedPattern = localStorage.getItem('laughPattern');
    if (savedPattern) {
      setSelectedPattern(savedPattern);
    }
  }, []);

  // キャッシュ済みプリセット数を確認
  useEffect(() => {
    const checkCached = async () => {
      const count = await getCachedCount();
      if (count >= 18) {
        setIsDownloaded(true);
        console.log('✅ [LaughPresetSelector] All presets already cached');
      }
    };
    checkCached();
  }, [getCachedCount]);

  // プリセット一覧が取得できたら自動ダウンロード開始（未ダウンロードの場合）
  useEffect(() => {
    if (presets.length > 0 && !isDownloaded && !isDownloading) {
      console.log('🚀 [LaughPresetSelector] Starting auto-download...');
      downloadAllPresets()
        .then(() => {
          setIsDownloaded(true);
          console.log('🎉 [LaughPresetSelector] Auto-download complete');
        })
        .catch((error) => {
          console.error('❌ [LaughPresetSelector] Auto-download failed:', error);
        });
    }
  }, [presets, isDownloaded, isDownloading, downloadAllPresets]);

  // パターン選択ハンドラ
  const handleSelectPattern = useCallback(
    (pattern: string) => {
      setSelectedPattern(pattern);
      localStorage.setItem('laughPattern', pattern);
      console.log(`✅ [LaughPresetSelector] Pattern selected: ${pattern}`);

      onSelect?.(pattern);
    },
    [onSelect]
  );

  // プレビュー再生ハンドラ（medium levelのみ）
  const handlePreview = useCallback(
    async (pattern: string) => {
      if (isPreviewing) {
        console.log('⚠️ [LaughPresetSelector] Already previewing');
        return;
      }

      try {
        setIsPreviewing(pattern);
        const presetId = `${pattern}_medium`;
        console.log(`🎵 [LaughPresetSelector] Previewing: ${presetId}`);

        await playPreset(presetId);

        // 再生完了後、プレビュー状態をリセット（1秒後）
        setTimeout(() => {
          setIsPreviewing(null);
        }, 1000);
      } catch (error) {
        console.error(`❌ [LaughPresetSelector] Preview failed:`, error);
        setIsPreviewing(null);
      }
    },
    [isPreviewing, playPreset]
  );

  // ローディング中
  if (presetsLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center gap-3">
          <LoadingSpinner size="md" />
          <p className="text-gray-600">プリセット一覧を読み込み中...</p>
        </div>
      </div>
    );
  }

  // ダウンロード中
  if (isDownloading) {
    const progress = presets.length > 0 ? (downloadProgress / presets.length) * 100 : 0;

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            笑い声プリセットをダウンロード中...
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {downloadProgress} / {presets.length} 個完了
          </p>

          {/* プログレスバー */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 選択UI
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        笑い声を選択してください 🎵
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        あなたの笑いを表現する声を選びましょう。プレビューボタンで試聴できます。
      </p>

      {/* パターングリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Object.entries(PATTERN_ICONS).map(([pattern, icon]) => {
          const isSelected = selectedPattern === pattern;
          const isPreviewingThis = isPreviewing === pattern;

          return (
            <div
              key={pattern}
              className={`
                relative border-2 rounded-lg p-4 cursor-pointer transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }
              `}
              onClick={() => handleSelectPattern(pattern)}
            >
              {/* アイコン */}
              <div className="text-center mb-2">
                <span className="text-5xl">{icon}</span>
              </div>

              {/* ラベル */}
              <p className="text-center font-medium text-gray-900 mb-3">
                {PATTERN_LABELS[pattern]}
              </p>

              {/* プレビューボタン */}
              <Button
                variant={isPreviewingThis ? 'primary' : 'secondary'}
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(pattern);
                }}
                disabled={!isDownloaded || !!isPreviewing}
              >
                {isPreviewingThis ? '再生中...' : '試聴'}
              </Button>

              {/* 選択済みバッジ */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  選択中
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ダウンロード完了メッセージ */}
      {isDownloaded && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800 text-center">
            ✅ すべてのプリセットがダウンロード済みです
          </p>
        </div>
      )}
    </div>
  );
};
