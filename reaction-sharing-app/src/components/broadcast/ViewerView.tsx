import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useViewer } from '../../hooks/useViewer';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { Button } from '../common/Button';

export const ViewerView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Viewer';
  const broadcasterUserId = 'Broadcaster'; // TODO: Get from URL or props

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [reactionsSent, setReactionsSent] = useState(0);
  const [videoReady, setVideoReady] = useState(false);

  const {
    hasTimestamp,
    currentTimestampInfo,
    sendReaction,
    connectionState,
  } = useViewer({
    roomId: roomId || 'default',
    userId: userName,
    broadcasterUserId,
  });

  const {
    isInitialized: isMediaPipeReady,
    landmarks,
    processVideoFrame,
  } = useMediaPipe({
    sendInterval: 100, // 10fps for reactions
    enableSending: false, // We handle sending manually
  });

  // Debug: Log landmark changes
  useEffect(() => {
    if (landmarks && landmarks.length > 0) {
      console.log('[ViewerView] Landmarks detected:', landmarks.length);
    }
  }, [landmarks]);

  // Initialize camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const initCamera = async () => {
      try {
        console.log('[ViewerView] Requesting camera access...');
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
          console.log('[ViewerView] Camera stream attached to video element');

          // Wait for video to be ready
          localVideoRef.current.onloadedmetadata = () => {
            console.log('[ViewerView] Video metadata loaded, playing...');
            localVideoRef.current?.play();
            setVideoReady(true);
          };
        }
      } catch (error) {
        console.error('[ViewerView] Failed to access camera:', error);
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Process MediaPipe frames continuously
  useEffect(() => {
    if (!isMediaPipeReady) {
      console.log('[ViewerView] Waiting for MediaPipe initialization...');
      return;
    }

    console.log('[ViewerView] Starting MediaPipe processing loop');
    let frameCount = 0;
    const intervalId = setInterval(() => {
      if (localVideoRef.current) {
        const video = localVideoRef.current;
        if (frameCount % 50 === 0) { // Log every 5 seconds
          console.log('[ViewerView] Video state:', {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            paused: video.paused,
            currentTime: video.currentTime,
          });
        }

        if (video.readyState >= 2) {
          processVideoFrame(video);
          frameCount++;
        } else {
          console.log('[ViewerView] Video not ready yet, readyState:', video.readyState);
        }
      } else {
        console.log('[ViewerView] Video element not found');
      }
    }, 100); // Process at 10Hz

    return () => {
      console.log('[ViewerView] Stopping MediaPipe processing loop');
      clearInterval(intervalId);
    };
  }, [isMediaPipeReady, processVideoFrame]);

  // Send reactions periodically when we have both landmarks and timestamp
  useEffect(() => {
    if (!hasTimestamp || !landmarks || landmarks.length === 0) {
      console.log('[ViewerView] Cannot send reactions - hasTimestamp:', hasTimestamp, 'landmarks:', landmarks?.length || 0);
      return;
    }

    console.log('[ViewerView] Starting reaction sending loop');
    const intervalId = setInterval(() => {
      if (landmarks && landmarks.length > 0 && hasTimestamp) {
        // Simple intensity calculation (placeholder)
        const intensity = Math.floor(Math.random() * 100);
        const confidence = 0.9;

        const success = sendReaction(intensity, confidence);
        if (success) {
          setReactionsSent((prev) => prev + 1);
          console.log('[ViewerView] Reaction sent successfully, total:', reactionsSent + 1);
        } else {
          console.warn('[ViewerView] Failed to send reaction');
        }
      }
    }, 100); // Send reactions at 10Hz

    return () => {
      console.log('[ViewerView] Stopping reaction sending loop');
      clearInterval(intervalId);
    };
  }, [hasTimestamp, landmarks, sendReaction]);

  const handleLeave = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">視聴モード</h1>
            <div className="flex items-center gap-4 text-sm mt-1">
              <span className="text-gray-400">ルーム: {roomId}</span>
              <span className={`flex items-center gap-2 ${connectionState === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                {connectionState === 'connected' ? '接続中' : '接続待機中'}
              </span>
              <span className={`flex items-center gap-2 ${hasTimestamp ? 'text-green-400' : 'text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full ${hasTimestamp ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                {hasTimestamp ? '配信受信中' : 'タイムスタンプ待機中'}
              </span>
            </div>
          </div>
          <Button variant="danger" onClick={handleLeave}>
            退出
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Preview */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">カメラプレビュー</h3>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded bg-black"
            />
          </div>

          {/* Status */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">ステータス</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">MediaPipe</span>
                <span className={isMediaPipeReady ? 'text-green-400' : 'text-yellow-400'}>
                  {isMediaPipeReady ? '✓ 初期化済み' : '⏳ 初期化中'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">ランドマーク検出</span>
                <span className={landmarks && landmarks.length > 0 ? 'text-green-400' : 'text-red-400'}>
                  {landmarks && landmarks.length > 0 ? `✓ ${landmarks.length}点` : '✗ 未検出'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">ビデオ状態</span>
                <span className={videoReady ? 'text-green-400' : 'text-yellow-400'}>
                  {videoReady ? '✓ 再生中' : '⏳ 読み込み中'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">配信タイムスタンプ</span>
                <span className={hasTimestamp ? 'text-green-400' : 'text-gray-400'}>
                  {hasTimestamp ? '✓ 受信中' : '✗ 未受信'}
                </span>
              </div>

              {currentTimestampInfo && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>フレームID: {currentTimestampInfo.frameId.slice(0, 8)}...</div>
                    <div>タイムスタンプ: {currentTimestampInfo.broadcastTimestamp}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">リアクション統計</h3>
          <div className="text-sm text-gray-400">
            送信済みリアクション: {reactionsSent}
          </div>
        </div>
      </div>
    </div>
  );
};
