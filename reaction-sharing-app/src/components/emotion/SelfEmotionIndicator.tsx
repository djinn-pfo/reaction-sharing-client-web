import React from 'react';

interface SelfEmotionIndicatorProps {
  intensity: number;
  laughLevel: "low" | "medium" | "high";
  isActive: boolean;
}

export const SelfEmotionIndicator: React.FC<SelfEmotionIndicatorProps> = ({
  intensity,
  laughLevel,
  isActive
}) => {
  // デバッグ用ログ
  console.log('🎨 SelfEmotionIndicator props:', { intensity, laughLevel, isActive });
  const getIntensityColor = (value: number): string => {
    if (value > 70) return 'bg-green-500';
    if (value > 40) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getLaughLevelEmoji = (level: string): string => {
    switch (level) {
      case 'high': return '😆';
      case 'medium': return '😊';
      case 'low': return '😐';
      default: return '😐';
    }
  };

  const getLaughLevelText = (level: string): string => {
    switch (level) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '低';
    }
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-medium mb-4 text-center">あなたの感情状態</h3>

      {isActive ? (
        <div className="space-y-4">
          {/* 感情強度バー */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">感情強度</span>
              <span className="text-lg font-bold text-white">
                {Math.round(intensity)}/100
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${getIntensityColor(intensity)}`}
                style={{ width: `${Math.min((intensity / 100) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* 笑いレベル表示 */}
          <div className="text-center">
            <div className="text-4xl mb-2">
              {getLaughLevelEmoji(laughLevel)}
            </div>
            <div className="text-sm text-gray-300">
              笑いレベル: <span className="text-white font-medium">{getLaughLevelText(laughLevel)}</span>
            </div>
          </div>

          {/* 数値表示 */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-600 rounded p-2">
              <div className="text-xs text-gray-400">強度</div>
              <div className="text-lg font-bold text-white">
                {Math.round(intensity)}
              </div>
            </div>
            <div className="bg-gray-600 rounded p-2">
              <div className="text-xs text-gray-400">レベル</div>
              <div className="text-lg font-bold text-white">
                {laughLevel.toUpperCase()}
              </div>
            </div>
          </div>

          {/* ステータス */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 bg-opacity-75 text-white text-xs rounded-full">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              感情データ送信中
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-3xl mb-3">😴</div>
          <div className="text-sm text-gray-400">
            感情検出待機中...
          </div>
          <div className="text-xs text-gray-500 mt-2">
            カメラとMediaPipeの初期化を待っています
          </div>
        </div>
      )}
    </div>
  );
};