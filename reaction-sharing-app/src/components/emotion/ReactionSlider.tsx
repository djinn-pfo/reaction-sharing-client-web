import React, { useState } from 'react';

interface ReactionSliderProps {
  onReactionChange: (level: number) => void;
  className?: string;
}

export const ReactionSlider: React.FC<ReactionSliderProps> = ({
  onReactionChange,
  className = ''
}) => {
  const [reactionLevel, setReactionLevel] = useState(50);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const level = parseInt(event.target.value);
    setReactionLevel(level);
    onReactionChange(level);
  };

  const getReactionEmoji = (level: number) => {
    if (level < 20) return '😐';
    if (level < 40) return '🙂';
    if (level < 60) return '😊';
    if (level < 80) return '😄';
    return '🤣';
  };

  const getReactionColor = (level: number) => {
    if (level < 20) return 'text-gray-400';
    if (level < 40) return 'text-green-400';
    if (level < 60) return 'text-yellow-400';
    if (level < 80) return 'text-orange-400';
    return 'text-red-400';
  };

  const getReactionText = (level: number) => {
    if (level < 20) return '無反応';
    if (level < 40) return '微笑み';
    if (level < 60) return '笑顔';
    if (level < 80) return '大笑い';
    return '爆笑';
  };

  return (
    <div className={`bg-gray-700 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-white">手動リアクション</h3>

      <div className="text-center mb-4">
        <div className="text-4xl mb-2">{getReactionEmoji(reactionLevel)}</div>
        <div className={`text-lg font-medium ${getReactionColor(reactionLevel)}`}>
          {getReactionText(reactionLevel)}
        </div>
        <div className="text-sm text-gray-400 mt-1">
          レベル: {reactionLevel}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">
            笑度レベル
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={reactionLevel}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right,
                #6b7280 0%,
                #10b981 20%,
                #f59e0b 40%,
                #f97316 60%,
                #ef4444 80%,
                #dc2626 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        <button
          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200"
          onClick={() => onReactionChange(reactionLevel)}
        >
          リアクション送信
        </button>
      </div>

    </div>
  );
};