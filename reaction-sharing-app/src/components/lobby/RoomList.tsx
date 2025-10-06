import React from 'react';
import { RoomCard } from './RoomCard';

interface Room {
  id: string;
  name: string;
  participants: number;
  maxParticipants: number;
}

interface RoomListProps {
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
  disabled?: boolean;
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  onJoinRoom,
  disabled = false,
}) => {
  if (rooms.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          className="w-12 h-12 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="text-gray-500">現在参加可能なルームがありません</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          onJoin={() => onJoinRoom(room.id)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};