import { useParams, useNavigate } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import { useBroadcast } from '../../hooks/useBroadcast';
import { Button } from '../common/Button';
import { LatencyMonitor } from './LatencyMonitor';

export const BroadcasterView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Broadcaster';
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const {
    isActive,
    startBroadcast,
    stopBroadcast,
    receivedReactions,
    latencyStats,
    resetStats,
    connectionState,
  } = useBroadcast({
    roomId: roomId || 'default',
    userId: userName,
    syncIntervalMs: 50, // 20Hz
    autoStart: true,
  });

  // Initialize camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Failed to access camera:', error);
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleLeave = () => {
    if (isActive) {
      stopBroadcast();
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">配信モード</h1>
            <div className="flex items-center gap-4 text-sm mt-1">
              <span className="text-gray-400">ルーム: {roomId}</span>
              <span className={`flex items-center gap-2 ${connectionState === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                {connectionState === 'connected' ? '接続中' : '接続待機中'}
              </span>
              <span className={`flex items-center gap-2 ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                {isActive ? '配信中' : '停止中'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {!isActive ? (
              <Button variant="primary" onClick={startBroadcast}>
                配信開始
              </Button>
            ) : (
              <Button variant="secondary" onClick={stopBroadcast}>
                配信停止
              </Button>
            )}
            <Button variant="danger" onClick={handleLeave}>
              退出
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Preview */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">配信プレビュー</h3>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded bg-black"
            />
            <p className="text-xs text-gray-400 mt-2">
              ※ この映像は視聴者には送信されません
            </p>
          </div>

          {/* Latency Stats */}
          <LatencyMonitor stats={latencyStats} />

          {/* Recent Reactions */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">受信リアクション</h3>
              <Button variant="secondary" onClick={resetStats} className="text-xs">
                統計リセット
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {receivedReactions.length === 0 ? (
                <p className="text-gray-400 text-sm">リアクション待機中...</p>
              ) : (
                receivedReactions.slice(-10).reverse().map((reaction, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-700 rounded p-2 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="text-white font-medium">{reaction.data.userId}</span>
                      <span className="text-gray-400 ml-2">
                        強度: {reaction.data.intensity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">
                        {reaction.metrics.broadcastToReceivedMs}ms
                      </span>
                      <span className={reaction.metrics.withinConstraint ? 'text-green-400' : 'text-red-400'}>
                        {reaction.metrics.withinConstraint ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">配信情報</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <div>タイムスタンプ送信周期: 50ms (20Hz)</div>
            <div>レイテンシ制約: 500ms以内</div>
            <div>受信リアクション総数: {receivedReactions.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
