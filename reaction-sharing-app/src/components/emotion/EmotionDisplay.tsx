import React from 'react';
import type { EmotionData } from '../../hooks/useMediaPipe';

interface EmotionDisplayProps {
  emotion: EmotionData | null;
  className?: string;
}

export const EmotionDisplay: React.FC<EmotionDisplayProps> = ({ emotion, className = '' }) => {
  if (!emotion) {
    return (
      <div className={`bg-gray-700 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-400">
          感情検出中...
        </div>
      </div>
    );
  }

  const emotions = [
    { name: '喜び', value: emotion.happiness, color: 'bg-yellow-500', emoji: '😊' },
    { name: '悲しみ', value: emotion.sadness, color: 'bg-blue-500', emoji: '😢' },
    { name: '驚き', value: emotion.surprise, color: 'bg-purple-500', emoji: '😲' },
    { name: '怒り', value: emotion.anger, color: 'bg-red-500', emoji: '😠' },
    { name: '平静', value: emotion.neutral, color: 'bg-gray-500', emoji: '😐' },
  ];

  const dominantEmotion = emotions.reduce((prev, current) =>
    prev.value > current.value ? prev : current
  );

  return (
    <div className={`bg-gray-700 rounded-lg p-4 ${className}`}>
      <div className="text-center mb-4">
        <div className="text-3xl mb-2">{dominantEmotion.emoji}</div>
        <div className="text-sm text-gray-300">
          主な感情: {dominantEmotion.name} ({Math.round(dominantEmotion.value * 100)}%)
        </div>
      </div>

      <div className="space-y-2">
        {emotions.map((emotion) => (
          <div key={emotion.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span>{emotion.emoji}</span>
              <span className="text-gray-300">{emotion.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-1 ml-4">
              <div className="flex-1 bg-gray-600 rounded-full h-2">
                <div
                  className={`${emotion.color} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${emotion.value * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">
                {Math.round(emotion.value * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        更新: {new Date(emotion.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};