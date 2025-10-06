import React, { useRef, useEffect } from 'react';
import type { ReceivedEmotionData } from '../../types/webrtc';

interface IntensityChartProps {
  emotionData: ReceivedEmotionData[];
  userId: string;
  width?: number;
  height?: number;
}

export const IntensityChart: React.FC<IntensityChartProps> = ({
  emotionData,
  userId,
  width = 400,
  height = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas クリア
    ctx.clearRect(0, 0, width, height);

    // 背景
    ctx.fillStyle = '#1f2937'; // gray-800
    ctx.fillRect(0, 0, width, height);

    // グリッド描画
    ctx.strokeStyle = '#374151'; // gray-700
    ctx.lineWidth = 1;

    // 水平グリッド (intensity 0 - 8000)
    for (let i = 0; i <= 4; i++) {
      const y = (height - 40) * (1 - i / 4) + 20;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      // ラベル
      ctx.fillStyle = '#9ca3af'; // gray-400
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((i * 2000).toString(), 35, y + 4); // 0, 2000, 4000, 6000, 8000
    }

    // データがない場合
    if (emotionData.length === 0) {
      ctx.fillStyle = '#6b7280'; // gray-500
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('感情データを待機中...', width / 2, height / 2);
      return;
    }

    // 最新300件のデータを取得
    const maxDataPoints = 300;
    const filteredData = emotionData.slice(-maxDataPoints);

    if (filteredData.length < 2) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('データ蓄積中...', width / 2, height / 2);
      return;
    }
    console.log('length of filtered data: ', filteredData.length)
    console.log('length of emotion data : ', emotionData)
    // 折れ線グラフを描画
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 2;
    ctx.beginPath();

    filteredData.forEach((data, index) => {
      const x = 40 + (index / (filteredData.length - 1)) * (width - 60);
      const y = 20 + (1 - (Math.min(data.intensity, 8000) / 8000)) * (height - 40); // 0-8000の範囲で正規化

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // 折れ線を描画
    ctx.strokeStyle = '#3b82f6';
    ctx.stroke();

    // データポイントを描画
    filteredData.forEach((data, index) => {
      const x = 40 + (index / (filteredData.length - 1)) * (width - 60);
      const y = 20 + (1 - (Math.min(data.intensity, 8000) / 8000)) * (height - 40);

      ctx.fillStyle = getIntensityColor(data.intensity);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // 現在の値を表示
    const latestData = filteredData[filteredData.length - 1];
    if (latestData) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${userId}: ${Math.round(latestData.intensity)}/6000`,
        50,
        30
      );

      // 笑いレベル表示
      ctx.fillStyle = getLaughLevelColor(latestData.laughLevel);
      ctx.font = '12px sans-serif';
      ctx.fillText(
        latestData.laughLevel.toUpperCase(),
        50,
        50
      );
    }

  }, [emotionData, userId, width, height]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-white mb-2">
        {userId} の感情強度 (リアルタイム)
      </h3>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-600 rounded"
      />
      {emotionData.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          データ数: {emotionData.length}件 |
          最新: {new Date(emotionData[emotionData.length - 1]?.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

// 強度に応じた色を取得
function getIntensityColor(intensity: number): string {
  if (intensity > 4200) return '#10b981'; // green-500 (高強度)
  if (intensity > 2400) return '#f59e0b'; // yellow-500 (中強度)
  return '#6b7280'; // gray-500 (低強度)
}

// 笑いレベルに応じた色を取得
function getLaughLevelColor(laughLevel: string): string {
  switch (laughLevel) {
    case 'high': return '#10b981'; // green-500
    case 'medium': return '#f59e0b'; // yellow-500
    case 'low': return '#6b7280'; // gray-500
    default: return '#6b7280';
  }
}