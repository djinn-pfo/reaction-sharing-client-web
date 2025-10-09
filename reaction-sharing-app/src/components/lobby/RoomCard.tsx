import React from 'react';
import { Button } from '../common/Button';

interface Room {
  id: string;
  name: string;
  participants: number;
  maxParticipants: number;
}

interface RoomCardProps {
  room: Room;
  onJoin: () => void;
  disabled?: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  onJoin,
  disabled = false,
}) => {
  const isFull = room.participants >= room.maxParticipants;
  const occupancyPercentage = (room.participants / room.maxParticipants) * 100;

  const getOccupancyColor = () => {
    if (occupancyPercentage >= 90) return 'bg-red-500';
    if (occupancyPercentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (isFull) return '満室';
    if (occupancyPercentage >= 70) return '混雑';
    return '空きあり';
  };

  return (
    <div className="card p-6 hover:shadow-xl transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {room.name}
          </h3>
          <p className="text-sm text-gray-600">
            ルームID: {room.id}
          </p>
        </div>

        <div className={`px-2 py-1 rounded text-xs font-medium ${
          isFull
            ? 'bg-red-100 text-red-800'
            : occupancyPercentage >= 70
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800'
        }`}>
          {getStatusText()}
        </div>
      </div>

      {/* 参加者情報 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>参加者</span>
          <span>{room.participants} / {room.maxParticipants}</span>
        </div>

        {/* プログレスバー */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getOccupancyColor()}`}
            style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* 参加ボタン */}
      <Button
        variant="primary"
        onClick={onJoin}
        disabled={disabled || isFull}
        className="w-full"
      >
        {isFull ? '満室のため参加できません' : 'ルームに参加'}
      </Button>

      {disabled && !isFull && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          参加するにはユーザー名を設定してください
        </p>
      )}
    </div>
  );
};