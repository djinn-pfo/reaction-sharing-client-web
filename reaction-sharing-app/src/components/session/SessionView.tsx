import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useSignaling } from '../../hooks/useSignaling';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { IntensityChart } from '../charts/IntensityChart';
import { NormalizedLandmarksViewer } from '../visualization/NormalizedLandmarksViewer';
import { BroadcastTimestampSync, ReactionReceiver } from '../../services/broadcast';
import { ViewerReactionSender } from '../../services/viewer';
import { useIonSession } from '../../hooks/useIonSession';
import { AuthService } from '../../services/auth/AuthService';
import type { BroadcastTimestampMessage, EmotionWithTimestampMessage } from '../../types/signaling';
import type { ReceivedReactionWithMetrics } from '../../types/broadcast';
import type { IonMessage } from '../../types/ion';

export const SessionView: React.FC = () => {
  const { roomId } = useParams();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const viewerCameraRef = useRef<HTMLVideoElement>(null); // 視聴者用カメラ（MediaPipe処理用）
  const animationFrameRef = useRef<number | undefined>(undefined);
  const initializedRoomRef = useRef<string | null>(null);
  const cancelledRef = useRef<boolean>(false);

  // Broadcast/Viewer role state
  const [isBroadcaster, setIsBroadcaster] = useState<boolean | undefined>(undefined);
  const [hasTimestamp, setHasTimestamp] = useState(false);
  const [receivedReactions, setReceivedReactions] = useState<ReceivedReactionWithMetrics[]>([]);
  const [broadcasterUserId, setBroadcasterUserId] = useState<string>('broadcaster');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsPlayButton, setNeedsPlayButton] = useState(false);

  // Broadcast services
  const timestampSyncRef = useRef<BroadcastTimestampSync | null>(null);
  const reactionReceiverRef = useRef<ReactionReceiver | null>(null);
  const viewerReactionSenderRef = useRef<ViewerReactionSender | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // ユーザー名を取得
  const userName = localStorage.getItem('userName') || 'Anonymous';

  // Debug: Monitor isBroadcaster state changes
  useEffect(() => {
    console.log('[SessionView] 🔄 isBroadcaster state changed:', isBroadcaster);
  }, [isBroadcaster]);

  // Handle broadcast timestamp (for viewers)
  const handleBroadcastTimestamp = useCallback((message: BroadcastTimestampMessage) => {
    // console.log('[SessionView] Received broadcast timestamp:', message);

    if (viewerReactionSenderRef.current) {
      viewerReactionSenderRef.current.handleBroadcastTimestamp(message);
      // タイムスタンプを受信したら、リアクション送信を有効化
      setHasTimestamp(true);
    }
  }, []);

  // Handle emotion with timestamp (for broadcaster)
  const handleEmotionWithTimestamp = useCallback((message: EmotionWithTimestampMessage) => {
    console.log('[SessionView] Received emotion with timestamp:', message);
    if (reactionReceiverRef.current) {
      reactionReceiverRef.current.handleReactionWithMetrics(message);
    }
  }, []);

  // Handle Ion messages
  const ionSessionHandlerRef = useRef<((msg: IonMessage) => void) | null>(null);
  const handleIonMessage = useCallback((message: IonMessage) => {
    console.log('📨 [SessionView] Received Ion message:', message.type);
    // Route to Ion session manager via ref
    if (ionSessionHandlerRef.current) {
      ionSessionHandlerRef.current(message);
    }
  }, []);

  const {
    connectionState,
    isConnected,
    error: signalingError,
    receivedEmotions,
    connect,
    joinRoom,
    leaveRoom,
    sendEmotionData,
    sendBroadcastTimestamp,
    sendEmotionWithTimestamp,
    sendSignalingMessage,
    getWebSocketState,
  } = useSignaling({
    enableWebRTC: false, // WebRTC now handled by Ion-SFU
    onBroadcastTimestamp: handleBroadcastTimestamp,
    onEmotionWithTimestamp: handleEmotionWithTimestamp,
    onIonMessage: handleIonMessage,
    onRoomJoined: useCallback((message: any) => {
      console.log('[SessionView] 🎯 Room joined message received:', message);

      // バックエンドから直接role情報を取得
      const isBroadcasterRole = message.data?.isBroadcaster ?? false;
      const role = message.data?.role;
      const participantNumber = message.data?.participantNumber;
      const participantCount = message.data?.participantCount;
      const userId = message.data?.userId || message.userId;
      const receivedBroadcasterUserId = message.data?.broadcasterUserId;

      console.log('[SessionView] 📊 Role determination from backend:', {
        isBroadcaster: isBroadcasterRole,
        role,
        participantNumber,
        participantCount,
        userId,
        broadcasterUserId: receivedBroadcasterUserId,
        messageFrom: message.from
      });

      console.log(`[SessionView] 🎬 Setting isBroadcaster to: ${isBroadcasterRole}`);
      setIsBroadcaster(isBroadcasterRole);

      // Viewerの場合、配信者のユーザーIDを設定
      if (!isBroadcasterRole && receivedBroadcasterUserId) {
        console.log(`[SessionView] 📡 Setting broadcasterUserId to: ${receivedBroadcasterUserId}`);
        setBroadcasterUserId(receivedBroadcasterUserId);
      }
    }, []),
  });

  // MediaPipe感情検出（ランドマーク送信機能付き）
  const {
    isInitialized: isMediaPipeReady,
    landmarks,
    normalizedLandmarks,
    normalizationData,
    processVideoFrame,
    error: mediaPipeError
  } = useMediaPipe({
    sendInterval: 33, // 30fps = 33ms間隔
    enableSending: true // WebSocket送信有効
  });

  // ランドマーク送信コールバック（WebSocket経由）
  const lastSendTimeRef = useRef<number>(0);
  const lastReactionSendTimeRef = useRef<number>(0);
  const handleLandmarkData = useCallback((landmarks: any[]) => {
    const now = Date.now();
    const sendInterval = 33; // 33ms間隔（約30FPS）で送信
    const reactionSendInterval = 100; // 100ms間隔（10Hz）でリアクション送信

    // 送信頻度制限
    if (now - lastSendTimeRef.current < sendInterval) {
      return;
    }

    // 視聴者の場合のみ: リアクションを送信
    if (!isBroadcaster && isConnected && landmarks.length > 0) {
      // リアルタイムグラフ用の感情データ送信（既存システム）
      const success = sendEmotionData(normalizedLandmarks || landmarks, userName, 0.9);
      if (success) {
        lastSendTimeRef.current = now;
        // const landmarkCount = normalizedLandmarks?.length || landmarks.length;
        // const isNormalized = !!normalizedLandmarks;
        // console.log(`📤 Viewer sent emotion data: ${landmarkCount} landmarks (normalized: ${isNormalized})`);
      }

      // タイムスタンプ付きリアクション送信（新システム: レイテンシー計測用）
      if (viewerReactionSenderRef.current && hasTimestamp) {
        if (now - lastReactionSendTimeRef.current >= reactionSendInterval) {
          // 自分の最新の感情データから強度を取得
          let intensity = 50; // デフォルト値
          let confidence = 0.9;

          // receivedEmotions から自分（userName）の最新データを取得
          const myEmotions = receivedEmotions.get(userName);
          if (myEmotions && myEmotions.length > 0) {
            const latestEmotion = myEmotions[myEmotions.length - 1];
            intensity = latestEmotion.intensity;
            confidence = latestEmotion.confidence;
            // console.log(`[SessionView] Viewer: Using actual emotion data - intensity=${intensity}, confidence=${confidence}`);
          } else {
            // console.warn('[SessionView] Viewer: No emotion data available, using default intensity=50');
          }

          const reactionSuccess = viewerReactionSenderRef.current.sendReactionWithTimestamp(intensity, confidence);
          if (reactionSuccess) {
            lastReactionSendTimeRef.current = now;
            // console.log('[SessionView] Viewer: Sent reaction with timestamp, intensity=', intensity);
          }
        }
      }
    } else if (isBroadcaster) {
      // 配信者は感情データを送信しない（タイムスタンプのみ送信）
      // console.log('📡 Broadcaster: Skip sending emotion data (timestamp only)');
    }
  }, [isConnected, sendEmotionData, normalizedLandmarks, normalizationData, isBroadcaster, hasTimestamp, userName]);

  // 感情データの状態管理は削除（インジケーター非表示のため）

  // 感情検出のアニメーションループ（制限付き）
  useEffect(() => {
    let lastProcessTime = 0;
    const targetFPS = 30; // 30FPSに制限
    const frameInterval = 1000 / targetFPS;

    const processEmotion = () => {
      const now = performance.now();

      if (now - lastProcessTime >= frameInterval) {
        // 役割に応じて適切なビデオ要素を選択
        const videoElement = isBroadcaster ? localVideoRef.current : viewerCameraRef.current;

        if (videoElement && isMediaPipeReady && videoElement.readyState >= 2) {
          try {
            processVideoFrame(videoElement);

            // ランドマークが検出された場合、WebSocketで送信
            if (landmarks && landmarks.length > 0) {
              handleLandmarkData(landmarks);
            }
          } catch (error) {
            console.error('MediaPipe processing error:', error);
          }
        }
        lastProcessTime = now;
      }

      animationFrameRef.current = requestAnimationFrame(processEmotion);
    };

    if (isMediaPipeReady && localStream) {
      processEmotion();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMediaPipeReady, localStream, landmarks, processVideoFrame, handleLandmarkData, isBroadcaster]);

  // ビデオストリームをセットアップ
  useEffect(() => {
    console.log('[SessionView] Video setup check:', {
      hasVideoRef: !!localVideoRef.current,
      hasLocalStream: !!localStream,
      isBroadcaster,
      streamTracks: localStream?.getTracks().length || 0
    });

    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((error) => {
        console.log('Video autoplay failed, user interaction may be required:', error);
      });
      console.log('✅ Local video stream set and playing', {
        videoWidth: localVideoRef.current.videoWidth,
        videoHeight: localVideoRef.current.videoHeight,
        readyState: localVideoRef.current.readyState
      });
    }
  }, [localStream, isBroadcaster]);

  // 視聴者用のカメラストリームをセットアップ（MediaPipe処理用）
  useEffect(() => {
    if (!isBroadcaster && viewerCameraRef.current && localStream) {
      viewerCameraRef.current.srcObject = localStream;
      viewerCameraRef.current.play().catch((error) => {
        console.log('Viewer camera autoplay failed:', error);
      });
      console.log('✅ Viewer camera stream set for MediaPipe processing');
    }
  }, [isBroadcaster, localStream]);

  // 統合された初期化処理: 認証 → WebSocket → カメラ → ルーム参加 → Ion-SFU
  useEffect(() => {
    console.log('[DEBUG][CHECK] useEffect triggered, roomId:', roomId);

    if (!roomId) {
      console.log('[DEBUG][CHECK] No roomId, skipping');
      return;
    }

    // 重複初期化を防ぐ
    if (initializedRoomRef.current === roomId && !cancelledRef.current) {
      console.log('[DEBUG][CHECK] Already initialized for this room, skipping');
      return;
    }

    console.log('[DEBUG][CHECK] Starting initialization...');
    cancelledRef.current = false;
    initializedRoomRef.current = roomId;

    const initializeAll = async () => {
      setIsJoining(true);
      setJoinError(null);

      try {
        // ========== Step 1: 認証 ==========
        console.log('[DEBUG][CHECK] Calling ensureAuthenticated...');
        await AuthService.ensureAuthenticated(userName);
        if (cancelledRef.current) return;
        setIsAuthenticated(true);

        // ========== Step 2: WebSocket接続 ==========
        if (connectionState === 'disconnected') {
          await connect();
          if (cancelledRef.current) return;
        }
        const connectionSuccess = await waitForConnection(15000);
        if (cancelledRef.current) return;
        if (!connectionSuccess) {
          throw new Error('WebSocket接続のタイムアウト');
        }

        // ========== Step 3: カメラストリーム取得 ==========
        let stream = localStream;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true, // Enable audio for broadcasters (Ion-SFU requires it)
          });
          if (cancelledRef.current) return;
          setLocalStream(stream);
        }

        // ========== Step 4: ルーム参加 ==========
        console.log('[DEBUG][STEP4] Calling joinRoom...');
        await joinRoom(roomId, userName);
        console.log('[DEBUG][STEP4] joinRoom completed');
        if (cancelledRef.current) return;

        // 役割が決定されるまで待機
        // （onRoomJoined コールバックで setIsBroadcaster が呼ばれる）
        console.log('[DEBUG][STEP4] Waiting for role determination...');

      } catch (error) {
        if (!cancelledRef.current) {
          console.error('❌ 初期化エラー:', error);
          setJoinError(error instanceof Error ? error.message : '初期化に失敗しました');
        }
      } finally {
        if (!cancelledRef.current) {
          setIsJoining(false);
        }
      }
    };

    initializeAll();

    return () => {
      cancelledRef.current = true;
      console.log('🧹 Cleanup called');
      if (roomId && isConnected) {
        leaveRoom(roomId);
      }
      // Ion session cleanup handled by useIonSession hook
      if (timestampSyncRef.current) {
        timestampSyncRef.current.stopPeriodicSync();
        timestampSyncRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId]);

  // Ion-SFU session via WebSocket
  const ionSession = useIonSession({
    roomId: roomId || '',
    userId: userName,
    sendIonMessage: sendSignalingMessage,
    onIonMessage: handleIonMessage,
    autoJoin: false, // Manual join after role determination
    noPublish: isBroadcaster === false, // Viewer does not publish
    noSubscribe: isBroadcaster === true, // Broadcaster does not subscribe
  });

  // Store handleMessage function for routing
  useEffect(() => {
    ionSessionHandlerRef.current = ionSession.handleMessage;
  }, [ionSession.handleMessage]);

  // Handle remote streams from Ion-SFU
  useEffect(() => {
    console.log('[SessionView] 🔍 Remote stream check:', {
      remoteStreamsCount: ionSession.remoteStreams.length,
      hasRemoteVideoRef: !!remoteVideoRef.current,
      isBroadcaster,
    });

    if (ionSession.remoteStreams.length > 0) {
      const remoteStream = ionSession.remoteStreams[0];
      console.log('[SessionView] 📺 Received remote stream from Ion-SFU:', {
        streamId: remoteStream.id,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
        videoTrackEnabled: remoteStream.getVideoTracks()[0]?.enabled,
        videoTrackReadyState: remoteStream.getVideoTracks()[0]?.readyState,
      });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        console.log('[SessionView] ✅ Remote stream set to video element');

        remoteVideoRef.current.play().then(() => {
          console.log('[SessionView] ✅ Remote video playing successfully');
          setNeedsPlayButton(false);
        }).catch((error) => {
          console.error('[SessionView] ❌ Remote video autoplay failed:', error);
          // 手動再生を試みる
          console.log('[SessionView] 🔄 Trying to play with muted...');
          remoteVideoRef.current!.muted = true;
          remoteVideoRef.current!.play().then(() => {
            console.log('[SessionView] ✅ Muted autoplay succeeded');
            setNeedsPlayButton(false);
          }).catch((e) => {
            console.error('[SessionView] ❌ Muted play also failed:', e);
            // ユーザーインタラクションが必要
            setNeedsPlayButton(true);
          });
        });
      } else {
        console.error('[SessionView] ❌ remoteVideoRef.current is null!');
      }
    }
  }, [ionSession.remoteStreams, isBroadcaster]);

  // Ion-SFU初期化（役割決定後に実行）
  const ionInitializedRef = useRef(false);

  useEffect(() => {
    console.log('[Ion-SFU] useEffect triggered with:', {
      roomId,
      isBroadcaster,
      isAuthenticated,
      hasLocalStream: !!localStream,
      broadcasterUserId,
      hasViewerReactionSender: !!viewerReactionSenderRef.current,
      hasTimestampSync: !!timestampSyncRef.current,
      ionInitialized: ionInitializedRef.current,
    });

    if (!roomId) return;
    if (isBroadcaster === undefined) {
      console.log('[Ion-SFU] ⏳ Waiting for role determination...');
      return;
    }
    if (!isAuthenticated) {
      console.log('[Ion-SFU] ⏳ Waiting for authentication...');
      return;
    }
    if (!localStream) {
      console.log('[Ion-SFU] ⏳ Waiting for local stream...');
      return;
    }
    if (ionInitializedRef.current) {
      console.log('[Ion-SFU] ⏭️ Already initialized, skipping...');
      return;
    }

    const initializeServices = async () => {
      ionInitializedRef.current = true;

      if (isBroadcaster) {
        // Broadcaster: Initialize timestamp sync, reaction receiver, and Ion-SFU publish
        if (!timestampSyncRef.current) {
          console.log('[SessionView] Initializing broadcaster services...');

          timestampSyncRef.current = new BroadcastTimestampSync(
            roomId,
            userName,
            sendBroadcastTimestamp
          );

          reactionReceiverRef.current = new ReactionReceiver();
          reactionReceiverRef.current.setReactionCallback((reaction) => {
            console.log('[SessionView] Received reaction:', reaction);
            setReceivedReactions((prev) => [...prev, reaction].slice(-100));
          });

          timestampSyncRef.current.startPeriodicSync(50);
          console.log('[SessionView] Broadcaster services initialized');

          // Publish video stream via Ion-SFU (WebSocket)
          if (!ionSession.isJoined) {
            try {
              console.log('[SessionView] 📡 Starting Ion-SFU publish (WebSocket)...');
              await ionSession.join(localStream);
              console.log('[SessionView] ✅ Ion-SFU publish completed');
            } catch (error) {
              console.error('[SessionView] ❌ Ion-SFU publish failed:', error);
            }
          }
        }
      } else if (isBroadcaster === false) {
        // Viewer: Initialize reaction sender and Ion-SFU subscribe
        if (!viewerReactionSenderRef.current) {
          console.log('[SessionView] Initializing viewer services with broadcaster:', broadcasterUserId);

          viewerReactionSenderRef.current = new ViewerReactionSender(
            roomId,
            userName,
            broadcasterUserId,
            sendEmotionWithTimestamp
          );
          console.log('[SessionView] Viewer services initialized');

          // Subscribe to broadcaster's video stream via Ion-SFU (WebSocket)
          if (!ionSession.isJoined) {
            try {
              console.log('[SessionView] 📡 Starting Ion-SFU subscribe (WebSocket)...');
              await ionSession.join(localStream);
              console.log('[SessionView] ✅ Ion-SFU subscribe completed');
            } catch (error) {
              console.error('[SessionView] ❌ Ion-SFU subscribe failed:', error);
            }
          }
        }
      }
    };

    initializeServices();
  }, [isBroadcaster, roomId, userName, broadcasterUserId, localStream, sendBroadcastTimestamp, sendEmotionWithTimestamp, isAuthenticated]);

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


  const handleLeaveRoom = () => {
    console.log('🚪 [SessionView] Leaving room - START');

    // Ion-SFU session cleanup
    try {
      if (ionSession) {
        console.log('🧹 Step 1: Cleaning up Ion session...');
        ionSession.leave();
        console.log('✅ Step 1: Ion session cleaned');
      } else {
        console.log('⏭️ Step 1: No Ion session to clean');
      }
    } catch (error) {
      console.error('❌ Step 1 failed:', error);
    }

    // Timestamp sync cleanup
    try {
      if (timestampSyncRef.current) {
        console.log('🧹 Step 2: Stopping timestamp sync...');
        timestampSyncRef.current.stopPeriodicSync();
        timestampSyncRef.current = null;
        console.log('✅ Step 2: Timestamp sync stopped');
      } else {
        console.log('⏭️ Step 2: No timestamp sync to stop');
      }
    } catch (error) {
      console.error('❌ Step 2 failed:', error);
    }

    // Stop local stream
    try {
      if (localStream) {
        console.log('🧹 Step 3: Stopping local stream...');
        localStream.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Stopped track:', track.kind);
        });
        console.log('✅ Step 3: Local stream stopped');
      } else {
        console.log('⏭️ Step 3: No local stream to stop');
      }
    } catch (error) {
      console.error('❌ Step 3 failed:', error);
    }

    // Leave WebSocket room
    try {
      if (roomId && isConnected) {
        console.log('🧹 Step 4: Leaving WebSocket room...');
        leaveRoom(roomId);
        console.log('✅ Step 4: Left WebSocket room');
      } else {
        console.log('⏭️ Step 4: Not connected or no roomId');
      }
    } catch (error) {
      console.error('❌ Step 4 failed:', error);
    }

    console.log('✅ [SessionView] All cleanup steps completed');
    console.log('📍 Current location:', window.location.pathname);
    console.log('🎯 Navigating to: /');

    // Force navigation immediately
    try {
      console.log('🔄 Using window.location.href for navigation...');
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Navigation failed:', error);
    }
  };

  const handleStartViewing = () => {
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.play().then(() => {
        console.log('[SessionView] ✅ Manual play succeeded');
        setNeedsPlayButton(false);
      }).catch((error) => {
        console.error('[SessionView] ❌ Manual play failed:', error);
      });
    }
  };

  // activeParticipantsは現在使用していないため削除

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
              {isBroadcaster !== undefined && (
                <span className={`${isBroadcaster ? 'text-blue-400' : 'text-purple-400'}`}>
                  {isBroadcaster ? '📡 配信者' : '👁️ 視聴者'}
                </span>
              )}
              <span className={`${getConnectionStatusColor()}`}>
                ● {getConnectionStatusText()}
              </span>
              {isBroadcaster && receivedReactions.length > 0 && (
                <span className="text-green-400">
                  💚 リアクション: {receivedReactions.length}件
                </span>
              )}
              {!isBroadcaster && hasTimestamp && (
                <span className="text-green-400">
                  ✓ 配信受信中
                </span>
              )}
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

          {/* ビデオプレビューエリア */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-center">
              {isBroadcaster === true ? 'あなたの配信映像' : isBroadcaster === false ? '配信映像' : '映像'}
            </h2>
            <div className="flex justify-center relative">
              {/* 配信者用: ローカル映像 */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full max-w-2xl rounded bg-black ${isBroadcaster !== true ? 'hidden' : ''}`}
              />

              {/* 視聴者用: リモート映像 */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full max-w-2xl rounded bg-black ${isBroadcaster !== false ? 'hidden' : ''}`}
              />

              {/* 視聴開始ボタン（autoplay失敗時のみ表示） */}
              {!isBroadcaster && needsPlayButton && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
                  <Button
                    variant="primary"
                    onClick={handleStartViewing}
                    className="text-xl px-8 py-4"
                  >
                    🎬 視聴を開始
                  </Button>
                </div>
              )}
            </div>
            {!isBroadcaster && !remoteVideoRef.current?.srcObject && !needsPlayButton && (
              <p className="text-center text-gray-400 mt-4">
                配信者の映像を待っています...
              </p>
            )}
          </div>

          {/* 視聴者のみ: 自分のランドマーク表示エリア */}
          {!isBroadcaster && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-center">あなたの表情ランドマーク</h2>

              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* 正規化後ランドマーク3D表示 */}
                <div className="flex-1 w-full max-w-md mx-auto">
                  {/* 視聴者用: MediaPipe処理用の非表示カメラ */}
                  <video
                    ref={viewerCameraRef}
                    autoPlay
                    muted
                    playsInline
                    className="hidden"
                  />

                  {/* 3Dビジュアライゼーション */}
                  <NormalizedLandmarksViewer
                    normalizedData={normalizationData}
                    width={Math.min(400, window.innerWidth - 60)}
                    height={Math.min(400, window.innerWidth - 60)}
                  />
                </div>

                {/* 自分の感情データとコントロール */}
                <div className="flex-1 space-y-4">
                  {/* 感情インジケーターとシステム情報は非表示 */}
                </div>
              </div>
            </div>
          )}

          {/* 配信者用: 受信したリアクション表示 */}
          {isBroadcaster && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">受信したリアクション</h2>

              {receivedReactions.length > 0 ? (
                (() => {
                  // userId ごとに最新のリアクションを取得
                  const latestReactionsByUser = new Map<string, ReceivedReactionWithMetrics>();
                  receivedReactions.forEach(reaction => {
                    const current = latestReactionsByUser.get(reaction.data.userId);
                    if (!current || reaction.data.reactionSentTime > current.data.reactionSentTime) {
                      latestReactionsByUser.set(reaction.data.userId, reaction);
                    }
                  });

                  // ユーザーIDでソートして表示順を固定
                  const sortedReactions = Array.from(latestReactionsByUser.entries())
                    .sort(([userIdA], [userIdB]) => userIdA.localeCompare(userIdB));

                  return (
                    <div className="space-y-4">
                      {/* 統計情報 */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
                        <span className="text-sm text-gray-400">
                          視聴者数: <span className="text-blue-400 font-semibold">{latestReactionsByUser.size}</span>名
                        </span>
                        <span className="text-sm text-gray-400">
                          総受信: <span className="text-green-400 font-semibold">{receivedReactions.length}</span>件
                        </span>
                      </div>

                      {/* 各ユーザーのリアクション */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedReactions.map(([userId, reaction]) => {
                          const intensity = reaction.data.intensity;
                          const latency = reaction.metrics.broadcastToReceivedMs;
                          const isGoodLatency = reaction.metrics.withinConstraint;

                          return (
                            <div key={userId} className="bg-gray-700 rounded-lg p-4 space-y-3">
                              {/* ユーザー名 */}
                              <div className="flex items-center justify-between">
                                <span className="text-base font-medium text-blue-400 truncate">{userId}</span>
                              </div>

                              {/* Intensity インジケータ */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-400">感情強度</span>
                                  <span className="text-2xl font-bold text-green-400">{intensity}</span>
                                </div>

                                {/* プログレスバー */}
                                <div className="w-full bg-gray-600 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-green-600 to-green-400 h-full transition-all duration-300 flex items-center justify-center text-white text-sm font-semibold"
                                    style={{ width: `${intensity}%` }}
                                  >
                                    {intensity}%
                                  </div>
                                </div>
                              </div>

                              {/* レイテンシ情報 */}
                              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-600">
                                <span>遅延</span>
                                <span className={isGoodLatency ? 'text-green-500' : 'text-red-500'}>
                                  {latency.toFixed(0)}ms {isGoodLatency ? '✓' : '⚠️'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💤</div>
                  <h3 className="text-lg font-medium mb-2">リアクションを待機中</h3>
                  <p className="text-gray-400 text-sm">
                    視聴者からのリアクションがここに表示されます
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 視聴者用: リアルタイム感情データ表示エリア */}
          {!isBroadcaster && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">リアルタイム感情データ</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 受信した感情データのグラフ表示 */}
                {Array.from(receivedEmotions.entries()).map(([userId, emotions]) => (
                  <IntensityChart
                    key={userId}
                    emotionData={emotions}
                    userId={userId}
                    width={Math.min(400, window.innerWidth - 80)}
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
          )}

          {/* 他の参加者の感情インジケーターは非表示 */}

          {/* システム情報は非表示 */}
        </div>
      </div>
    </div>
  );
};

