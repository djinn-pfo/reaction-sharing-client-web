import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useSignaling } from '../../hooks/useSignaling';
import { useWebRTC } from '../../contexts/WebRTCContext';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { SelfEmotionIndicator } from '../emotion/SelfEmotionIndicator';
import { ParticipantEmotionBar } from '../emotion/ParticipantEmotionBar';
import { IntensityChart } from '../charts/IntensityChart';
import { NormalizedLandmarksViewer } from '../visualization/NormalizedLandmarksViewer';

export const SessionView: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [selfEmotionData, setSelfEmotionData] = useState<{
    intensity: number;
    laughLevel: "low" | "medium" | "high";
  }>({ intensity: 0, laughLevel: 'low' });
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const initializationRef = useRef<boolean>(false);

  const {
    connectionState,
    isConnected,
    error: signalingError,
    receivedEmotions,
    connect,
    joinRoom,
    leaveRoom,
    sendEmotionData,
    getWebSocketState,
  } = useSignaling();

  const { state: webrtcState, actions: webrtcActions } = useWebRTC();

  // MediaPipe感情検出（ランドマーク送信機能付き）
  const {
    isInitialized: isMediaPipeReady,
    landmarks,
    normalizedLandmarks,
    normalizationData,
    compressionStats,
    processVideoFrame,
    error: mediaPipeError
  } = useMediaPipe({
    sendInterval: 33, // 30fps = 33ms間隔
    enableSending: true // WebSocket送信有効
  });

  // ランドマーク送信コールバック（WebSocket経由）
  const lastSendTimeRef = useRef<number>(0);
  const handleLandmarkData = useCallback((landmarks: any[]) => {
    const userName = localStorage.getItem('userName') || 'Anonymous';
    const now = Date.now();
    const sendInterval = 33; // 33ms間隔（約30FPS）で送信

    // 送信頻度制限
    if (now - lastSendTimeRef.current < sendInterval) {
      return;
    }

    // WebSocketで感情データを送信（正規化されたランドマークを優先）
    if (isConnected && landmarks.length > 0) {
      const success = sendEmotionData(normalizedLandmarks || landmarks, userName, 0.9);
      if (success) {
        lastSendTimeRef.current = now;
        const landmarkCount = normalizedLandmarks?.length || landmarks.length;
        const isNormalized = !!normalizedLandmarks;
        console.log(`📤 Sent emotion data via WebSocket: ${landmarkCount} landmarks (normalized: ${isNormalized})`);

        if (normalizationData) {
          console.log(`🔄 Head pose: yaw=${normalizationData.rotation.yaw.toFixed(1)}°, pitch=${normalizationData.rotation.pitch.toFixed(1)}°, roll=${normalizationData.rotation.roll.toFixed(1)}°`);
        }
      }
    } else {
      console.log('❌ Cannot send emotion data:', {
        isConnected,
        landmarkCount: landmarks.length,
        normalizedCount: normalizedLandmarks?.length || 0,
        userName
      });
    }
  }, [isConnected, sendEmotionData, normalizedLandmarks, normalizationData]);

  // ユーザー名を取得
  const userName = localStorage.getItem('userName') || 'Anonymous';

  // バックエンドから受信した感情データを監視（自分のものも含む）
  useEffect(() => {
    // 全ての受信した感情データをチェック
    console.log('🔍 All received emotions:', Array.from(receivedEmotions.entries()));

    // 自分のデータを探す（userNameまたは'debug'）
    const possibleUserIds = [userName, 'debug']; // バックエンドが'debug'を返す場合に対応
    let myEmotions = null;
    let myUserId = null;

    for (const userId of possibleUserIds) {
      const emotions = receivedEmotions.get(userId);
      if (emotions && emotions.length > 0) {
        myEmotions = emotions;
        myUserId = userId;
        break;
      }
    }

    if (myEmotions) {
      const latestEmotion = myEmotions[myEmotions.length - 1];
      console.log(`🎯 Received emotion from backend via WebSocket (userId: ${myUserId}):`, latestEmotion);
      setSelfEmotionData({
        intensity: latestEmotion.intensity,
        laughLevel: latestEmotion.laughLevel
      });
    }
  }, [receivedEmotions, userName]);

  // 感情検出のアニメーションループ（制限付き）
  useEffect(() => {
    let lastProcessTime = 0;
    const targetFPS = 30; // 30FPSに制限
    const frameInterval = 1000 / targetFPS;

    const processEmotion = () => {
      const now = performance.now();

      if (now - lastProcessTime >= frameInterval) {
        if (localVideoRef.current && isMediaPipeReady && localVideoRef.current.readyState >= 2) {
          try {
            processVideoFrame(localVideoRef.current);

            // デバッグ: ランドマーク数をログ出力
            console.log('🔍 Landmarks detected:', landmarks?.length || 0);

            // ランドマークが検出された場合、WebSocketで送信
            if (landmarks && landmarks.length > 0) {
              handleLandmarkData(landmarks);
            } else {
              // デバッグ: ランドマークが検出されない理由をログ
              console.log('❌ No landmarks detected:', {
                landmarks: !!landmarks,
                landmarkCount: landmarks?.length || 0,
                videoReady: localVideoRef.current?.readyState,
                mediaPipeReady: isMediaPipeReady
              });
            }
          } catch (error) {
            console.error('MediaPipe processing error:', error);
          }
        } else {
          // デバッグ: 処理が実行されない理由をログ
          console.log('❌ Process emotion skipped:', {
            hasVideo: !!localVideoRef.current,
            mediaPipeReady: isMediaPipeReady,
            videoReadyState: localVideoRef.current?.readyState
          });
        }
        lastProcessTime = now;
      }

      animationFrameRef.current = requestAnimationFrame(processEmotion);
    };

    if (isMediaPipeReady && webrtcState.localStream) {
      processEmotion();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMediaPipeReady, webrtcState.localStream, landmarks, processVideoFrame, handleLandmarkData]);

  // ビデオストリームをセットアップ
  useEffect(() => {
    if (localVideoRef.current && webrtcState.localStream) {
      localVideoRef.current.srcObject = webrtcState.localStream;

      // 自動再生を試みる
      localVideoRef.current.play().catch((error) => {
        console.log('Video autoplay failed, user interaction may be required:', error);
      });

      console.log('✅ Video stream set and playing');
    }
  }, [webrtcState.localStream]);

  // WebSocket接続完了を待機する関数
  const waitForConnection = useCallback(async (timeout = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkConnection = () => {
        // WebSocketClient の状態を直接チェック（stale closure を回避）
        const wsState = getWebSocketState();
        const reactState = { connectionState, isConnected };
        const isWsConnected = wsState === 'connected';
        const isReactConnected = connectionState === 'connected' || isConnected;

        console.log('🔄 接続待機中:', {
          wsState,
          isWsConnected,
          connectionState,
          isConnected,
          reactState,
          isReactConnected,
          timeElapsed: Date.now() - startTime
        });

        // WebSocketClient の状態を優先してチェック
        if (isWsConnected) {
          console.log('✅ 接続確認完了 (WebSocket state)');
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeout) {
          console.log('⏰ 接続待機タイムアウト');
          resolve(false);
          return;
        }

        setTimeout(checkConnection, 100);
      };
      checkConnection();
    });
  }, []); // 依存配列を空にして再作成を防ぐ

  // セッション初期化（WebSocket接続 + WebRTC）
  useEffect(() => {
    const initializeSession = async () => {
      if (!roomId) {
        console.log('roomIdが無いため初期化をスキップ');
        return;
      }

      // 重複初期化を防ぐ
      if (initializationRef.current) {
        console.log('🔄 初期化は既に実行済み - スキップ');
        return;
      }

      initializationRef.current = true;
      console.log('🚀 セッション初期化開始:', { roomId, connectionState, isConnected });
      setIsJoining(true);
      setJoinError(null);

      try {
        // 1. WebSocket接続
        console.log('🔍 Checking connection state:', connectionState);
        if (connectionState === 'disconnected') {
          console.log('🔌 WebSocket接続を開始...');
          await connect();
          console.log('✅ WebSocket接続完了');
        } else {
          console.log('⏭️ WebSocket already connected or connecting, state:', connectionState);
        }

        // 接続完了を待機
        console.log('⏳ WebSocket接続完了を待機...');
        const connectionSuccess = await waitForConnection(15000); // 15秒に延長
        if (!connectionSuccess) {
          console.log('❌ WebSocket接続タイムアウト - 現在の状態:', { connectionState, isConnected });
          throw new Error('WebSocket接続のタイムアウト');
        }

        // 2. WebRTC初期化
        if (!webrtcState.isInitialized) {
          console.log('WebRTC初期化を開始...');
          await webrtcActions.initializeWebRTC();
          console.log('WebRTC初期化完了: カメラストリーム取得');
        }

        // 3. ルーム参加
        console.log('🏠 ルーム参加を開始...', { roomId, userName });
        await joinRoom(roomId, userName);
        console.log('✅ ルーム参加完了');

        console.log('セッション初期化完了');
      } catch (error) {
        console.error('セッション初期化エラー:', error);
        setJoinError(error instanceof Error ? error.message : 'セッションの初期化に失敗しました');
      } finally {
        console.log('isJoiningをfalseに設定');
        setIsJoining(false);
      }
    };

    initializeSession();

    // クリーンアップ
    return () => {
      // React Strict Modeでの重複実行を防ぐため、フラグをリセットしない
      // initializationRef.current = false;
      console.log('🧹 SessionView cleanup called');
      if (roomId && isConnected) {
        console.log('🚪 Leaving room in cleanup');
        leaveRoom(roomId);
      }
      // Strict Modeでの重複実行を防ぐため、disconnectをコメントアウト
      // disconnect();
    };
  }, [roomId]); // roomIdのみで初期化の重複を防ぐ

  const handleLeaveRoom = () => {
    navigate('/');
  };

  // デモ用の他の参加者データ
  const demoParticipants = [
    {
      id: 'participant-1',
      username: '田中さん',
      emotion: {
        happiness: 0.7,
        sadness: 0.1,
        surprise: 0.05,
        anger: 0.05,
        neutral: 0.1
      },
      isOnline: true
    },
    {
      id: 'participant-2',
      username: '佐藤さん',
      emotion: {
        happiness: 0.2,
        sadness: 0.3,
        surprise: 0.1,
        anger: 0.1,
        neutral: 0.3
      },
      isOnline: true
    },
    {
      id: 'participant-3',
      username: '山田さん',
      emotion: {
        happiness: 0.1,
        sadness: 0.1,
        surprise: 0.6,
        anger: 0.1,
        neutral: 0.1
      },
      isOnline: false
    }
  ];

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'text-green-400';
      case 'connecting':
      case 'reconnecting': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected': return '接続済み';
      case 'connecting': return '接続中...';
      case 'reconnecting': return '再接続中...';
      case 'failed': return '接続失敗';
      case 'disconnected': return '切断済み';
      default: return '不明';
    }
  };

  if (isJoining) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" color="white" className="mb-4" />
          <h2 className="text-xl font-semibold mb-2">セッション初期化中...</h2>
          <p className="text-gray-400">
            WebSocket接続とカメラを初期化しています
          </p>
          <div className="mt-2 text-sm">
            <span className={getConnectionStatusColor()}>
              ● {getConnectionStatusText()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (joinError || mediaPipeError || signalingError) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">接続エラー</h2>
          <p className="text-gray-400 mb-2">{joinError || mediaPipeError || signalingError}</p>
          <div className="text-sm text-gray-500 mb-6">
            接続状態: <span className={getConnectionStatusColor()}>{getConnectionStatusText()}</span>
          </div>
          <Button
            variant="primary"
            onClick={handleLeaveRoom}
          >
            ロビーに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">ルーム: {roomId}</h1>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">ユーザー: {userName}</span>
              <span className={`${getConnectionStatusColor()}`}>
                ● {getConnectionStatusText()}
              </span>
              <span className="text-gray-400">
                参加者: 1人 (ローカル)
              </span>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={handleLeaveRoom}
          >
            ルームを退出
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto space-y-6">

          {/* 自分のランドマーク表示エリア */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-center">あなたの表情ランドマーク</h2>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* 正規化後ランドマーク3D表示 */}
              <div className="flex-1 max-w-md mx-auto">
                {/* 非表示のビデオ要素（MediaPipe処理用） */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="hidden"
                />

                {/* 3Dビジュアライゼーション */}
                <NormalizedLandmarksViewer
                  normalizedData={normalizationData}
                  width={600}
                  height={600}
                />
              </div>

              {/* 自分の感情データとコントロール */}
              <div className="flex-1 space-y-4">
                {/* 自分の感情インジケーター */}
                <SelfEmotionIndicator
                  intensity={selfEmotionData.intensity}
                  laughLevel={selfEmotionData.laughLevel}
                  isActive={!!(isMediaPipeReady && landmarks && landmarks.length > 0)}
                />

                {/* システム情報 */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">システム状況</h3>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>MediaPipe: {isMediaPipeReady ? '✅ 初期化済み' : '⏳ 初期化中...'}</div>
                    <div>ランドマーク: {landmarks?.length || 0}点</div>
                    <div>接続中の感情データ: {receivedEmotions.size}ユーザー</div>
                    <div className="text-xs text-gray-500 mt-2">
                      💡 ランドマークをWebSocketでバックエンドに送信し、処理結果を受信しています
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* リアルタイム感情データ表示エリア */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">リアルタイム感情データ</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 受信した感情データのグラフ表示 */}
              {Array.from(receivedEmotions.entries()).map(([userId, emotions]) => (
                <IntensityChart
                  key={userId}
                  emotionData={emotions}
                  userId={userId}
                  width={400}
                  height={200}
                />
              ))}

              {/* 感情データが無い場合の表示 */}
              {receivedEmotions.size === 0 && (
                <div className="col-span-full text-center py-8">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-medium mb-2">感情データを待機中</h3>
                  <p className="text-gray-400 text-sm">
                    バックエンドからの感情データを受信すると、リアルタイムグラフが表示されます
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 他の参加者の感情表示エリア（デモ） */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">参加者の感情状態（デモ）</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {demoParticipants.map((participant) => (
                <ParticipantEmotionBar
                  key={participant.id}
                  username={participant.username}
                  emotion={participant.emotion}
                  isOnline={participant.isOnline}
                />
              ))}
            </div>
          </div>

          {/* システム情報 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <span>WebSocket:</span>
                <span className={getConnectionStatusColor()}>
                  {getConnectionStatusText()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>MediaPipe:</span>
                <span className={isMediaPipeReady ? 'text-green-400' : 'text-yellow-400'}>
                  {isMediaPipeReady ? '初期化済み' : '初期化中...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>カメラ:</span>
                <span className={webrtcState.localStream ? 'text-green-400' : 'text-gray-400'}>
                  {webrtcState.localStream ? '取得済み' : '未取得'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>参加者:</span>
                <span className="text-blue-400">
                  {demoParticipants.filter(p => p.isOnline).length + 1}人
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>圧縮率:</span>
                <span className={compressionStats.isInitialized ? 'text-green-400' : 'text-gray-400'}>
                  {compressionStats.isInitialized ? `${Math.round(compressionStats.compressionRatio * 100)}%` : '未開始'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

