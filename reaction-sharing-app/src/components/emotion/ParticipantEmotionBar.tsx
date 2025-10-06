import React from 'react';

interface ParticipantEmotionBarProps {
  username: string;
  emotion: {
    happiness: number;
    sadness: number;
    surprise: number;
    anger: number;
    neutral: number;
  };
  isOnline?: boolean;
}

export const ParticipantEmotionBar: React.FC<ParticipantEmotionBarProps> = ({
  username,
  emotion,
  isOnline = true
}) => {
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
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
          <span className="text-white font-medium">{username}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-2xl">{dominantEmotion.emoji}</span>
          <span className="text-sm text-gray-400">
            {Math.round(dominantEmotion.value * 100)}%
          </span>
        </div>
      </div>

      {/* 感情バー */}
      <div className="space-y-2">
        {emotions.map((emotionData) => (
          <div key={emotionData.name} className="flex items-center gap-2">
            <span className="text-sm w-12">{emotionData.emoji}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div
                className={`${emotionData.color} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${emotionData.value * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">
              {Math.round(emotionData.value * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};