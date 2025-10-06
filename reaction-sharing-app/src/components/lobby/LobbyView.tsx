import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { UserNameModal } from './UserNameModal';
import { RoomList } from './RoomList';

interface Room {
  id: string;
  name: string;
  participants: number;
  maxParticipants: number;
}

export const LobbyView: React.FC = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('');
  const [showUserNameModal, setShowUserNameModal] = useState(false);
  const [rooms] = useState<Room[]>([
    {
      id: 'demo-room',
      name: '🧪 デモルーム (ローカル開発)',
      participants: 0,
      maxParticipants: 10,
    },
    {
      id: 'room-001',
      name: 'メインルーム',
      participants: 3,
      maxParticipants: 10,
    },
    {
      id: 'room-002',
      name: 'テストルーム',
      participants: 1,
      maxParticipants: 5,
    },
  ]);

  useEffect(() => {
    // ローカルストレージからユーザー名を読み込み
    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
      setUserName(savedUserName);
    } else {
      setShowUserNameModal(true);
    }
  }, []);

  const handleUserNameSet = (name: string) => {
    setUserName(name);
    localStorage.setItem('userName', name);
    setShowUserNameModal(false);
  };

  const handleJoinRoom = (roomId: string) => {
    if (!userName) {
      setShowUserNameModal(true);
      return;
    }
    navigate(`/room/${roomId}`);
  };

  const handleChangeUserName = () => {
    setShowUserNameModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            LoLup Lives Go
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            リアルタイム感情共有プラットフォーム
          </p>

          {userName && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
              <span className="text-sm text-gray-600">ようこそ、</span>
              <span className="font-medium text-gray-900">{userName}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleChangeUserName}
              >
                変更
              </Button>
            </div>
          )}
        </div>

        {/* Room List */}
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              参加可能なルーム
            </h2>
            <p className="text-gray-600 mb-2">
              参加したいルームを選択してください
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                💡 ローカル開発モード: MediaPipe感情検出とマニュアルリアクション機能をテストできます
              </p>
            </div>
          </div>

          <RoomList
            rooms={rooms}
            onJoinRoom={handleJoinRoom}
            disabled={!userName}
          />
        </div>

        {/* User Name Modal */}
        <UserNameModal
          isOpen={showUserNameModal}
          onSubmit={handleUserNameSet}
          onClose={() => !userName && setShowUserNameModal(false)}
          initialValue={userName}
        />
      </div>
    </div>
  );
};