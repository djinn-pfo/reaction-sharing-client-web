import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { WebSocketClient, MessageHandler } from '../services/signaling';
import { config } from '../config/environment';
import type {
  ConnectionState,
  SignalingMessage,
  WebRTCSignalingMessage,
  PeerJoinedMessage,
  PeerLeftMessage,
  BroadcastTimestampMessage,
  EmotionWithTimestampMessage,
  RoomJoinedMessage,
} from '../types/signaling';

interface UseSignalingOptions {
  autoConnect?: boolean;
  onBroadcastTimestamp?: (message: BroadcastTimestampMessage) => void;
  onEmotionWithTimestamp?: (message: EmotionWithTimestampMessage) => void;
  onRoomJoined?: (message: RoomJoinedMessage) => void;
  onIonMessage?: (message: any) => void;
  enableWebRTC?: boolean; // Default: false (disabled for broadcast/viewer modes)
}

interface UseSignalingReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  error: string | null;
  receivedEmotions: Map<string, any[]>;
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomId: string, username: string) => Promise<void>;
  leaveRoom: (roomId: string) => void;
  sendSignalingMessage: (message: SignalingMessage | any) => boolean;
  sendEmotionData: (landmarks: any[], userId: string, confidence?: number, normalizedLandmarks?: any[]) => boolean;
  sendBroadcastTimestamp: (message: BroadcastTimestampMessage) => boolean;
  sendEmotionWithTimestamp: (message: EmotionWithTimestampMessage) => boolean;
  getWebSocketState: () => ConnectionState | null;
  initiateWebRTCConnection: (peerId: string, peerUsername: string) => Promise<void>;
}

export const useSignaling = (options: UseSignalingOptions = {}): UseSignalingReturn => {
  const { autoConnect = false, onBroadcastTimestamp, onEmotionWithTimestamp, onRoomJoined, onIonMessage, enableWebRTC = false } = options;
  const { state: webrtcState, actions: webrtcActions } = useWebRTC();

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [receivedEmotions, setReceivedEmotions] = useState<Map<string, any[]>>(new Map());

  // connectionStateの変更を監視
  useEffect(() => {
    console.log('📊 React connectionState updated to:', connectionState);
  }, [connectionState]);

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const messageHandlerRef = useRef<MessageHandler | null>(null);

  // 感情データブロードキャスト処理
  const handleEmotionBroadcast = useCallback((message: any) => {
    try {
      // バックエンドからのemotion.broadcast形式
      // { type: "emotion.broadcast", from: "user_A", data: { userId, intensity, confidence, timestamp } }
      const emotionData = message.data;
      const userId = emotionData.userId || message.from;
      const timestamp = emotionData.timestamp || Date.now();
      const intensity = emotionData.intensity || 0;
      const confidence = emotionData.confidence || 0;
      const velocity = emotionData.velocity || 0;
      const features = emotionData.features || {};

      const newEmotion = {
        userId,
        timestamp,
        intensity: Math.abs(intensity), // 負の値の場合は絶対値を取る
        laughLevel: Math.abs(intensity) > 70 ? 'high' : Math.abs(intensity) > 40 ? 'medium' : 'low',
        confidence,
        velocity,
        features
      };

      // 受信した感情データを状態に保存
      setReceivedEmotions(prev => {
        const newMap = new Map(prev);
        const userEmotions = newMap.get(userId) || [];

        const updatedEmotions = [...userEmotions, newEmotion].slice(-50);
        newMap.set(userId, updatedEmotions);

        return newMap;
      });

    } catch (error) {
      console.error('Failed to handle emotion broadcast:', error);
    }
  }, []);

  // 感情処理確認メッセージ処理
  const handleEmotionProcessed = useCallback((message: any) => {
    console.log('✅ Emotion processing confirmed:', message.data.message);
  }, []);

  // ピア参加処理
  const handlePeerJoined = useCallback(async (message: PeerJoinedMessage) => {
    // enableWebRTCがfalseの場合はWebRTC接続をスキップ
    if (!enableWebRTC) {
      console.log('⏭️ Skipping WebRTC connection - enableWebRTC is false');
      return;
    }

    try {
      console.log('👥 [WebRTC] Peer joined:', message.peerId, message.username);
      console.log('👥 [WebRTC] Local stream available:', !!webrtcState.localStream);

      // ピア接続を作成
      const connection = await webrtcActions.createPeerConnection(message.peerId, message.username);
      console.log('✅ [WebRTC] Peer connection created');

      // ICE candidate送信ハンドラーを設定
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 [WebRTC] Sending ICE candidate to peer ${message.peerId}`);
          const candidateMessage = MessageHandler.createIceCandidateMessage(
            currentUsername || 'anonymous',
            message.peerId,
            event.candidate.toJSON()
          );
          sendSignalingMessage(candidateMessage);
        }
      };

      // データチャネルを作成（感情データ共有用）
      const dataChannel = connection.createDataChannel('emotions', {
        ordered: false, // リアルタイム性を重視
      });
      console.log('✅ [WebRTC] Data channel created:', dataChannel.label);

      // ピアを追加
      webrtcActions.addPeer(message.peerId, message.username, connection);
      console.log('✅ [WebRTC] Peer added to state');

      // Offerを作成して送信
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      console.log('✅ [WebRTC] Offer created and local description set');

      const offerMessage = MessageHandler.createOfferMessage(
        currentUsername || 'anonymous',
        message.peerId,
        offer
      );

      const sendSuccess = sendSignalingMessage(offerMessage);
      console.log('📤 [WebRTC] Offer message sent:', sendSuccess);

    } catch (error) {
      console.error('❌ [WebRTC] Failed to handle peer joined:', error);
      setError('ピア接続の作成に失敗しました');
    }
  }, [webrtcActions, currentUsername, enableWebRTC, webrtcState.localStream]);

  // ピア退出処理
  const handlePeerLeft = useCallback((message: PeerLeftMessage) => {
    console.log('Peer left:', message.peerId);
    webrtcActions.removePeer(message.peerId);
  }, [webrtcActions]);

  // WebRTCシグナリング処理
  const handleWebRTCSignaling = useCallback(async (message: WebRTCSignalingMessage) => {
    try {
      console.log('🔗 Received WebRTC signaling:', message.type, 'from:', message.from);

      // バックエンドからのOfferの場合は新しいピア接続を作成
      if (((message as any).type === 'webrtc-offer' || message.type === 'offer') && message.from === 'backend') {
        console.log('🔗 Creating new peer connection for backend');

        // バックエンドとのピア接続を作成
        const connection = await webrtcActions.createPeerConnection('backend', 'Backend Server');

        // Data Channelの受信準備
        connection.ondatachannel = (event) => {
          const dataChannel = event.channel;
          console.log('📥 Data channel received from backend:', dataChannel.label);

          // WebRTCContextのsetupDataChannelを使用
          webrtcActions.setupDataChannel?.(dataChannel, 'backend');
        };

        // ピアを追加
        webrtcActions.addPeer('backend', 'Backend Server', connection);

        // Offerを設定
        const offerData = (message.data as any)?.offer || message.data;
        await connection.setRemoteDescription(offerData as RTCSessionDescriptionInit);

        // Answerを作成して送信
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        const answerMessage = {
          type: 'webrtc-answer',
          from: currentUsername || 'anonymous',
          to: 'backend',
          room: currentRoomId ?? undefined,
          data: {
            answer: answer,
            peerId: 'backend'
          },
          timestamp: Date.now()
        } as any;

        sendSignalingMessage(answerMessage);
        console.log('✅ Sent answer to backend');
        return;
      }

      // 既存のピア接続がある場合の処理
      const peer = webrtcState.peers.get(message.from);
      if (!peer) {
        console.warn('Received signaling for unknown peer:', message.from);
        return;
      }

      const { connection } = peer;

      switch (message.type) {
        case 'offer':
        case 'webrtc-offer' as any:
          // Offerを受信
          console.log('📥 [WebRTC] Received offer from:', message.from);

          // ICE candidate送信ハンドラーを設定（answerer側）
          connection.onicecandidate = (event) => {
            if (event.candidate) {
              console.log(`🧊 [WebRTC] Sending ICE candidate to peer ${message.from}`);
              const candidateMessage = MessageHandler.createIceCandidateMessage(
                currentUsername || 'anonymous',
                message.from,
                event.candidate.toJSON()
              );
              sendSignalingMessage(candidateMessage);
            }
          };

          const offerData = (message.data as any)?.offer || message.data;
          await connection.setRemoteDescription(offerData as RTCSessionDescriptionInit);
          console.log('✅ [WebRTC] Remote description set (offer)');

          // Answerを作成して送信
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          console.log('✅ [WebRTC] Answer created and local description set');

          const answerMessage = MessageHandler.createAnswerMessage(
            currentUsername || 'anonymous',
            message.from,
            answer
          );

          const answerSent = sendSignalingMessage(answerMessage);
          console.log('📤 [WebRTC] Answer sent:', answerSent);
          break;

        case 'answer':
        case 'webrtc-answer' as any:
          // Answerを受信
          console.log('📥 [WebRTC] Received answer from:', message.from);
          const answerData = (message.data as any)?.answer || message.data;
          await connection.setRemoteDescription(answerData as RTCSessionDescriptionInit);
          console.log('✅ [WebRTC] Remote description set (answer)');
          break;

        case 'ice-candidate':
          // ICE候補を受信
          console.log('📥 [WebRTC] Received ICE candidate from:', message.from);
          const candidateData = (message.data as any)?.candidate || message.data;
          const candidate = new RTCIceCandidate(candidateData as RTCIceCandidateInit);
          await connection.addIceCandidate(candidate);
          console.log('✅ [WebRTC] ICE candidate added');
          break;
      }
    } catch (error) {
      console.error('Failed to handle WebRTC signaling:', error);
      setError('WebRTCシグナリングの処理に失敗しました');
    }
  }, [webrtcState.peers, currentUsername, currentRoomId, webrtcActions]);

  // 接続
  const connect = useCallback(async () => {
    try {
      console.log('📡 connect() called - attempting WebSocket connection...');
      console.log('🔍 wsClientRef.current:', wsClientRef.current);
      console.log('🔍 Current connectionState:', connectionState);

      if (!wsClientRef.current) {
        throw new Error('WebSocket client not initialized');
      }

      // 現在のWebSocket状態を確認
      const currentState = wsClientRef.current.getConnectionState();
      console.log('🔍 WebSocket client state before connect:', currentState);

      setError(null);
      console.log('🚀 Calling wsClientRef.current.connect()...');
      await wsClientRef.current.connect();

      // 接続後の状態を確認
      const newState = wsClientRef.current.getConnectionState();
      console.log('✅ wsClientRef.current.connect() completed successfully');
      console.log('🔍 WebSocket client state after connect:', newState);
    } catch (error) {
      console.error('❌ Failed to connect to signaling server:', error);
      setError('シグナリングサーバーへの接続に失敗しました');
      throw error;
    }
  }, [connectionState]);

  // 切断
  const disconnect = useCallback(() => {
    console.log('🔌 disconnect() called');
    if (wsClientRef.current) {
      console.log('🔍 WebSocket state before disconnect:', wsClientRef.current.getConnectionState());
      wsClientRef.current.disconnect();
    }
    webrtcActions.cleanup();
    setCurrentRoomId(null);
    setCurrentUsername(null);
  }, [webrtcActions]);

  // ルーム参加
  const joinRoom = useCallback(async (roomId: string, username: string) => {
    try {
      console.log('🏠 joinRoom開始:', { roomId, username, connectionState, wsClient: !!wsClientRef.current });

      if (!wsClientRef.current) {
        throw new Error('WebSocket client not initialized');
      }

      // 🔧 緊急修正: connectionStateの代わりにWebSocketの状態を直接チェック
      const wsState = wsClientRef.current.getConnectionState();
      console.log('🔍 WebSocket状態:', wsState);

      if (wsState !== 'connected') {
        throw new Error(`WebSocket not connected, state: ${wsState}`);
      }

      // WebRTCを初期化
      await webrtcActions.initializeWebRTC();

      // ルーム参加メッセージを送信
      console.log('📤 ルーム参加メッセージを作成中...');
      const joinMessage = MessageHandler.createJoinRoomMessage(roomId, username);
      console.log('📤 送信メッセージ:', joinMessage);

      const success = sendSignalingMessage(joinMessage);
      console.log('📤 メッセージ送信結果:', success);

      if (!success) {
        throw new Error('Failed to send join room message');
      }

      setCurrentRoomId(roomId);
      setCurrentUsername(username);
      setError(null);

      // バックエンドとのWebRTC接続を開始（通常モードのみ）
      if (enableWebRTC) {
        console.log('🔗 バックエンドとのWebRTC接続を開始...');
        const startPeerMessage = {
          type: 'start-peer-connection',
          data: {
            remoteUserId: 'backend' // バックエンドとの接続
          },
          timestamp: Date.now()
        };

        const peerSuccess = sendSignalingMessage(startPeerMessage);
        console.log('🔗 WebRTC接続開始メッセージ送信結果:', peerSuccess);
      } else {
        console.log('🔗 WebRTC disabled (broadcast/viewer mode)');
      }

    } catch (error) {
      console.error('❌ Failed to join room:', error);
      setError(`ルーム参加に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [connectionState, webrtcActions]);

  // ルーム退出
  const leaveRoom = useCallback((roomId: string) => {
    if (wsClientRef.current && currentRoomId === roomId) {
      const leaveMessage = MessageHandler.createLeaveRoomMessage(roomId);
      sendSignalingMessage(leaveMessage);

      webrtcActions.cleanup();
      setCurrentRoomId(null);
      setCurrentUsername(null);
    }
  }, [currentRoomId, webrtcActions]);

  // シグナリングメッセージ送信
  const sendSignalingMessage = useCallback((message: SignalingMessage): boolean => {
    if (!wsClientRef.current) {
      console.warn('WebSocket client not initialized');
      return false;
    }

    return wsClientRef.current.send(message);
  }, []);


  // 感情データ送信（WebSocket API準拠）
  const sendEmotionData = useCallback((landmarks: any[], userId: string, confidence: number = 0.9, normalizedLandmarks?: any[]): boolean => {
    if (!wsClientRef.current || !currentRoomId) {
      console.warn('Cannot send emotion data: WebSocket not connected or not in room');
      return false;
    }

    // 正規化されたランドマークがあればそれを優先、なければ元のランドマークを使用
    const landmarksToSend = normalizedLandmarks && normalizedLandmarks.length > 0 ? normalizedLandmarks : landmarks;

    if (!landmarksToSend || landmarksToSend.length === 0) {
      console.warn('No landmarks to send');
      return false;
    }

    // 正規化されたランドマークデータを送信
    const emotionMessage = {
      type: 'emotion',
      room: currentRoomId ?? undefined,
      data: {
        landmarks: flattenLandmarks(landmarksToSend),
        confidence: confidence,
        type: 'normalized-mediapipe', // 正規化済みを示すフラグ
        isNormalized: !!normalizedLandmarks // 正規化されているかどうかの明示的なフラグ
      },
      timestamp: Date.now()
    };

    console.log('📤 Sending emotion data via WebSocket:', {
      userId,
      originalLandmarkCount: landmarks.length,
      normalizedLandmarkCount: normalizedLandmarks?.length || 0,
      isNormalized: !!normalizedLandmarks,
      confidence,
      room: currentRoomId
    });

    console.log('📦 Full emotion message:', emotionMessage);

    return sendSignalingMessage(emotionMessage);
  }, [currentRoomId]);

  // ランドマークを平坦化（APIの形式に合わせて）
  const flattenLandmarks = useCallback((landmarks: any[]): number[] => {
    const flattened: number[] = [];
    landmarks.forEach(landmark => {
      flattened.push(landmark.x || 0, landmark.y || 0, landmark.z || 0);
    });
    return flattened;
  }, []);

  // WebSocket の状態を取得
  const getWebSocketState = useCallback((): ConnectionState | null => {
    return wsClientRef.current?.getConnectionState() || null;
  }, []);

  // 配信タイムスタンプを送信
  const sendBroadcastTimestamp = useCallback((message: BroadcastTimestampMessage): boolean => {
    const wsState = wsClientRef.current?.getConnectionState();
    if (!wsClientRef.current || wsState !== 'connected') {
      console.warn('Cannot send broadcast timestamp: WebSocket not connected', { wsState, connectionState });
      return false;
    }

    const success = wsClientRef.current.send(message);
    if (success) {
      console.log('📡 Sent broadcast timestamp:', message.data.frameId.slice(0, 8));
    }
    return success;
  }, [connectionState]);

  // タイムスタンプ付き感情データを送信
  const sendEmotionWithTimestamp = useCallback((message: EmotionWithTimestampMessage): boolean => {
    const wsState = wsClientRef.current?.getConnectionState();
    if (!wsClientRef.current || wsState !== 'connected') {
      console.warn('Cannot send emotion with timestamp: WebSocket not connected', { wsState, connectionState });
      return false;
    }

    const success = wsClientRef.current.send(message);
    if (success) {
      console.log('🎭 Sent emotion with timestamp:', message.data.frameId.slice(0, 8));
    }
    return success;
  }, [connectionState]);

  // 手動でWebRTC接続を開始（peer-joinedメッセージがない場合の代替）
  const initiateWebRTCConnection = useCallback(async (peerId: string, peerUsername: string) => {
    if (!enableWebRTC) {
      console.log('⏭️ Skipping manual WebRTC connection - enableWebRTC is false');
      return;
    }

    console.log('🔗 [Manual] Initiating WebRTC connection to peer:', peerId, peerUsername);

    // handlePeerJoinedと同じロジックを実行
    const fakePeerJoinedMessage: PeerJoinedMessage = {
      type: 'peer-joined',
      peerId,
      username: peerUsername,
      timestamp: Date.now(),
    };

    await handlePeerJoined(fakePeerJoinedMessage);
  }, [enableWebRTC, handlePeerJoined]);

  // WebSocketクライアントとメッセージハンドラーの初期化
  useEffect(() => {
    // React Strict Modeでの重複実行を防ぐ
    if (wsClientRef.current) {
      console.log('WebSocket client already exists, skipping initialization');
      return;
    }

    // ユーザーIDを取得（localStorageから）
    const userId = localStorage.getItem('userName') || 'Anonymous';

    // WebSocketクライアント作成
    console.log('Creating WebSocket with userId:', userId);
    wsClientRef.current = new WebSocketClient({
      url: config.signalingUrl,
      userId: userId,
      reconnectInterval: 5000,
      maxReconnectAttempts: 1,
      heartbeatInterval: 0,
    });

    // メッセージハンドラー作成
    messageHandlerRef.current = new MessageHandler();

    // WebSocketイベントハンドラー設定
    wsClientRef.current.setEventHandlers({
      onOpen: () => {
        console.log('Signaling connected');
        setError(null);
      },
      onClose: () => {
        console.log('Signaling disconnected');
      },
      onError: (error) => {
        console.error('Signaling error:', error);
        setError('シグナリングサーバーとの接続でエラーが発生しました');
      },
      onMessage: (message) => {
        messageHandlerRef.current?.handleMessage(message);
      },
      onConnectionStateChange: (state) => {
        console.log('🔄 Connection state changed to:', state);
        setConnectionState(state);
      },
    });

    // メッセージハンドラーのコールバック設定
    console.log('🔧 [DEBUG] Setting up message handler callbacks:', {
      hasOnRoomJoined: !!onRoomJoined,
      hasOnBroadcastTimestamp: !!onBroadcastTimestamp,
      hasOnEmotionWithTimestamp: !!onEmotionWithTimestamp,
      hasOnIonMessage: !!onIonMessage,
      hasHandlePeerJoined: !!handlePeerJoined
    });
    messageHandlerRef.current.setCallbacks({
      onPeerJoined: handlePeerJoined,
      onPeerLeft: handlePeerLeft,
      onWebRTCSignaling: handleWebRTCSignaling,
      onEmotionBroadcast: handleEmotionBroadcast,
      onEmotionProcessed: handleEmotionProcessed,
      onBroadcastTimestamp: onBroadcastTimestamp,
      onEmotionWithTimestamp: onEmotionWithTimestamp,
      onIonMessage: onIonMessage,
      onRoomJoined: onRoomJoined,
      onError: (errorMessage) => {
        setError(errorMessage.error.message);
      },
    });
    console.log('✅ [DEBUG] Message handler callbacks set');

    // 自動接続
    if (autoConnect) {
      connect();
    }

    return () => {
      wsClientRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // Update callbacks when they change (from props only)
  useEffect(() => {
    console.log('🔄 [DEBUG] Updating callbacks (prop change detected):', {
      hasOnRoomJoined: !!onRoomJoined,
      hasOnBroadcastTimestamp: !!onBroadcastTimestamp,
      hasOnEmotionWithTimestamp: !!onEmotionWithTimestamp,
      hasOnIonMessage: !!onIonMessage,
      hasMessageHandler: !!messageHandlerRef.current
    });

    if (messageHandlerRef.current) {
      messageHandlerRef.current.setCallbacks({
        onPeerJoined: handlePeerJoined,
        onPeerLeft: handlePeerLeft,
        onWebRTCSignaling: handleWebRTCSignaling,
        onEmotionBroadcast: handleEmotionBroadcast,
        onEmotionProcessed: handleEmotionProcessed,
        onBroadcastTimestamp: onBroadcastTimestamp,
        onEmotionWithTimestamp: onEmotionWithTimestamp,
        onIonMessage: onIonMessage,
        onRoomJoined: onRoomJoined,
        onError: (errorMessage) => {
          setError(errorMessage.error.message);
        },
      });
      console.log('✅ [DEBUG] Callbacks updated via useEffect');
    }
    // Only re-run when prop callbacks change, not internal handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBroadcastTimestamp, onEmotionWithTimestamp, onRoomJoined, onIonMessage]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    error,
    receivedEmotions,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendSignalingMessage,
    sendEmotionData,
    sendBroadcastTimestamp,
    sendEmotionWithTimestamp,
    getWebSocketState,
    initiateWebRTCConnection,
  };
};